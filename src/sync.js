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
    if (!enabled) {
      onStatus("Progress is saved on this device.", { hideButton: true });
      return;
    }

    onStatus(force ? "Refreshing…" : "Loading synced progress…", {
      disabled: true,
    });
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
    onStatus("Saving…");
    const frameName = "kinetoSyncFrame";
    let frame = document.querySelector(`iframe[name="${frameName}"]`);
    if (!frame) {
      frame = document.createElement("iframe");
      frame.name = frameName;
      frame.hidden = true;
      document.body.append(frame);
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = url;
    form.target = frameName;
    form.hidden = true;
    addField(
      form,
      "payload",
      JSON.stringify({ appVersion: APP_VERSION, state: getState() }),
    );
    if (token) addField(form, "token", token);
    document.body.append(form);
    form.submit();
    form.remove();
    setTimeout(() => onStatus("Saved locally. Cloud save sent."), 700);
  }

  return { enabled, load, scheduleSave };
}

function addField(form, name, value) {
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = name;
  input.value = value;
  form.append(input);
}
