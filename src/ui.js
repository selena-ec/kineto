import { DAY_ROUTINES, workoutLevel } from "./catalog.js";
import { DAYS, PLAN_WEEKS } from "./dates.js";
import {
  completedInWeek,
  completedOnDay,
  completedWorkoutSessions,
  getProgramSessions,
  latestRelatedSession,
  setProgramSessions,
  suggestedRelatedWorkout,
} from "./state.js";

export function createTrackerView({
  programs,
  workouts,
  store,
  onStateChanged,
  initialWeek,
}) {
  const weekList = document.querySelector("#weekList");
  const weekTemplate = document.querySelector("#weekTemplate");
  const programTemplate = document.querySelector("#programRowTemplate");
  const sessionTemplate = document.querySelector("#sessionRowTemplate");
  const selectedDays = Object.fromEntries(
    Array.from({ length: PLAN_WEEKS }, (_, index) => [
      index + 1,
      index + 1 === initialWeek ? new Date().getDay() : 0,
    ]),
  );
  const openHistories = new Set();
  const draftRows = new Map();
  let openWeek = initialWeek;

  function render() {
    weekList.replaceChildren();
    for (let week = 1; week <= PLAN_WEEKS; week += 1) renderWeek(week);
    document.querySelector("#weekCompleted").textContent = completedInWeek(
      store.get(),
      programs,
      openWeek || initialWeek,
    );
  }

  function renderWeek(week) {
    const fragment = weekTemplate.content.cloneNode(true);
    const panel = fragment.querySelector(".week-panel");
    const toggle = fragment.querySelector("[data-week-toggle]");
    const content = fragment.querySelector("[data-week-content]");
    const day = selectedDays[week];
    const expanded = week === openWeek;
    fragment.querySelector("[data-week-number]").textContent = week;
    fragment.querySelector("[data-week-count]").textContent =
      `${completedInWeek(store.get(), programs, week)} sessions done`;
    toggle.setAttribute("aria-expanded", String(expanded));
    content.hidden = !expanded;
    panel.classList.toggle("is-open", expanded);
    toggle.addEventListener("click", () => {
      openWeek = expanded ? 0 : week;
      render();
    });
    if (expanded) renderWeekContent(fragment, week, day);
    weekList.append(fragment);
  }

  function renderWeekContent(fragment, week, day) {
    const routine = DAY_ROUTINES[day];
    fragment
      .querySelector("[data-week-content]")
      .classList.add(`routine-${routine.id}`);
    const tabs = fragment.querySelector("[data-day-tabs]");
    for (const [index, name] of DAYS.entries()) {
      const dayRoutine = DAY_ROUTINES[index];
      const button = document.createElement("button");
      const label = document.createElement("span");
      const count = document.createElement("small");
      button.type = "button";
      button.className = `day-tab routine-${dayRoutine.id}`;
      button.setAttribute("aria-pressed", String(day === index));
      label.textContent = name.slice(0, 3);
      count.textContent = `${completedOnDay(store.get(), programs, week, index)} done`;
      button.append(label, count);
      button.classList.toggle("is-selected", day === index);
      button.addEventListener("click", () => {
        selectedDays[week] = index;
        render();
      });
      tabs.append(button);
    }

    const banner = fragment.querySelector("[data-day-banner]");
    banner.classList.add(`routine-${routine.id}`);
    fragment.querySelector("[data-selected-day]").textContent = DAYS[day];
    fragment.querySelector("[data-routine-name]").textContent = routine.label;
    fragment.querySelector("[data-workout-heading]").textContent =
      `${routine.programs.length} scheduled programs`;
    const rows = fragment.querySelector("[data-program-rows]");
    routine.programs.forEach((programId) => {
      const program = programs.find((item) => item.id === programId);
      rows.append(buildProgramCard(program, week, day, routine.id));
    });
  }

  function buildProgramCard(program, week, day, routineId) {
    const fragment = programTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".program-row");
    const sessionList = fragment.querySelector("[data-session-list]");
    const history = fragment.querySelector("[data-workout-history]");
    const historyButton = fragment.querySelector("[data-history-toggle]");
    const sessions = getProgramSessions(store.get(), program.id, week, day);
    const draftKey = `${program.id}:${week}:${day}`;
    const draftCount = draftRows.get(draftKey) || 0;
    const visibleCount = Math.max(1, sessions.length + draftCount);

    card.classList.add(`routine-${routineId}`);
    fragment.querySelector("[data-program-number]").textContent = programNumber(
      program.id,
    );
    fragment.querySelector("[data-program-name]").textContent = program.name;
    for (let index = 0; index < visibleCount; index += 1) {
      sessionList.append(
        buildSessionRow(program, week, day, index, sessions[index] || null),
      );
    }

    fragment
      .querySelector("[data-add-session]")
      .addEventListener("click", () => {
        draftRows.set(draftKey, draftCount + 1);
        render();
      });

    const historyKey = `${program.id}:${week}:${day}`;
    const historyIsOpen = openHistories.has(historyKey);
    history.hidden = !historyIsOpen;
    historyButton.setAttribute("aria-expanded", String(historyIsOpen));
    historyButton.textContent = historyIsOpen ? "Hide history" : "View history";
    if (historyIsOpen) renderWorkoutHistory(history, program);
    historyButton.addEventListener("click", () => {
      if (historyIsOpen) openHistories.delete(historyKey);
      else openHistories.add(historyKey);
      render();
    });
    return fragment;
  }

  function buildSessionRow(program, week, day, index, session) {
    const fragment = sessionTemplate.content.cloneNode(true);
    const select = fragment.querySelector("[data-workout-select]");
    const checkbox = fragment.querySelector("[data-complete]");
    const removeButton = fragment.querySelector("[data-remove-session]");
    const levelPill = fragment.querySelector("[data-level]");
    const context = fragment.querySelector("[data-workout-context]");
    const selectedWorkout = session?.workout || "";

    fragment.querySelector("[data-session-number]").textContent =
      `Session ${index + 1}`;
    workouts[program.id].forEach((name) => select.add(new Option(name, name)));
    select.value = selectedWorkout;
    select.setAttribute(
      "aria-label",
      `${program.name} session ${index + 1} for ${DAYS[day]}`,
    );
    showLevel(levelPill, program, selectedWorkout);
    renderWorkoutContext(context, program, selectedWorkout, week, day, index);
    select.addEventListener("change", () => {
      updateSession(program.id, week, day, index, {
        workout: select.value,
        completed: false,
      });
    });

    checkbox.checked = Boolean(session?.completed);
    checkbox.disabled = !selectedWorkout;
    fragment.querySelector("[data-complete-label]").textContent =
      `Mark ${program.name} session ${index + 1} complete for ${DAYS[day]}`;
    checkbox.addEventListener("change", () => {
      updateSession(program.id, week, day, index, {
        workout: selectedWorkout,
        completed: checkbox.checked,
      });
    });

    removeButton.hidden = index === 0 && !selectedWorkout;
    removeButton.setAttribute(
      "aria-label",
      `Remove ${program.name} session ${index + 1}`,
    );
    removeButton.addEventListener("click", () => {
      const current = getProgramSessions(store.get(), program.id, week, day);
      if (index < current.length) current.splice(index, 1);
      const draftKey = `${program.id}:${week}:${day}`;
      draftRows.set(draftKey, Math.max(0, (draftRows.get(draftKey) || 0) - 1));
      store.update((state) =>
        setProgramSessions(state, program.id, week, day, current),
      );
      onStateChanged();
    });
    return fragment;
  }

  function updateSession(programId, week, day, index, nextSession) {
    const sessions = getProgramSessions(store.get(), programId, week, day);
    while (sessions.length <= index)
      sessions.push({ workout: "", completed: false });
    sessions[index] = nextSession;
    draftRows.set(`${programId}:${week}:${day}`, 0);
    store.update((state) =>
      setProgramSessions(state, programId, week, day, sessions),
    );
    onStateChanged();
  }

  function renderWorkoutContext(context, program, workout, week, day, index) {
    context.hidden = !workout;
    if (!workout) return;
    const latest = latestRelatedSession(
      store.get(),
      program.id,
      workout,
      week,
      day,
      index,
    );
    const last = context.querySelector("[data-last-session]");
    const suggestion = context.querySelector("[data-suggestion]");
    if (!latest) {
      last.textContent = "First completed session of this workout type.";
      suggestion.hidden = true;
      return;
    }
    last.textContent = `Last: ${workoutPart(latest.workout)} · Week ${latest.week}, ${DAYS[latest.day]}`;
    const next = suggestedRelatedWorkout(workouts[program.id], latest.workout);
    suggestion.hidden = !next;
    if (next) suggestion.textContent = `Suggested next: ${workoutPart(next)}`;
  }

  function renderWorkoutHistory(container, program) {
    container.replaceChildren();
    const heading = document.createElement("div");
    heading.className = "history-grid history-heading";
    heading.append(historyCell("Workout"));
    for (let week = 1; week <= PLAN_WEEKS; week += 1)
      heading.append(historyCell(`W${week}`));
    heading.append(historyCell("Total"));
    container.append(heading);
    workouts[program.id].forEach((workout) => {
      const sessions = completedWorkoutSessions(
        store.get(),
        program.id,
        workout,
      );
      const row = document.createElement("div");
      row.className = "history-grid history-row";
      row.append(historyCell(workout, "history-workout-name"));
      for (let week = 1; week <= PLAN_WEEKS; week += 1) {
        const count = sessions.filter((item) => item.week === week).length;
        const cell = historyCell(
          count ? String(count) : "·",
          count ? "has-session" : "",
        );
        cell.setAttribute(
          "aria-label",
          count ? `${count} completed in Week ${week}` : `None in Week ${week}`,
        );
        row.append(cell);
      }
      row.append(historyCell(String(sessions.length), "history-total"));
      container.append(row);
    });
  }

  return { render };
}

function programNumber(programId) {
  return {
    flexibility: 1,
    turnout: 2,
    pirouette: 3,
    "foot-ankle": 4,
    backbend: 5,
  }[programId];
}

function historyCell(text, className = "") {
  const span = document.createElement("span");
  span.textContent = text;
  if (className) span.className = className;
  return span;
}

function workoutPart(workout) {
  return workout.match(/workout\s+(?:\d+|[a-z])$/i)?.[0] || workout;
}

function showLevel(pill, program, workout) {
  const level = program.showsLevel ? workoutLevel(workout) : null;
  pill.hidden = !level;
  if (level) pill.textContent = level[0].toUpperCase() + level.slice(1);
}
