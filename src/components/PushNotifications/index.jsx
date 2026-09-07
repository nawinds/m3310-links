import React, {useEffect, useState} from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

import styles from './styles.module.css';

const SDK_URL = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
const SDK_SCRIPT_ID = 'onesignal-web-sdk';

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
                    serviceWorkerPath: 'push/onesignal/OneSignalSDKWorker.js',
                    serviceWorkerParam: {scope: '/push/onesignal/'},
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

export default function PushNotifications() {
    const {siteConfig} = useDocusaurusContext();
    const appId = siteConfig.customFields?.oneSignalAppId;
    const [oneSignal, setOneSignal] = useState(null);
    const [supported, setSupported] = useState(Boolean(appId));
    const [subscribed, setSubscribed] = useState(false);
    const [permissionDenied, setPermissionDenied] = useState(false);
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!appId) {
            setSupported(false);
            setBusy(false);
            return undefined;
        }

        let active = true;
        let pushSubscription;

        const syncState = (OneSignal) => {
            if (!active) return;
            setSubscribed(Boolean(OneSignal.User.PushSubscription.optedIn));
            setPermissionDenied(Notification.permission === 'denied');
            setBusy(false);
        };

        const handleSubscriptionChange = (event) => {
            if (!active) return;
            setSubscribed(Boolean(event.current.optedIn));
            setPermissionDenied(Notification.permission === 'denied');
            setBusy(false);
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
                setOneSignal(OneSignal);
                syncState(OneSignal);
            })
            .catch((reason) => {
                if (!active) return;
                console.error('OneSignal initialization failed', reason);
                setError('Не удалось настроить уведомления. Попробуйте обновить страницу.');
                setBusy(false);
            });

        return () => {
            active = false;
            pushSubscription?.removeEventListener('change', handleSubscriptionChange);
        };
    }, [appId]);

    const toggleSubscription = async () => {
        if (!oneSignal || busy) return;

        setBusy(true);
        setError('');
        try {
            if (subscribed) {
                await oneSignal.User.PushSubscription.optOut();
            } else {
                await oneSignal.User.PushSubscription.optIn();
            }
            setSubscribed(Boolean(oneSignal.User.PushSubscription.optedIn));
            setPermissionDenied(Notification.permission === 'denied');
        } catch (reason) {
            console.error('OneSignal subscription update failed', reason);
            setError('Не удалось изменить настройку уведомлений.');
        } finally {
            setBusy(false);
        }
    };

    if (!supported) return null;

    return (
        <section className={styles.card} aria-labelledby="push-notifications-title">
            <div className={styles.text}>
                <h2 id="push-notifications-title" className={styles.title}>
                    Уведомления об обновлениях
                </h2>
                <p className={styles.description}>
                    {subscribed
                        ? 'Вы будете получать название нового коммита после публикации сайта.'
                        : 'Включите уведомления, чтобы узнавать о новых материалах на сайте.'}
                </p>
                {permissionDenied && !subscribed && (
                    <p className={styles.warning}>
                        Уведомления заблокированы в браузере. Разрешите их в настройках сайта.
                    </p>
                )}
                {error && <p className={styles.warning}>{error}</p>}
            </div>
            <button
                type="button"
                className={subscribed ? styles.disableButton : styles.enableButton}
                onClick={toggleSubscription}
                disabled={busy || !oneSignal || permissionDenied}
            >
                {busy ? 'Проверяем…' : subscribed ? 'Выключить' : 'Включить'}
            </button>
        </section>
    );
}
