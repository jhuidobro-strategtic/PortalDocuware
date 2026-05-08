import React, { useState, useEffect } from 'react';
import './PwaLaunchScreen.css';
import logo from '../../assets/images/newlogodocuware.png';

// Componente Splash Screen que emula una animación premium en iOS
const PwaLaunchScreen: React.FC = () => {
  const [phase, setPhase] = useState<'initial' | 'expanding' | 'hidden'>('initial');
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detectar si la app está en modo standalone en iOS
    const checkStandalone = () => {
      const isIosStandalone = ('standalone' in window.navigator && (window.navigator as any).standalone);
      const isPwaStandalone = window.matchMedia('(display-mode: standalone)').matches;
      return isIosStandalone || isPwaStandalone;
    };

    // Para desarrollo, puedes forzar a true cambiando la siguiente línea a: setIsStandalone(true);
    setIsStandalone(checkStandalone());

    if (checkStandalone()) {
      // 1. Mostrar estado inicial con latido/scaling del logo por 1.5s
      const expandTimer = setTimeout(() => {
        setPhase('expanding'); // 2. Iniciar la expansión del círculo
      }, 1500);

      // 3. Desmontar el splash screen cuando termine toda la animación (ej: 1s después de expandirse)
      const hideTimer = setTimeout(() => {
        setPhase('hidden');
      }, 3000); 

      return () => {
        clearTimeout(expandTimer);
        clearTimeout(hideTimer);
      };
    }
  }, []);

  if (!isStandalone || phase === 'hidden') {
    return null;
  }

  return (
    <div className={`ios-splash ${phase === 'expanding' ? 'is-expanding' : ''}`}>
      {/* Círculo púrpura que se expandirá detrás del logo */}
      <div className="ios-splash-circle"></div>

      <div className="ios-splash-content">
        <div className="ios-splash-logo-container">
          <img 
            src={logo} 
            alt="Docuware Logo" 
            className="ios-splash-logo" 
          />
        </div>
        
        <div className="ios-splash-text">
          <h1>Docuware</h1>
          <p>Tu centro de trabajo documental</p>
        </div>
      </div>
    </div>
  );
};

export default PwaLaunchScreen;
