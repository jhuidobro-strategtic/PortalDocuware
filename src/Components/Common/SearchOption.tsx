import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Input } from 'reactstrap';
import { useTranslation } from "react-i18next";

import Navdata from '../../Layouts/LayoutMenuData';

const SearchOption = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const searchableItems = Navdata(t).flatMap((menuItem: any) => (
        menuItem.subItems?.map((subItem: any) => ({
            label: subItem.label,
            link: subItem.link,
            icon: menuItem.icon,
        })) || []
    ));

    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filteredItems = normalizedSearch
        ? searchableItems.filter((item: any) =>
            item.label.toLowerCase().includes(normalizedSearch) ||
            item.link.toLowerCase().includes(normalizedSearch)
        )
        : [];

    return (
        <React.Fragment>
            <form className="app-search d-none d-md-block">
                <div className="position-relative">
                    <Input
                        type="text"
                        className="form-control"
                        placeholder={t("Search...")}
                        id="search-options"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                    <span className="mdi mdi-magnify search-widget-icon"></span>
                    {searchTerm && (
                        <button
                            type="button"
                            className="btn btn-link search-widget-icon search-widget-icon-close text-decoration-none"
                            onClick={() => setSearchTerm('')}
                        >
                            <span className="mdi mdi-close-circle"></span>
                        </button>
                    )}
                </div>

                {searchTerm && (
                    <div className="dropdown-menu dropdown-menu-lg show" id="search-dropdown">
                        <div className="dropdown-header">
                            <h6 className="text-overflow text-muted mb-0 text-uppercase">{t("Modules")}</h6>
                        </div>

                        {filteredItems.length > 0 ? (
                            filteredItems.map((item: any) => (
                                <Link
                                    key={item.link}
                                    to={item.link}
                                    className="dropdown-item notify-item"
                                    onClick={() => setSearchTerm('')}
                                >
                                    <i className={`${item.icon} align-middle fs-xl text-muted me-2`}></i>
                                    <span>{item.label}</span>
                                </Link>
                            ))
                        ) : (
                            <div className="dropdown-item text-muted">
                                {t("No results found.")}
                            </div>
                        )}
                    </div>
                )}
            </form>
        </React.Fragment>
    );
};

export default SearchOption;
