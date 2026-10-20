export const SCHEMA_VERSION = 2;
export const STORAGE_KEY = "kineto.tracker.v1";

export function createEmptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    selections: {},
    completed: {},
    updatedAt: "",
  };
}

export function entryKey(programId, week, day) {
  return `${programId}:week-${week}:day-${day}`;
}

export function normalizeState(value, programs, workouts) {
  const normalized = createEmptyState();
  if (!value || typeof value !== "object") return normalized;

  if (value.selections && typeof value.selections === "object") {
    for (const program of programs) {
      for (let week = 1; week <= 8; week += 1) {
        for (let day = 0; day < 7; day += 1) {
          const key = entryKey(program.id, week, day);
          const selection = value.selections[key];
          if (validStoredSelection(selection, workouts[program.id])) {
            normalized.selections[key] = selection;
          }
        }
      }
    }
  }

  if (value.completed && typeof value.completed === "object") {
    for (const [legacyKey, done] of Object.entries(value.completed)) {
      if (!done) continue;
      const match = legacyKey.match(
        /^([^:]+):(?:[^:]+:)?week-(\d+):day-(\d+)$/,
      );
      if (!match) continue;
      const key = entryKey(match[1], Number(match[2]), Number(match[3]));
      if (normalized.selections[key]) normalized.completed[key] = true;
    }
  }

  if (typeof value.updatedAt === "string") {
    normalized.updatedAt = value.updatedAt;
  }
  return normalized;
}

function validStoredSelection(selection, allowedWorkouts) {
  if (allowedWorkouts.includes(selection)) return true;
  if (typeof selection !== "string" || !selection.startsWith("!")) return false;
  try {
    const sessions = JSON.parse(selection.slice(1));
    return (
      Array.isArray(sessions) &&
      sessions.length > 0 &&
      sessions.every(
        (session) =>
          Array.isArray(session) &&
          allowedWorkouts.includes(session[0]) &&
          (session[1] === 0 || session[1] === 1),
      )
    );
  } catch {
    return false;
  }
}

export function completedOnDay(state, programs, week, day) {
  return programs.reduce(
    (total, program) =>
      total +
      getProgramSessions(state, program.id, week, day).filter(
        (session) => session.completed,
      ).length,
    0,
  );
}

export function completedInWeek(state, programs, week) {
  return Array.from({ length: 7 }, (_, day) =>
    completedOnDay(state, programs, week, day),
  ).reduce((sum, count) => sum + count, 0);
}

export function workoutFamily(workout) {
  return workout.replace(/\s*[-,]\s*workout\s+(?:\d+|[a-z])$/i, "").trim();
}

export function completedWorkoutSessions(state, programId, workout) {
  const sessions = [];
  for (let week = 1; week <= 8; week += 1) {
    for (let day = 0; day < 7; day += 1) {
      const key = entryKey(programId, week, day);
      getProgramSessions(state, programId, week, day).forEach(
        (session, index) => {
          if (session.completed && session.workout === workout) {
            sessions.push({ week, day, key, index });
          }
        },
      );
    }
  }
  return sessions;
}

export function latestRelatedSession(
  state,
  programId,
  workout,
  currentWeek,
  currentDay,
  currentIndex = Infinity,
) {
  const family = workoutFamily(workout);
  let latest = null;
  for (let week = 1; week <= 8; week += 1) {
    for (let day = 0; day < 7; day += 1) {
      if (week > currentWeek || (week === currentWeek && day > currentDay)) {
        continue;
      }
      getProgramSessions(state, programId, week, day).forEach(
        (session, index) => {
          if (
            week === currentWeek &&
            day === currentDay &&
            index >= currentIndex
          )
            return;
          if (session.completed && workoutFamily(session.workout) === family) {
            latest = { week, day, workout: session.workout };
          }
        },
      );
    }
  }
  return latest;
}

export function getProgramSessions(state, programId, week, day) {
  const key = entryKey(programId, week, day);
  const stored = state.selections[key];
  if (!stored) return [];
  if (typeof stored === "string" && stored.startsWith("!")) {
    try {
      return JSON.parse(stored.slice(1)).map(([workout, completed]) => ({
        workout,
        completed: Boolean(completed),
      }));
    } catch {
      return [];
    }
  }
  return [{ workout: stored, completed: Boolean(state.completed[key]) }];
}

export function setProgramSessions(state, programId, week, day, sessions) {
  const key = entryKey(programId, week, day);
  const cleaned = sessions.filter((session) => session.workout);
  if (!cleaned.length) {
    delete state.selections[key];
    delete state.completed[key];
    return;
  }
  state.selections[key] = `!${JSON.stringify(
    cleaned.map((session) => [session.workout, session.completed ? 1 : 0]),
  )}`;
  if (cleaned.some((session) => session.completed)) state.completed[key] = true;
  else delete state.completed[key];
}

export function suggestedRelatedWorkout(workouts, lastWorkout) {
  if (!lastWorkout) return null;
  const family = workoutFamily(lastWorkout);
  const related = workouts.filter(
    (workout) => workoutFamily(workout) === family,
  );
  if (related.length < 2) return null;
  const index = related.indexOf(lastWorkout);
  return related[(index + 1) % related.length] || null;
}
