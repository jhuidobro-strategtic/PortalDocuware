import React, { useEffect, useState } from 'react';
import { Link, useLocation } from "react-router-dom";
import { Collapse } from 'reactstrap';
import { useTranslation } from "react-i18next";
import navdata from "../LayoutMenuData";

const VerticalLayout = () => {
    const { i18n } = useTranslation();
    const location = useLocation();
    const navItems = navdata((key: string) => i18n.t(key));
    const [openSection, setOpenSection] = useState<string>("document-management");

    useEffect(() => {
        const translatedNavItems = navdata((key: string) => i18n.t(key));
        const activeSection = translatedNavItems.find(
            (item: any) => item.subItems?.some((subItem: any) => subItem.link === location.pathname)
        );

        if (activeSection?.id) {
            setOpenSection(activeSection.id);
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [location.pathname, i18n, i18n.language]);

    return (
        <React.Fragment>
            {navItems.map((item: any, key: number) => (
                <React.Fragment key={key}>
                    {item.isHeader ? (
                        <li className="menu-title">
                            <span>{item.label}</span>
                        </li>
                    ) : (
                        <li className="nav-item">
                            <Link
                                to="/#"
                                className={`nav-link menu-link ${openSection === item.id ? "active" : ""}`}
                                onClick={(event) => {
                                    event.preventDefault();
                                    setOpenSection((current) => current === item.id ? "" : item.id);
                                }}
                            >
                                <i className={item.icon}></i>
                                <span>{item.label}</span>
                            </Link>
                            <Collapse className="menu-dropdown" isOpen={openSection === item.id}>
                                <ul className="nav nav-sm flex-column">
                                    {(item.subItems || []).map((subItem: any) => (
                                        <li className="nav-item" key={subItem.id}>
                                            <Link
                                                to={subItem.link}
                                                className={`nav-link ${location.pathname === subItem.link ? "active" : ""}`}
                                            >
                                                {subItem.label}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </Collapse>
                        </li>
                    )}
                </React.Fragment>
            ))}
        </React.Fragment>
    );
};

export default VerticalLayout;
