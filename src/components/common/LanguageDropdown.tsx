import React, { useEffect, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle } from 'reactstrap';

//i18n
import i18n from "../../i18n";
import languages, { AppLanguageKey } from "../../common/languages";

const normalizeLanguage = (language?: string): AppLanguageKey => {
    const normalizedLanguage = (language || "en").toLowerCase();

    if (normalizedLanguage.startsWith("es")) return "sp";
    if (normalizedLanguage.startsWith("de")) return "gr";
    if (normalizedLanguage.startsWith("ru")) return "rs";
    if (normalizedLanguage.startsWith("zh")) return "cn";
    if (normalizedLanguage.startsWith("fr")) return "fr";
    if (normalizedLanguage.startsWith("ar")) return "ar";
    if (normalizedLanguage.startsWith("it")) return "it";
    if (normalizedLanguage.startsWith("en")) return "en";

    return (normalizedLanguage in languages
        ? normalizedLanguage
        : "en") as AppLanguageKey;
};

const LanguageDropdown = () => {
    // Declare a new state variable, which we'll call "menu"
    const [selectedLang, setSelectedLang] = useState<AppLanguageKey>(
        normalizeLanguage(i18n.resolvedLanguage || i18n.language)
    );

    useEffect(() => {
        const syncLanguage = (language?: string) => {
            setSelectedLang(normalizeLanguage(language || localStorage.getItem("I18N_LANGUAGE") || undefined));
        };

        syncLanguage(i18n.resolvedLanguage || i18n.language);
        i18n.on("languageChanged", syncLanguage);

        return () => {
            i18n.off("languageChanged", syncLanguage);
        };
    }, []);

    const changeLanguageAction = (lang : AppLanguageKey) => {
        //set language as i18n
        i18n.changeLanguage(lang);
        localStorage.setItem("I18N_LANGUAGE", lang);
        setSelectedLang(lang);
    };


    const [isLanguageDropdown, setIsLanguageDropdown] = useState<boolean>(false);
    const toggleLanguageDropdown = () => {
        setIsLanguageDropdown(!isLanguageDropdown);
    };
    return (
        <React.Fragment>
            <Dropdown isOpen={isLanguageDropdown} toggle={toggleLanguageDropdown} className="ms-1 topbar-head-dropdown header-item">
                <DropdownToggle className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle" tag="button">
                    <img
                        src={languages[selectedLang].flag}
                        alt="Header Language"
                        height="20"
                        className="rounded"
                    />
                </DropdownToggle>
                <DropdownMenu className="notify-item language py-2">
                    {(Object.keys(languages) as AppLanguageKey[]).map((key) => (
                        <DropdownItem
                            key={key}
                            onClick={() => changeLanguageAction(key)}
                            className={`notify-item ${selectedLang === key ? "active" : "none"
                                }`}
                        >
                            <img
                                src={languages[key].flag}
                                alt={languages[key].label}
                                className="me-2 rounded"
                                height="18"
                            />
                            <span className="align-middle">
                                {languages[key].label}
                            </span>
                        </DropdownItem>
                    ))}
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default LanguageDropdown;
