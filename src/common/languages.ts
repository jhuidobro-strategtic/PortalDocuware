import flagus from "../assets/images/flags/us.svg";
import flagspain from "../assets/images/flags/spain.svg";
import flaggermany from "../assets/images/flags/germany.svg";
import flagitaly from "../assets/images/flags/italy.svg";
import flagrussia from "../assets/images/flags/russia.svg";
import flagchina from "../assets/images/flags/china.svg";
import flagfrench from "../assets/images/flags/french.svg";
import flagarabic from "../assets/images/flags/ae.svg";

const languages = {
  sp: {
    label: "Español",
    flag: flagspain,
  },
  gr: {
    label: "Deutsch",
    flag: flaggermany,
  },
  it: {
    label: "Italiano",
    flag: flagitaly,
  },
  rs: {
    label: "русский",
    flag: flagrussia,
  },
  en: {
    label: "English",
    flag: flagus,
  },
  cn: {
    label: "中文",
    flag: flagchina,
  },
  fr: {
    label: "français",
    flag: flagfrench,
  },
  ar: {
    label: "العربية",
    flag: flagarabic,
  },
};

export default languages;
