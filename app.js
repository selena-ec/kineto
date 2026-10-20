import { PROGRAMS, WORKOUTS } from "./src/catalog.js";
import { cycleWeek } from "./src/dates.js";
import { createStateStore } from "./src/storage.js";
import { createCloudSync } from "./src/sync.js?v=20261019-verified-sync";
import { createTrackerView } from "./src/ui.js";

const syncStatus = document.querySelector("#syncStatus");
const syncButton = document.querySelector("#syncNow");
const app = { trackerView: null };

const store = createStateStore({
  programs: PROGRAMS,
  workouts: WORKOUTS,
  onChange: () => app.trackerView?.render(),
});

const cloudSync = createCloudSync({
  config: window.FLEX_TRACKER_CONFIG || {},
  getState: store.get,
  replaceState: store.replace,
  onStatus: updateSyncStatus,
});

app.trackerView = createTrackerView({
  programs: PROGRAMS,
  workouts: WORKOUTS,
  store,
  onStateChanged: cloudSync.scheduleSave,
  initialWeek: cycleWeek(new Date()),
});

document.querySelector("#resetProgress").addEventListener("click", () => {
  const confirmed = window.confirm(
    "Reset all Kineto workout choices and progress?",
  );
  if (!confirmed) return;
  store.reset();
  cloudSync.scheduleSave();
});

syncButton.addEventListener("click", () => cloudSync.load(true));
app.trackerView.render();
cloudSync.load();

function updateSyncStatus(message, options = {}) {
  if (message) syncStatus.textContent = message;
  syncButton.disabled = Boolean(options.disabled);
  syncButton.hidden = Boolean(options.hideButton);
}
