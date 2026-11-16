export interface TranslatorLike {
    translationPrefix?: string;
    translator: (key: string) => string;
}

const DEFAULT_TRANSLATION_PREFIX = '@open-dcp/i18n';
const FEATURE_NAMESPACE = 'batch-grid';

const normalizeKey = (key: string, translationPrefix: string): string => {
    if (key.startsWith('@')) {
        return key;
    }

    if (key.startsWith(`${FEATURE_NAMESPACE}.`)) {
        return `${translationPrefix}.${key}`;
    }

    return `${translationPrefix}.${FEATURE_NAMESPACE}.${key}`;
};

export const useTranslation = (translation?: TranslatorLike | null) => {
    const translationPrefix = translation?.translationPrefix ?? DEFAULT_TRANSLATION_PREFIX;

    const t = (key: string): string => {
        const useKey = normalizeKey(key, translationPrefix);
        const translated = translation?.translator?.(useKey);

        return translated ?? key;
    };

    return { t };
};
