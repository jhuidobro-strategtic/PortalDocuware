const isLocalhost = Boolean(
  window.location.hostname === "localhost" ||
    window.location.hostname === "[::1]" ||
    window.location.hostname.match(
      /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
    )
);

interface Config {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
}

const registerValidSW = (swUrl: string, config?: Config) => {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;

        if (!installingWorker) {
          return;
        }

        installingWorker.onstatechange = () => {
          if (installingWorker.state !== "installed") {
            return;
          }

          if (navigator.serviceWorker.controller) {
            config?.onUpdate?.(registration);
            return;
          }

          config?.onSuccess?.(registration);
        };
      };
    })
    .catch((error) => {
      console.error("Error during service worker registration:", error);
    });
};

const checkValidServiceWorker = (swUrl: string, config?: Config) => {
  fetch(swUrl, {
    headers: { "Service-Worker": "script" },
  })
    .then((response) => {
      const contentType = response.headers.get("content-type");

      if (
        response.status === 404 ||
        (contentType != null && !contentType.includes("javascript"))
      ) {
        navigator.serviceWorker.ready
          .then((registration) => registration.unregister())
          .then(() => {
            window.location.reload();
          });
        return;
      }

      registerValidSW(swUrl, config);
    })
    .catch(() => {
      console.info(
        "No internet connection found. App is running in offline mode."
      );
    });
};

export const register = (config?: Config) => {
  if (
    process.env.NODE_ENV !== "production" ||
    !("serviceWorker" in navigator)
  ) {
    return;
  }

  const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);

  if (publicUrl.origin !== window.location.origin) {
    return;
  }

  window.addEventListener("load", () => {
    const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

    if (isLocalhost) {
      checkValidServiceWorker(swUrl, config);

      navigator.serviceWorker.ready.then(() => {
        console.info("Docuware PWA is ready for offline usage.");
      });

      return;
    }

    registerValidSW(swUrl, config);
  });
};

export const unregister = () => {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.ready
    .then((registration) => registration.unregister())
    .catch((error) => {
      console.error(error.message);
    });
};
