import React, {createContext, useContext, useEffect, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {FiBell} from 'react-icons/fi';

import styles from './styles.module.css';

const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
const SDK_SCRIPT_ID = 'onesignal-web-sdk';
const PROMPT_DISMISSED_KEY = 'm3300-push-prompt-dismissed-at';
const PROMPT_REPEAT_DELAY = 30 * 24 * 60 * 60 * 1000;

const PushNotificationsContext = createContext(null);

function isActiveSubscription(subscription) {
    return Boolean(subscription.optedIn && subscription.id && subscription.token);
}

function waitForActiveSubscription(subscription, timeout = 15000) {
    if (isActiveSubscription(subscription)) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const handleChange = (event) => {
            if (isActiveSubscription(event.current) || isActiveSubscription(subscription)) {
                cleanup();
                resolve();
            }
        };
        const timer = window.setTimeout(() => {
            cleanup();
            reject(new Error(
                'Разрешение получено, но OneSignal не создал push-подписку. Обновите страницу и попробуйте ещё раз.',
            ));
        }, timeout);
        const cleanup = () => {
            window.clearTimeout(timer);
            subscription.removeEventListener('change', handleChange);
        };

        subscription.addEventListener('change', handleChange);
    });
}

function initializeOneSignal(appId) {
    if (window.__m3300OneSignalPromise) {
        return window.__m3300OneSignalPromise;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.__m3300OneSignalPromise = new Promise((resolve, reject) => {
        window.OneSignalDeferred.push(async (OneSignal) => {
            try {
                await OneSignal.init({
                    appId,
                    allowLocalhostAsSecureOrigin: true,
                });
                resolve(OneSignal);
            } catch (error) {
                reject(error);
            }
        });

        if (!document.getElementById(SDK_SCRIPT_ID)) {
            const script = document.createElement('script');
            script.id = SDK_SCRIPT_ID;
            script.src = SDK_URL;
            script.defer = true;
            script.onerror = () => reject(new Error('Не удалось загрузить OneSignal Web SDK'));
            document.head.appendChild(script);
        }
    });

    return window.__m3300OneSignalPromise;
}

function shouldOfferNotifications() {
    const dismissedAt = Number(window.localStorage.getItem(PROMPT_DISMISSED_KEY));
    return !dismissedAt || Date.now() - dismissedAt >= PROMPT_REPEAT_DELAY;
}

export function usePushNotifications() {
    return useContext(PushNotificationsContext);
}

export function PushNotificationsProvider({children}) {
    const {siteConfig} = useDocusaurusContext();
    const appId = siteConfig.customFields?.oneSignalAppId;
    const [oneSignal, setOneSignal] = useState(null);
    const [supported, setSupported] = useState(Boolean(appId));
    const [subscribed, setSubscribed] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [busy, setBusy] = useState(Boolean(appId));
    const [error, setError] = useState('');
    const [promptOpen, setPromptOpen] = useState(false);

    useEffect(() => {
        if (!appId) {
            setSupported(false);
            setBusy(false);
            return undefined;
        }

        let active = true;
        let pushSubscription;
        let promptTimer;

        const syncState = (OneSignal, offerPrompt = false) => {
            if (!active) return;

            const isSubscribed = isActiveSubscription(OneSignal.User.PushSubscription);
            const isDenied = Notification.permission === 'denied';
            setSubscribed(isSubscribed);
            setPermissionDenied(isDenied);
            setBusy(false);

            if (offerPrompt && !isSubscribed && !isDenied && shouldOfferNotifications()) {
                promptTimer = window.setTimeout(() => setPromptOpen(true), 1200);
            }
        };

        const handleSubscriptionChange = (event) => {
            if (!active) return;
            const isSubscribed = isActiveSubscription(event.current)
                || isActiveSubscription(pushSubscription);
            setSubscribed(isSubscribed);
            setPermissionDenied(Notification.permission === 'denied');
            setBusy(false);
            if (isSubscribed) setPromptOpen(false);
        };

        initializeOneSignal(appId)
            .then((OneSignal) => {
                if (!active) return;
                if (!OneSignal.Notifications.isPushSupported()) {
                    setSupported(false);
                    setBusy(false);
                    return;
                }

                pushSubscription = OneSignal.User.PushSubscription;
                pushSubscription.addEventListener('change', handleSubscriptionChange);
                // OneSignal is callable, so it must be wrapped for React state.
                setOneSignal(() => OneSignal);
                syncState(OneSignal, true);
            })
            .catch((reason) => {
                if (!active) return;
                console.error('OneSignal initialization failed', reason);
                setError('Не удалось настроить уведомления. Попробуйте обновить страницу.');
                setBusy(false);
                setPromptOpen(true);
            });

        return () => {
            active = false;
            if (promptTimer) window.clearTimeout(promptTimer);
            pushSubscription?.removeEventListener('change', handleSubscriptionChange);
        };
    }, [appId]);

    const toggleSubscription = async () => {
        if (!oneSignal || busy) return;

        if (permissionDenied && !subscribed) {
            setPromptOpen(true);
            return;
        }

        setBusy(true);
        setError('');
        try {
            if (subscribed) {
                await oneSignal.User.PushSubscription.optOut();
            } else {
                await oneSignal.User.PushSubscription.optIn();
                await waitForActiveSubscription(oneSignal.User.PushSubscription);
            }
            const isSubscribed = isActiveSubscription(oneSignal.User.PushSubscription);
            setSubscribed(isSubscribed);
            setPermissionDenied(Notification.permission === 'denied');
            if (isSubscribed) setPromptOpen(false);
        } catch (reason) {
            console.error('OneSignal subscription update failed', reason);
            setError(reason instanceof Error
                ? reason.message
                : 'Не удалось изменить настройку уведомлений.');
            setPromptOpen(true);
        } finally {
            setBusy(false);
        }
    };

    const dismissPrompt = () => {
        window.localStorage.setItem(PROMPT_DISMISSED_KEY, String(Date.now()));
        setPromptOpen(false);
    };

    const value = {
        available: Boolean(oneSignal),
        busy,
        permissionDenied,
        subscribed,
        supported,
        toggleSubscription,
    };

    return (
        <PushNotificationsContext.Provider value={value}>
            {children}
            {supported && promptOpen && !subscribed && (
                <aside
                    className={styles.prompt}
                    role="dialog"
                    aria-labelledby="push-notifications-title"
                    aria-describedby="push-notifications-description"
                >
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={dismissPrompt}
                        aria-label="Закрыть"
                    >
                        ×
                    </button>
                    <FiBell className={styles.promptIcon} aria-hidden="true" />
                    <div>
                        <h2 id="push-notifications-title" className={styles.title}>
                            Узнавайте об обновлениях
                        </h2>
                        <p id="push-notifications-description" className={styles.description}>
                            {permissionDenied
                                ? 'Уведомления заблокированы. Разрешите их в настройках браузера для этого сайта.'
                                : 'Получайте уведомление, когда на сайте появляются новые материалы.'}
                        </p>
                        {error && <p className={styles.warning}>{error}</p>}
                        <div className={styles.actions}>
                            {!permissionDenied && (
                                <button
                                    type="button"
                                    className={styles.enableButton}
                                    onClick={toggleSubscription}
                                    disabled={busy || !oneSignal}
                                >
                                    {busy ? 'Подключаем…' : 'Включить уведомления'}
                                </button>
                            )}
                            <button type="button" className={styles.laterButton} onClick={dismissPrompt}>
                                {permissionDenied ? 'Понятно' : 'Не сейчас'}
                            </button>
                        </div>
                    </div>
                </aside>
            )}
        </PushNotificationsContext.Provider>
    );
}
