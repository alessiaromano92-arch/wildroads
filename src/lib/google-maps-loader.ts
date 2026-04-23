/**
 * Loads or waits for the Maps JavaScript API (shared with Places autocomplete).
 */
const CALLBACK_NAME = "__wildRoadsMapsInit__";

export function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.Map) return Promise.resolve();

  const existing = document.querySelector(
    "script[src*='maps.googleapis.com/maps/api/js']",
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      const done = () => {
        if (window.google?.maps?.Map) resolve();
      };
      if (window.google?.maps?.Map) {
        resolve();
        return;
      }
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => reject(new Error("Maps script error")), {
        once: true,
      });
      window.setTimeout(done, 50);
    });
  }

  return new Promise((resolve, reject) => {
    (window as unknown as Record<string, () => void>)[CALLBACK_NAME] = () => {
      delete (window as unknown as Record<string, () => void>)[CALLBACK_NAME];
      resolve();
    };
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${CALLBACK_NAME}`;
    s.async = true;
    s.onerror = () => reject(new Error("Maps script failed to load"));
    document.head.appendChild(s);
  });
}
