import React from 'react';
import clsx from 'clsx';
import {FiBell, FiBellOff} from 'react-icons/fi';

import {usePushNotifications} from './index';
import styles from './styles.module.css';

export default function PushNotificationsNavbarItem({className, mobileHeader = false}) {
    const notifications = usePushNotifications();

    if (!notifications) return null;

    const {available, busy, subscribed, supported, toggleSubscription} = notifications;
    const unavailable = !supported || !available;
    const title = !supported
        ? 'Уведомления недоступны в этом браузере или не настроены'
        : subscribed
            ? 'Выключить уведомления'
            : 'Включить уведомления';

    return (
        <button
            type="button"
            className={clsx(
                'clean-btn',
                'navbar__link',
                !mobileHeader && 'navbar__item',
                styles.navbarButton,
                className,
            )}
            onClick={toggleSubscription}
            disabled={busy || unavailable}
            aria-pressed={subscribed}
            aria-label={title}
            title={title}
        >
            {subscribed
                ? <FiBell className={styles.navbarIcon} aria-hidden="true" />
                : <FiBellOff className={styles.navbarIcon} aria-hidden="true" />}
        </button>
    );
}
