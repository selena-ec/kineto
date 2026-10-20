const STATE_SHEET_NAME = "KinetoState";
const STATE_HEADERS = ["appVersion", "stateJson", "updatedAt"];
const TOKEN = ""; // Optional: set this to match SYNC_TOKEN in config.js.
const OLD_DATA_SHEETS = [
  "TrackerState",
  "WorkoutProgress",
  "CycleNotes",
  "BeginnerTrackerState",
  "BeginnerWorkoutProgress",
  "BeginnerCycleNotes",
];

function doGet(e) {
  if (!isAuthorized_(e)) return jsonp_(e, { ok: false, error: "Unauthorized" });
  const sheet = getStateSheet_();
  if (sheet.getLastRow() < 2)
    return jsonp_(e, { ok: true, state: emptyState_(), updatedAt: "" });
  const row = sheet.getRange(2, 1, 1, 3).getValues()[0];
  const state = safeParse_(row[1] || "{}", emptyState_());
  return jsonp_(e, {
    ok: true,
    state: state,
    updatedAt: row[2] || state.updatedAt || "",
  });
}

function doPost(e) {
  if (!isAuthorized_(e)) return text_({ ok: false, error: "Unauthorized" });
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    clearOldTrackerDataOnce_();
    const payload = safeParse_(e.parameter.payload || "{}", {});
    const state = sanitizeState_(payload.state);
    const sheet = getStateSheet_();
    if (sheet.getLastRow() > 1)
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
    sheet
      .getRange(2, 1, 1, 3)
      .setValues([
        [
          payload.appVersion || "kineto-v1",
          JSON.stringify(state),
          state.updatedAt || new Date().toISOString(),
        ],
      ]);
    return text_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Run this once from Apps Script if you want to clear the old rows immediately,
// before the first save from the new Kineto app.
function resetForKineto() {
  OLD_DATA_SHEETS.forEach(clearRowsKeepHeader_);
  const stateSheet = getStateSheet_();
  if (stateSheet.getLastRow() > 1)
    stateSheet.getRange(2, 1, stateSheet.getLastRow() - 1, 3).clearContent();
  PropertiesService.getScriptProperties().setProperty(
    "KINETO_LEGACY_CLEARED",
    "true",
  );
}

function clearOldTrackerDataOnce_() {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty("KINETO_LEGACY_CLEARED") === "true") return;
  OLD_DATA_SHEETS.forEach(clearRowsKeepHeader_);
  properties.setProperty("KINETO_LEGACY_CLEARED", "true");
}

function clearRowsKeepHeader_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (sheet && sheet.getLastRow() > 1)
    sheet
      .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .clearContent();
}

function getStateSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(STATE_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(STATE_SHEET_NAME);
  if (sheet.getLastRow() === 0)
    sheet.getRange(1, 1, 1, STATE_HEADERS.length).setValues([STATE_HEADERS]);
  return sheet;
}

function sanitizeState_(value) {
  const source = value && typeof value === "object" ? value : {};
  const rawSelections =
    source.selections && typeof source.selections === "object"
      ? source.selections
      : {};
  const rawCompleted =
    source.completed && typeof source.completed === "object"
      ? source.completed
      : {};
  const selections = {};
  const completed = {};

  Object.keys(rawSelections).forEach(function (key) {
    const workout = rawSelections[key];
    if (
      validTrackerKey_(key) &&
      typeof workout === "string" &&
      workout.length <= 5000
    ) {
      selections[key] = workout;
    }
  });
  Object.keys(rawCompleted).forEach(function (key) {
    if (
      validTrackerKey_(key) &&
      rawCompleted[key] === true &&
      selections[key]
    ) {
      completed[key] = true;
    }
  });

  return {
    schemaVersion: 2,
    selections: selections,
    completed: completed,
    updatedAt: source.updatedAt || new Date().toISOString(),
  };
}

function validTrackerKey_(key) {
  return /^(flexibility|turnout|pirouette|foot-ankle|backbend):week-[1-8]:day-[0-6]$/.test(
    key,
  );
}
function emptyState_() {
  return { schemaVersion: 2, selections: {}, completed: {}, updatedAt: "" };
}
function safeParse_(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}
function isAuthorized_(e) {
  return !TOKEN || (e && e.parameter && e.parameter.token === TOKEN);
}
function text_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
function jsonp_(e, payload) {
  const requested = (e && e.parameter && e.parameter.callback) || "callback";
  const callback = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(requested)
    ? requested
    : "callback";
  return ContentService.createTextOutput(
    callback + "(" + JSON.stringify(payload) + ");",
  ).setMimeType(ContentService.MimeType.JAVASCRIPT);
}
