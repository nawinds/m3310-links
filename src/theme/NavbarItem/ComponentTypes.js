import React from 'react';
import ComponentTypes from '@theme-original/NavbarItem/ComponentTypes';
import OriginalHtmlNavbarItem from '@theme-original/NavbarItem/HtmlNavbarItem';
import PushNotificationsNavbarItem from '@site/src/components/PushNotifications/NavbarItem';

function HtmlNavbarItem(props) {
    if (props.value === 'pushNotifications') {
        if (props.mobile) return null;
        return <PushNotificationsNavbarItem {...props} />;
    }

    return <OriginalHtmlNavbarItem {...props} />;
}

export default {
    ...ComponentTypes,
    html: HtmlNavbarItem,
};
