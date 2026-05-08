import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from "react-i18next";
import Navdata from '../../Layouts/LayoutMenuData';
import './PwaBottomNav.css';

const PwaBottomNav: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar modo PWA/Standalone
    const isIosStandalone = ('standalone' in window.navigator && (window.navigator as any).standalone);
    const isPwaStandalone = window.matchMedia('(display-mode: standalone)').matches;
    
    // Cambiar a setIsStandalone(true) temporalmente si necesitas probar en web de escritorio
    setIsStandalone(isIosStandalone || isPwaStandalone);
  }, []);

  if (!isStandalone) {
    return null;
  }

  // Filtrar y preparar los ítems. Ignoramos headers y agarramos el link del primer subitem para la navegación directa.
  const navItems = Navdata(t)
    .filter(item => !item.isHeader && item.subItems && item.subItems.length > 0)
    .map(item => {
      const firstSubItemLink = item.subItems ? item.subItems[0].link : '#';
      return {
        id: item.id,
        label: item.label,
        icon: item.icon,
        link: firstSubItemLink
      };
    })
    // Mostramos máximo 4 o 5 elementos en un Bottom Nav para que no se vea amontonado.
    .slice(0, 5);

  return (
    <nav className="pwa-bottom-nav">
      <ul>
        {navItems.map((item, index) => {
          // Determinar si la ruta actual coincide o empieza con el link del ítem
          const isActive = item.link && item.link !== '#' && location.pathname.includes(item.link);
          return (
            <li key={item.id || index}>
              <Link to={item.link || '#'} className={`pwa-bottom-nav-link ${isActive ? 'active' : ''}`}>
                <i className={item.icon}></i>
                <span className="pwa-bottom-nav-label">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default PwaBottomNav;
