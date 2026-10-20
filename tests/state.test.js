import assert from "node:assert/strict";
import test from "node:test";
import {
  DAY_ROUTINES,
  PROGRAMS,
  WORKOUTS,
  workoutLevel,
} from "../src/catalog.js";
import { cycleWeek, PLAN_START } from "../src/dates.js";
import {
  completedInWeek,
  completedOnDay,
  completedWorkoutSessions,
  createEmptyState,
  entryKey,
  getProgramSessions,
  normalizeState,
  latestRelatedSession,
  SCHEMA_VERSION,
  setProgramSessions,
  suggestedRelatedWorkout,
  workoutFamily,
} from "../src/state.js";

test("catalogue preserves program order and workout counts", () => {
  assert.deepEqual(
    PROGRAMS.map(({ id }) => id),
    ["flexibility", "turnout", "pirouette", "foot-ankle", "backbend"],
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(WORKOUTS).map(([id, values]) => [id, values.length]),
    ),
    {
      flexibility: 24,
      turnout: 6,
      pirouette: 10,
      "foot-ankle": 7,
      backbend: 26,
    },
  );
});

test("day routines alternate between the fixed program sets", () => {
  assert.deepEqual(DAY_ROUTINES[1].programs, ["flexibility", "turnout"]);
  assert.deepEqual(DAY_ROUTINES[3].programs, ["flexibility", "turnout"]);
  assert.deepEqual(DAY_ROUTINES[5].programs, ["flexibility", "turnout"]);
  assert.deepEqual(DAY_ROUTINES[0].programs, ["flexibility", "turnout"]);
  assert.deepEqual(DAY_ROUTINES[2].programs, [
    "pirouette",
    "foot-ankle",
    "backbend",
  ]);
  assert.deepEqual(DAY_ROUTINES[4].programs, [
    "pirouette",
    "foot-ankle",
    "backbend",
  ]);
  assert.deepEqual(DAY_ROUTINES[6].programs, [
    "pirouette",
    "foot-ankle",
    "backbend",
  ]);
});

test("new state starts without invented workout assignments", () => {
  assert.deepEqual(createEmptyState(), {
    schemaVersion: SCHEMA_VERSION,
    selections: {},
    completed: {},
    updatedAt: "",
  });
});

test("week, day, and program produce independent keys", () => {
  assert.notEqual(entryKey("flexibility", 1, 3), entryKey("flexibility", 1, 4));
  assert.notEqual(entryKey("flexibility", 1, 3), entryKey("flexibility", 2, 3));
  assert.notEqual(entryKey("flexibility", 1, 3), entryKey("turnout", 1, 3));
});

test("normalization keeps valid selections and rejects unknown workouts", () => {
  const validKey = entryKey("flexibility", 1, 3);
  const invalidKey = entryKey("turnout", 1, 3);
  const state = normalizeState(
    {
      selections: {
        [validKey]: "Front Split Beginner - Workout 1",
        [invalidKey]: "Imaginary workout",
      },
      completed: { [validKey]: true, [invalidKey]: true },
    },
    PROGRAMS,
    WORKOUTS,
  );
  assert.equal(state.selections[validKey], "Front Split Beginner - Workout 1");
  assert.equal(state.completed[validKey], true);
  assert.equal(state.selections[invalidKey], undefined);
  assert.equal(state.completed[invalidKey], undefined);
});

test("legacy completion keys migrate when a matching workout exists", () => {
  const key = entryKey("flexibility", 4, 2);
  const state = normalizeState(
    {
      selections: { [key]: "Pancake Intermediate - Workout 2" },
      completed: { "flexibility:intermediate:week-4:day-2": true },
    },
    PROGRAMS,
    WORKOUTS,
  );
  assert.equal(state.completed[key], true);
});

test("completion totals count programs by day and week", () => {
  const state = createEmptyState();
  setProgramSessions(state, "flexibility", 1, 3, [
    { workout: "Front Split Beginner - Workout 1", completed: true },
  ]);
  setProgramSessions(state, "turnout", 1, 3, [
    { workout: "Week 1 & 2 - Workout 1", completed: true },
  ]);
  setProgramSessions(state, "backbend", 1, 4, [
    { workout: "Beginner - Week 1 & 2, Workout 1", completed: true },
  ]);
  assert.equal(completedOnDay(state, PROGRAMS, 1, 3), 2);
  assert.equal(completedInWeek(state, PROGRAMS, 1), 3);
});

test("cycle dates begin on October 18 and stop at Week 8", () => {
  assert.equal(cycleWeek(new Date(2026, 9, 17)), 1);
  assert.equal(cycleWeek(PLAN_START), 1);
  assert.equal(cycleWeek(new Date(2026, 9, 19)), 1);
  assert.equal(cycleWeek(new Date(2026, 9, 25)), 2);
  assert.equal(cycleWeek(new Date(2027, 0, 1)), 8);
});

test("level badges are derived from workout names", () => {
  assert.equal(workoutLevel("Front Split Advanced - Workout 1"), "advanced");
  assert.equal(workoutLevel("Workout A"), null);
});

test("workout history groups related sessions and suggests the next workout", () => {
  const state = createEmptyState();
  const workout1 = "Pancake Beginner - Workout 1";
  const workout2 = "Pancake Beginner - Workout 2";
  const first = entryKey("flexibility", 1, 1);
  state.selections[first] = workout1;
  state.completed[first] = true;

  assert.equal(workoutFamily(workout1), "Pancake Beginner");
  assert.deepEqual(completedWorkoutSessions(state, "flexibility", workout1), [
    { week: 1, day: 1, key: first, index: 0 },
  ]);
  assert.deepEqual(latestRelatedSession(state, "flexibility", workout2, 1, 3), {
    week: 1,
    day: 1,
    workout: workout1,
  });
  assert.equal(
    suggestedRelatedWorkout(WORKOUTS.flexibility, workout1),
    workout2,
  );
});

test("multiple sessions for the same program and day keep independent completion", () => {
  const state = createEmptyState();
  setProgramSessions(state, "flexibility", 2, 2, [
    { workout: "Hip Mobility Beginner - Workout 2", completed: true },
    { workout: "Hip Mobility Beginner - Workout 1", completed: false },
  ]);
  assert.deepEqual(getProgramSessions(state, "flexibility", 2, 2), [
    { workout: "Hip Mobility Beginner - Workout 2", completed: true },
    { workout: "Hip Mobility Beginner - Workout 1", completed: false },
  ]);
  assert.equal(completedOnDay(state, PROGRAMS, 2, 2), 1);
});
