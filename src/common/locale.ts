const numberLocales: Record<string, string> = {
  en: "en-US",
  sp: "es-PE",
  gr: "de-DE",
  it: "it-IT",
  rs: "ru-RU",
  cn: "zh-CN",
  fr: "fr-FR",
  ar: "ar-AE",
};

export const getNumberLocale = (language?: string) =>
  numberLocales[language || "en"] || "en-US";
