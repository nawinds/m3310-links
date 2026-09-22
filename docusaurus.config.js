// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: 'M3310',
    tagline: 'Полезные ссылки группы M3310 ИТМО',
    favicon: 'img/favicon.ico',
    trailingSlash: false,

    // Set the production url of your site here
    url: 'https://M3310.nawinds.dev',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/',

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'nawinds', // Usually your GitHub org/user name.
    projectName: 'm3310-links', // Usually your repo name.

    onBrokenLinks: 'throw',
    onBrokenMarkdownLinks: 'warn',

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'ru',
        locales: ['ru'],
    },

    headTags: [
        {
            tagName: 'meta',
            attributes: {
                name: 'robots',
                content: 'nofollow, follow',
            },
        },
    ],


    presets: [
        [
            'classic',
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                /*docs: {
                    sidebarPath: './sidebars.js',

                },
                blog: {
                    showReadingTime: true,
                    feedOptions: {
                        type: ['rss', 'atom'],
                        xslt: true,
                    },

                    // Useful options to enforce blogging best practices
                    onInlineTags: 'warn',
                    onInlineAuthors: 'warn',
                    onUntruncatedBlogPosts: 'warn',
                },*/
                theme: {
                    customCss: './src/css/custom.css',
                },
            }),
        ],
    ],

    themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */

        ({
            // announcementBar: {
            //     id: 'support_us',
            //     content:
            //         'We are looking to revamp our docs, please fill <a target="_blank" rel="noopener noreferrer" href="#">this survey</a>',
            //     backgroundColor: '#000000',
            //     textColor: '#091E42',
            //     isCloseable: false,
            // },
            colorMode: {
                defaultMode: 'dark',
                respectPrefersColorScheme: false,
            },
            navbar: {
                title: 'Полезные ссылки',
                items: [
                    {
                        label: 'Ведомости',
                        href: '/table-grades',
                    },
                    {
                        label: 'Правила оценивания',
                        href: '/point-distribution',
                    },
                    {
                        type: 'dropdown',
                        label: 'Архив',
                        position: 'left',
                        items: [
                            {
                                label: '1 семестр',
                                href: '/archive/semester/1',
                            },
                            {
                                label: '2 семестр',
                                href: '/archive/semester/2',
                            },
                            {
                                label: '3 семестр',
                                href: '/archive/semester/3',
                            },
                            {
                                label: '4 семестр',
                                href: '/archive/semester/4'
                            }
                        ],
                    },
                    {
                        type: 'html',
                        position: 'right',
                        value: 'pushNotifications',
                    },
                    // {
                    //     type: 'html',
                    //     position: 'right',
                    //     value: '<button class="clean-btn" style="width: 32px; height: 32px;">' +
                    //         '<img src="/img/help.svg" alt="Help" ' +
                    //         'style="cursor: pointer;" title="Help" ' +
                    //         'data-help-popup="" /></button>',
                    // },
                ],
            },
            footer: {
                style: 'dark',
                links: [
                    {
                        title: 'Сайты ИТМО',
                        items: [
                            {
                                label: 'my.itmo',
                                href: 'https://my.itmo.ru',
                            },
                            {
                                label: 'ИСУ',
                                href: 'https://isu.ifmo.ru',
                            },
                            {
                                label: 'Запись на физру',
                                href: 'https://my.itmo.ru/sport/sign',
                            },
                            {
                                label: 'Бронирования',
                                href: 'https://isu.ifmo.ru/pls/apex/f?p=2431:4',
                            },
                            {
                                label: 'BARS',
                                href: 'https://bars.itmo.ru',
                            },
                        ],
                    },
                    {
                        title: 'Контакты',
                        items: [
                            {
                                label: 'm3310@nawinds.dev',
                                href: 'mailto:m3310@nawinds.dev',
                            },
                            {
                                label: 'Исходный код',
                                href: 'https://github.com/nawinds/m3310-links',
                            },
                            {
                                label: 'Внесли вклад',
                                href: 'https://github.com/nawinds/m3310-links/graphs/contributors',
                            },
                        ],
                    },
                    {
                        title: 'О сайте',
                        items: [
                            {
                                label: 'Отзывы',
                                href: 'https://yandex.ru/maps/org/230826642884/reviews',
                            },
                            {
                                label: 'Задонатить',
                                href: 'https://www.tbank.ru/cf/3AbJDkT6VIA',
                            },
                            {
                                html: '<a href="#" data-help-popup="" onclick="ym(98560217, \'reachGoal\', \'footer_hotkeys_reference\'); return true;">Горячие клавиши</a>',
                            },
                        ],
                    },
                ],
            },
            prism: {
                theme: prismThemes.github,
                darkTheme: prismThemes.dracula,
            },
        }),
    scripts: ['/ya_metrika.js'],
    plugins: [
        [
            '@docusaurus/plugin-pwa',
            {
                debug: true,
                // OneSignalSDKWorker.js imports the generated /sw.js and owns
                // the root scope, so Docusaurus must not register a competing worker.
                swRegister: false,
                offlineModeActivationStrategies: [
                    'appInstalled',
                    'standalone',
                    'queryString',
                ],
                pwaHead: [
                    {
                        tagName: 'link',
                        rel: 'icon',
                        href: '/img/android-chrome-512x512.png',
                    },
                    {
                        tagName: 'link',
                        rel: 'manifest',
                        href: '/manifest.json', // your PWA manifest
                    },
                    {
                        tagName: 'meta',
                        name: 'theme-color',
                        content: '#3d1a55',
                    },
                ],
            },
        ],
        [
            '@docusaurus/plugin-google-gtag',
            {
                trackingID: 'G-31L3HQGM6Q',
                anonymizeIP: false,
            },
        ],
    ],
    customFields: {
        licenseKey: process.env.LICENSE_KEY,
        ymCounter: '98560217',
        oneSignalAppId: process.env.ONESIGNAL_APP_ID || '',
    },
};

export default config;
