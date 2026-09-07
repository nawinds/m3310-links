import React from 'react';

import {PushNotificationsProvider} from '@site/src/components/PushNotifications';

export default function Root({children}) {
    return <PushNotificationsProvider>{children}</PushNotificationsProvider>;
}
