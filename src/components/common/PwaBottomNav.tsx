import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import Navdata from '../../Layouts/LayoutMenuData';
import './PwaBottomNav.css';

interface RawNavSubItem {
  id?: string;
  label?: string;
  link?: string;
}

interface RawNavItem {
  id?: string;
  label?: string;
  icon?: string;
  isHeader?: boolean;
  subItems?: RawNavSubItem[];
}

interface PwaMenuLink {
  id: string;
  label: string;
  link: string;
}

interface PwaMenuGroup {
  id: string;
  label: string;
  icon: string;
  items: PwaMenuLink[];
}

interface PwaPrimaryNavItem {
  id: string;
  label: string;
  icon: string;
  link: string;
  matchLinks: string[];
}

const PRIMARY_NAV_CONFIG = [
  { groupId: "document-management", defaultItemId: "documents" },
  { groupId: "purchase-orders", defaultItemId: "purchase-order-details" },
  { groupId: "expedients", defaultItemId: "expedient-list" },
  { groupId: "travel-expenses", defaultItemId: "travel-expenses-my-schedule" },
];

const isStandaloneMode = () => {
  const iosStandalone = 'standalone' in window.navigator && (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(iosStandalone || window.matchMedia('(display-mode: standalone)').matches);
};

const matchesPath = (pathname: string, link: string) =>
  pathname === link || pathname.startsWith(`${link}/`);

const PwaBottomNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const updateMode = () => {
      setIsStandalone(isStandaloneMode());
    };

    updateMode();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateMode);
    } else {
      mediaQuery.addListener(updateMode);
    }

    window.addEventListener("resize", updateMode);

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", updateMode);
      } else {
        mediaQuery.removeListener(updateMode);
      }
      window.removeEventListener("resize", updateMode);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isStandalone) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = previousOverflow;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen, isStandalone]);

  const menuGroups = useMemo<PwaMenuGroup[]>(() => {
    return (Navdata(t) as RawNavItem[])
      .filter((item) => !item.isHeader && item.id && item.label && item.icon && item.subItems && item.subItems.length > 0)
      .map((item) => ({
        id: item.id as string,
        label: item.label as string,
        icon: item.icon as string,
        items: (item.subItems ?? [])
          .filter((subItem) => Boolean(subItem.id && subItem.label && subItem.link))
          .map((subItem) => ({
            id: subItem.id as string,
            label: subItem.label as string,
            link: subItem.link as string,
          })),
      }))
      .filter((group) => group.items.length > 0);
  }, [t]);

  const primaryNavItems = useMemo<PwaPrimaryNavItem[]>(() => {
    return PRIMARY_NAV_CONFIG.map((config) => {
      const group = menuGroups.find((item) => item.id === config.groupId);

      if (!group) {
        return null;
      }

      const defaultItem =
        group.items.find((item) => item.id === config.defaultItemId) ?? group.items[0];

      return {
        id: group.id,
        label: defaultItem.label,
        icon: group.icon,
        link: defaultItem.link,
        matchLinks: group.items.map((item) => item.link),
      };
    }).filter((item): item is PwaPrimaryNavItem => Boolean(item));
  }, [menuGroups]);

  const hasRouteInMenu = menuGroups.some((group) =>
    group.items.some((item) => matchesPath(location.pathname, item.link))
  );

  const hasRouteInPrimary = primaryNavItems.some((item) =>
    item.matchLinks.some((link) => matchesPath(location.pathname, link))
  );

  if (!isStandalone || primaryNavItems.length === 0) {
    return null;
  }

  return (
    <>
      {isMenuOpen && (
        <button
          type="button"
          className="pwa-menu-sheet__backdrop"
          aria-label={t("Close")}
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      <nav className="pwa-bottom-nav" aria-label={t("Menu")}>
        <ul>
          {primaryNavItems.map((item) => {
            const isActive = item.matchLinks.some((link) => matchesPath(location.pathname, link));

            return (
              <li key={item.id}>
                <Link to={item.link} className={`pwa-bottom-nav-link ${isActive ? 'active' : ''}`}>
                  <i className={item.icon} aria-hidden="true"></i>
                  <span className="pwa-bottom-nav-link__label">{item.label}</span>
                </Link>
              </li>
            );
          })}

          <li>
            <button
              type="button"
              className={`pwa-bottom-nav-link pwa-bottom-nav-link--button ${isMenuOpen || (hasRouteInMenu && !hasRouteInPrimary) ? 'active' : ''}`}
              onClick={() => setIsMenuOpen((current) => !current)}
              aria-expanded={isMenuOpen}
              aria-controls="pwa-menu-sheet"
            >
              <i className="ri-menu-line" aria-hidden="true"></i>
              <span className="pwa-bottom-nav-link__label">{t("Menu")}</span>
            </button>
          </li>
        </ul>
      </nav>

      <aside
        id="pwa-menu-sheet"
        className={`pwa-menu-sheet ${isMenuOpen ? 'open' : ''}`}
        aria-hidden={!isMenuOpen}
        aria-modal="true"
        role="dialog"
      >
        <div className="pwa-menu-sheet__header">
          <div>
            <p className="pwa-menu-sheet__eyebrow">{t("Modules")}</p>
            <h2 className="pwa-menu-sheet__title">{t("Menu")}</h2>
          </div>
          <button
            type="button"
            className="pwa-menu-sheet__close"
            aria-label={t("Close")}
            onClick={() => setIsMenuOpen(false)}
          >
            <i className="ri-close-line" aria-hidden="true"></i>
          </button>
        </div>

        <div className="pwa-menu-sheet__content">
          {menuGroups.map((group) => (
            <section key={group.id} className="pwa-menu-sheet__group">
              <div className="pwa-menu-sheet__group-header">
                <i className={group.icon} aria-hidden="true"></i>
                <span>{group.label}</span>
              </div>

              <div className="pwa-menu-sheet__links">
                {group.items.map((item) => {
                  const isActive = matchesPath(location.pathname, item.link);

                  return (
                    <Link
                      key={item.id}
                      to={item.link}
                      className={`pwa-menu-sheet__link ${isActive ? 'active' : ''}`}
                    >
                      <span className="pwa-menu-sheet__link-title">{item.label}</span>
                      <i className="ri-arrow-right-s-line" aria-hidden="true"></i>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </aside>
    </>
  );
};

export default PwaBottomNav;
