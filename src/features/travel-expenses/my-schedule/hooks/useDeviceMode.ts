import { useEffect, useState } from "react";
import {
  MY_SCHEDULE_MOBILE_MAX_WIDTH,
  MY_SCHEDULE_TABLET_MAX_WIDTH,
} from "../shared/constants";

type DeviceMode = "mobile" | "desktop";

export const useDeviceMode = () => {
  const [mode, setMode] = useState<DeviceMode>("desktop");

  useEffect(() => {
    const mobileQuery = window.matchMedia(
      `(max-width: ${MY_SCHEDULE_MOBILE_MAX_WIDTH}px)`
    );
    const tabletCoarseQuery = window.matchMedia(
      `(max-width: ${MY_SCHEDULE_TABLET_MAX_WIDTH}px) and (pointer: coarse)`
    );

    const updateMode = () => {
      setMode(
        mobileQuery.matches || tabletCoarseQuery.matches ? "mobile" : "desktop"
      );
    };

    updateMode();
    mobileQuery.addEventListener("change", updateMode);
    tabletCoarseQuery.addEventListener("change", updateMode);
    window.addEventListener("resize", updateMode);

    return () => {
      mobileQuery.removeEventListener("change", updateMode);
      tabletCoarseQuery.removeEventListener("change", updateMode);
      window.removeEventListener("resize", updateMode);
    };
  }, []);

  return {
    mode,
    isMobile: mode === "mobile",
    isDesktop: mode === "desktop",
  };
};
