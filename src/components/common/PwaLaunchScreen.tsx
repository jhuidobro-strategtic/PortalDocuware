import React, { useEffect, useMemo, useState } from "react";
import docuwareLogo from "../../assets/images/LogoDocuware.png";
import "./PwaLaunchScreen.css";

const HIDE_DELAY_MS = 900;
const UNMOUNT_DELAY_MS = 1350;

const isIosStandaloneMode = () => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIosDevice =
    /iphone|ipad|ipod/.test(userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  return isIosDevice && isStandalone;
};

const PwaLaunchScreen: React.FC = () => {
  const shouldShow = useMemo(() => isIosStandaloneMode(), []);
  const [isVisible, setIsVisible] = useState(shouldShow);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    if (!shouldShow) {
      return;
    }

    const hideTimer = window.setTimeout(() => {
      setIsHiding(true);
    }, HIDE_DELAY_MS);

    const unmountTimer = window.setTimeout(() => {
      setIsVisible(false);
    }, UNMOUNT_DELAY_MS);

    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(unmountTimer);
    };
  }, [shouldShow]);

  if (!shouldShow || !isVisible) {
    return null;
  }

  return (
    <div className={`pwa-launch-screen ${isHiding ? "is-hiding" : ""}`}>
      <div className="pwa-launch-screen__card">
        <img
          src={docuwareLogo}
          alt="Docuware"
          className="pwa-launch-screen__logo"
        />
        <p className="pwa-launch-screen__title">Docuware</p>
        <p className="pwa-launch-screen__subtitle">Gestion Documental</p>
      </div>
    </div>
  );
};

export default PwaLaunchScreen;
