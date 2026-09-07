import React, {createContext, useContext, useEffect, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {FiBell} from 'react-icons/fi';

import styles from './styles.module.css';

const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
const SDK_SCRIPT_ID = 'onesignal-web-sdk';
const PROMPT_DISMISSED_KEY = 'm3300-push-prompt-dismissed-at';
const PROMPT_REPEAT_DELAY = 30 * 24 * 60 * 60 * 1000;
const NOTIFICATION_CHANNELS = [
    {
        id: 'study',
        tag: 'm3300_notify_study',
        label: 'Учебные материалы',
        description: 'Новые конспекты, ссылки и материалы по предметам.',
    },
    {
        id: 'deadlines',
        tag: 'm3300_notify_deadlines',
        label: 'Дедлайны',
        description: 'Новые и изменённые сроки сдачи работ.',
    },
    {
        id: 'other',
        tag: 'm3300_notify_other',
        label: 'Улучшения сайта',
        description: 'Новые функции, исправления и прочие изменения сайта.',
    },
];

const DEFAULT_CHANNEL_PREFERENCES = Object.fromEntries(
    NOTIFICATION_CHANNELS.map(({id}) => [id, true]),
);

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
                    notifyButton: {
                        enable: false,
                    },
                    promptOptions: {
                        slidedown: {
                            prompts: [
                                {
                                    type: 'push',
                                    autoPrompt: false,
                                },
                            ],
                        },
                    },
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

function readChannelPreferences(OneSignal) {
    const tags = OneSignal.User.getTags();
    const hasSavedPreferences = NOTIFICATION_CHANNELS.some(({tag}) => (
        Object.prototype.hasOwnProperty.call(tags, tag)
    ));

    if (!hasSavedPreferences) {
        return {
            hasSavedPreferences: false,
            preferences: {...DEFAULT_CHANNEL_PREFERENCES},
        };
    }

    return {
        hasSavedPreferences: true,
        preferences: Object.fromEntries(
            NOTIFICATION_CHANNELS.map(({id, tag}) => [id, tags[tag] === '1']),
        ),
    };
}

function channelPreferencesToTags(preferences) {
    return Object.fromEntries(
        NOTIFICATION_CHANNELS.map(({id, tag}) => [tag, preferences[id] ? '1' : '0']),
    );
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
    const [preferencesOpen, setPreferencesOpen] = useState(false);
    const [channelPreferences, setChannelPreferences] = useState(DEFAULT_CHANNEL_PREFERENCES);
    const [draftPreferences, setDraftPreferences] = useState(DEFAULT_CHANNEL_PREFERENCES);

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
            .then(async (OneSignal) => {
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
                const {hasSavedPreferences, preferences} = readChannelPreferences(OneSignal);
                setChannelPreferences(preferences);
                setDraftPreferences(preferences);

                if (isActiveSubscription(pushSubscription) && !hasSavedPreferences) {
                    try {
                        await OneSignal.User.addTags(channelPreferencesToTags(preferences));
                    } catch (reason) {
                        console.error('OneSignal notification preferences migration failed', reason);
                    }
                }
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

    const openPreferences = () => {
        setDraftPreferences(channelPreferences);
        setError('');
        setPromptOpen(false);
        setPreferencesOpen(true);
    };

    const closePreferences = () => {
        if (busy) return;
        setPreferencesOpen(false);
        setError('');
    };

    const savePreferences = async () => {
        if (!oneSignal || busy) return;

        if (permissionDenied && !subscribed) {
            return;
        }

        if (!Object.values(draftPreferences).some(Boolean)) {
            setError('Выберите хотя бы одну категорию или выключите уведомления полностью.');
            return;
        }

        setBusy(true);
        setError('');
        try {
            if (!subscribed) {
                await oneSignal.User.PushSubscription.optIn();
                await waitForActiveSubscription(oneSignal.User.PushSubscription);
            }
            await oneSignal.User.addTags(channelPreferencesToTags(draftPreferences));
            const isSubscribed = isActiveSubscription(oneSignal.User.PushSubscription);
            setSubscribed(isSubscribed);
            setChannelPreferences(draftPreferences);
            setPermissionDenied(Notification.permission === 'denied');
            if (isSubscribed) {
                setPromptOpen(false);
                setPreferencesOpen(false);
            }
        } catch (reason) {
            console.error('OneSignal subscription update failed', reason);
            setError(reason instanceof Error
                ? reason.message
                : 'Не удалось изменить настройку уведомлений.');
        } finally {
            setBusy(false);
        }
    };

    const disableNotifications = async () => {
        if (!oneSignal || busy || !subscribed) return;

        setBusy(true);
        setError('');
        try {
            await oneSignal.User.PushSubscription.optOut();
            setSubscribed(false);
            setPreferencesOpen(false);
        } catch (reason) {
            console.error('OneSignal subscription update failed', reason);
            setError('Не удалось выключить уведомления. Попробуйте ещё раз.');
        } finally {
            setBusy(false);
        }
    };

    const toggleDraftPreference = (channelId) => {
        setDraftPreferences((current) => ({
            ...current,
            [channelId]: !current[channelId],
        }));
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
        openPreferences,
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
                                : 'Получайте уведомление, когда на сайте появляются новые материалы. Отключить можно в меню сайта.'}
                        </p>
                        {error && <p className={styles.warning}>{error}</p>}
                        <div className={styles.actions}>
                            {!permissionDenied && (
                                <button
                                    type="button"
                                    className={styles.enableButton}
                                    onClick={openPreferences}
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
            {supported && preferencesOpen && (
                <div className={styles.preferencesBackdrop} role="presentation">
                    <section
                        className={styles.preferencesDialog}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="push-preferences-title"
                        aria-describedby="push-preferences-description"
                    >
                        <button
                            type="button"
                            className={styles.closeButton}
                            onClick={closePreferences}
                            disabled={busy}
                            aria-label="Закрыть настройки уведомлений"
                        >
                            ×
                        </button>
                        <FiBell className={styles.promptIcon} aria-hidden="true" />
                        <div>
                            <h2 id="push-preferences-title" className={styles.title}>
                                Настройка уведомлений
                            </h2>
                            <p id="push-preferences-description" className={styles.description}>
                                {permissionDenied && !subscribed
                                    ? 'Уведомления заблокированы. Разрешите их в настройках браузера для этого сайта.'
                                    : 'Выберите категории, уведомления из которых хотите получать.'}
                            </p>
                        </div>

                        {!(permissionDenied && !subscribed) && (
                            <div className={styles.channelList}>
                                {NOTIFICATION_CHANNELS.map((channel) => (
                                    <label key={channel.id} className={styles.channelOption}>
                                        <input
                                            type="checkbox"
                                            checked={Boolean(draftPreferences[channel.id])}
                                            onChange={() => toggleDraftPreference(channel.id)}
                                            disabled={busy}
                                        />
                                        <span>
                                            <strong>{channel.label}</strong>
                                            <small>{channel.description}</small>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {error && <p className={styles.warning}>{error}</p>}
                        <div className={styles.preferencesActions}>
                            {permissionDenied && !subscribed ? (
                                <button type="button" className={styles.laterButton} onClick={closePreferences}>
                                    Понятно
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className={styles.enableButton}
                                        onClick={savePreferences}
                                        disabled={busy}
                                    >
                                        {busy
                                            ? 'Сохраняем…'
                                            : subscribed
                                                ? 'Сохранить'
                                                : 'Включить выбранные'}
                                    </button>
                                    {subscribed && (
                                        <button
                                            type="button"
                                            className={styles.disableButton}
                                            onClick={disableNotifications}
                                            disabled={busy}
                                        >
                                            Выключить уведомления
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        className={styles.laterButton}
                                        onClick={closePreferences}
                                        disabled={busy}
                                    >
                                        Отмена
                                    </button>
                                </>
                            )}
                        </div>
                    </section>
                </div>
            )}
        </PushNotificationsContext.Provider>
    );
}
