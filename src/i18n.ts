import i18n from "i18next";
import detector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import translationGr from "./locales/gr.json";
import translationIT from "./locales/it.json";
import translationRS from "./locales/ru.json";
import translationSP from "./locales/sp.json";
import translationENG from "./locales/en.json";
import translationCN from "./locales/ch.json";
import translationFR from "./locales/fr.json";
import translationAR from "./locales/ar.json";
import appTranslations from "./locales/appTranslations";


// the translations
const resources = {
  gr: {
    translation: {
      ...translationGr,
      ...appTranslations.gr,
    },
  },
  it: {
    translation: {
      ...translationIT,
      ...appTranslations.it,
    },
  },
  rs: {
    translation: {
      ...translationRS,
      ...appTranslations.rs,
    },
  },
  sp: {
    translation: {
      ...translationSP,
      ...appTranslations.sp,
    },
  },
  en: {
    translation: {
      ...translationENG,
      ...appTranslations.en,
    },
  },
  cn: {
    translation: {
      ...translationCN,
      ...appTranslations.cn,
    },
  },
  fr: {
    translation: {
      ...translationFR,
      ...appTranslations.fr,
    },
  },
  ar: {
    translation: {
      ...translationAR,
      ...appTranslations.ar,
    },
  },
};

const applyDocumentLanguage = (lang: string) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
};

const language = localStorage.getItem("I18N_LANGUAGE");
if (!language) {
  localStorage.setItem("I18N_LANGUAGE", "en");
}

i18n
  .use(detector)
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources,
    lng: localStorage.getItem("I18N_LANGUAGE") || "en",
    fallbackLng: "en", // use en if detected lng is not available

    keySeparator: false, // we do not use keys in form messages.welcome

    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

applyDocumentLanguage(i18n.language);
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
