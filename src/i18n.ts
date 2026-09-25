import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { isLanguageLoaded, loadLocale, markLanguageLoaded, type LanguageCode } from "@/locales";

export const LANGUAGE_STORAGE_KEY = "iwms.language";

const normalizeLanguageCode = (value?: string | null): LanguageCode => {
  if (!value) return "en";
  const lower = value.toLowerCase();
  if (lower.startsWith("ta") || lower.includes("tamil") || value.includes("தமிழ்")) {
    return "ta";
  }
  if (lower.startsWith("hi") || lower.includes("hindi") || value.includes("हिन्दी")) {
    return "hi";
  }
  if (lower.startsWith("en") || lower.includes("english")) {
    return "en";
  }
  return "en";
};

const initialLanguage = (() => {
  if (typeof window === "undefined") return "en";
  return normalizeLanguageCode(localStorage.getItem(LANGUAGE_STORAGE_KEY));
})();

// Only the active language's translation bundle ships in the initial
// request — the other two are fetched (and cached) only if the user
// actually switches to them, via switchLanguage() below. Cuts ~8,400 lines
// of translation data for two unused languages out of every first load.
//
// No top-level await here: i18n.init() starts synchronously (with empty
// resources) so this module finishes evaluating immediately, same as
// before this file loaded resources lazily. The initial bundle is merged
// in via addResourceBundle() once its dynamic import resolves — i18next/
// react-i18next re-render subscribed components automatically when that
// happens, so nothing has to wait for it.
i18n.use(initReactI18next).init({
  resources: {},
  lng: initialLanguage,
  fallbackLng: "en",
  supportedLngs: ["en", "ta", "hi"],
  interpolation: {
    escapeValue: false,
  },
});

async function ensureLanguageLoaded(lang: LanguageCode) {
  if (isLanguageLoaded(lang)) return;
  const bundle = await loadLocale(lang);
  i18n.addResourceBundle(lang, "translation", bundle.translation, true, true);
  markLanguageLoaded(lang);
}

export async function switchLanguage(lang: LanguageCode) {
  await ensureLanguageLoaded(lang);
  await i18n.changeLanguage(lang);
}

// Kick off the initial language's load immediately (not awaited) so the
// very first render already has translations by the time i18next's own
// initial render-blocking suspense (if any) settles, without delaying
// this module's own synchronous evaluation.
void ensureLanguageLoaded(initialLanguage);

if (typeof window !== "undefined") {
  const applyLanguageAttributes = (lng: string) => {
    const normalized = normalizeLanguageCode(lng);
    document.documentElement.lang = normalized;
  };

  applyLanguageAttributes(initialLanguage);
  i18n.on("languageChanged", (lng) => {
    const normalized = normalizeLanguageCode(lng);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    applyLanguageAttributes(normalized);
  });
}

export default i18n;
