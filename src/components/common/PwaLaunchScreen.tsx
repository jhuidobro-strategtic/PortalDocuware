import React, { CSSProperties, useEffect, useMemo, useState } from "react";
import "./PwaLaunchScreen.css";

const HIDE_DELAY_MS = 1450;
const UNMOUNT_DELAY_MS = 2050;
const BRAND_MARK_SRC = `${process.env.PUBLIC_URL}/logo192.png`;
const FLOATING_PARTICLES = [
  { top: "12%", left: "18%", size: "10px", delay: "0s", duration: "8.5s" },
  { top: "24%", left: "78%", size: "14px", delay: "1.2s", duration: "10s" },
  { top: "36%", left: "12%", size: "8px", delay: "0.8s", duration: "9.2s" },
  { top: "45%", left: "88%", size: "12px", delay: "2.1s", duration: "11s" },
  { top: "58%", left: "24%", size: "16px", delay: "1.7s", duration: "9.8s" },
  { top: "64%", left: "72%", size: "9px", delay: "2.8s", duration: "8.8s" },
  { top: "74%", left: "14%", size: "11px", delay: "1s", duration: "10.6s" },
  { top: "80%", left: "84%", size: "7px", delay: "2.4s", duration: "9.4s" },
];

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
  const particleStyles = useMemo(
    () =>
      FLOATING_PARTICLES.map(
        (particle) =>
          ({
            "--particle-top": particle.top,
            "--particle-left": particle.left,
            "--particle-size": particle.size,
            "--particle-delay": particle.delay,
            "--particle-duration": particle.duration,
          } as CSSProperties)
      ),
    []
  );

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
      <div className="pwa-launch-screen__ambient" aria-hidden="true">
        <span className="pwa-launch-screen__blob pwa-launch-screen__blob--one" />
        <span className="pwa-launch-screen__blob pwa-launch-screen__blob--two" />
        <span className="pwa-launch-screen__blob pwa-launch-screen__blob--three" />
        <span className="pwa-launch-screen__mesh" />
        {particleStyles.map((style, index) => (
          <span
            key={index}
            className="pwa-launch-screen__particle"
            style={style}
          />
        ))}
      </div>

      <div className="pwa-launch-screen__scene">
        <div className="pwa-launch-screen__orbital">
          <span className="pwa-launch-screen__ring pwa-launch-screen__ring--outer" />
          <span className="pwa-launch-screen__ring pwa-launch-screen__ring--mid" />
          <span className="pwa-launch-screen__ring pwa-launch-screen__ring--inner" />
          <span className="pwa-launch-screen__spark pwa-launch-screen__spark--one" />
          <span className="pwa-launch-screen__spark pwa-launch-screen__spark--two" />
          <span className="pwa-launch-screen__spark pwa-launch-screen__spark--three" />
          <div className="pwa-launch-screen__mark-shell">
            <span className="pwa-launch-screen__mark-glow" />
            <div className="pwa-launch-screen__mark-core">
              <img
                src={BRAND_MARK_SRC}
                alt="Docuware"
                className="pwa-launch-screen__mark-image"
              />
            </div>
          </div>
        </div>

        <div className="pwa-launch-screen__copy">
          <span className="pwa-launch-screen__eyebrow">DOCUWARE PWA</span>
          <h1 className="pwa-launch-screen__title">Docuware</h1>
          <p className="pwa-launch-screen__subtitle">
            Gestion documental inteligente, mas rapida y mas fluida.
          </p>
        </div>

        <div className="pwa-launch-screen__progress" aria-hidden="true">
          <span className="pwa-launch-screen__progress-bar" />
        </div>
      </div>
    </div>
  );
};

export default PwaLaunchScreen;
