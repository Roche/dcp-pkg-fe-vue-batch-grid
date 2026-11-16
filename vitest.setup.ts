import { config } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';

const i18n = createI18n({
    legacy: false,
    locale: 'en',
    messages: {
        en: {}
    },
    missingWarn: false,
    fallbackWarn: false
});

config.global.plugins = [i18n];

config.global.stubs = {
    VIcon: true,
    VBtn: true,
    VBtnToggle: true,
    VList: true,
    VListItem: true,
    VListItemTitle: true,
    VMenu: true,
    VTooltip: true,
    VTextField: true,
    DcpTextButton: true,
};