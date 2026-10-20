const APP_VERSION = "kineto-v13-routines";

export function createCloudSync({ config, getState, replaceState, onStatus }) {
  const url = (config.GOOGLE_APPS_SCRIPT_URL || "").trim();
  const token = config.SYNC_TOKEN || "";
  const enabled = Boolean(url);
  let saveTimer;

  function scheduleSave() {
    if (!enabled) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(sendSave, 500);
  }

  function load(force = false) {
    requestLoad({ force });
  }

  function requestLoad({ force = false, verifyTimestamp = "" } = {}) {
    if (!enabled) {
      onStatus("Progress is saved on this device.", { hideButton: true });
      return;
    }

    if (!verifyTimestamp) {
      onStatus(force ? "Refreshing…" : "Loading synced progress…", {
        disabled: true,
      });
    }
    const callbackName = `kinetoLoad_${Date.now()}`;
    const script = document.createElement("script");
    const requestUrl = new URL(url);
    requestUrl.searchParams.set("action", "load");
    requestUrl.searchParams.set("callback", callbackName);
    requestUrl.searchParams.set("_", Date.now());
    if (token) requestUrl.searchParams.set("token", token);

    const cleanup = () => {
      delete window[callbackName];
      script.remove();
      onStatus(null, { disabled: false });
    };

    window[callbackName] = (response) => {
      cleanup();
      if (!response?.ok) {
        onStatus("Cloud sync unavailable. Progress is safe on this device.");
        return;
      }

      if (verifyTimestamp) {
        if (response.state?.updatedAt === verifyTimestamp) {
          onStatus("Progress synced.");
        } else {
          onStatus(
            "Cloud save not confirmed. Progress is still saved on this device—tap Sync now to retry.",
          );
        }
        return;
      }

      const localState = getState();
      const cloudTime = Date.parse(response.state?.updatedAt) || 0;
      const localTime = Date.parse(localState.updatedAt) || 0;
      if (cloudTime > localTime) {
        replaceState(response.state, { persist: false });
        localStorage.setItem("kineto.tracker.v1", JSON.stringify(getState()));
        onStatus("Progress synced.");
      } else {
        sendSave();
      }
    };
    script.onerror = () => {
      cleanup();
      onStatus("Cloud sync unavailable. Progress is safe on this device.");
    };
    script.src = requestUrl;
    document.body.append(script);
  }

  function sendSave() {
    if (!enabled) return;
    clearTimeout(saveTimer);
    onStatus("Saving…");
    const state = getState();
    const expectedTimestamp = state.updatedAt;
    const body = new window.URLSearchParams();
    body.set("payload", JSON.stringify({ appVersion: APP_VERSION, state }));
    if (token) body.set("token", token);

    window
      .fetch(url, {
        method: "POST",
        mode: "no-cors",
        keepalive: true,
        body,
      })
      .then(() => {
        onStatus("Verifying cloud save…");
        setTimeout(
          () => requestLoad({ verifyTimestamp: expectedTimestamp }),
          900,
        );
      })
      .catch(() =>
        onStatus(
          "Cloud save failed. Progress is still saved on this device—tap Sync now to retry.",
        ),
      );
  }

  return { enabled, load, scheduleSave };
}
