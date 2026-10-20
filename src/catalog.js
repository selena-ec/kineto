export const PROGRAMS = [
  { id: "flexibility", name: "Flexibility", showsLevel: true },
  { id: "turnout", name: "Turnout", showsLevel: false },
  { id: "pirouette", name: "Pirouette", showsLevel: false },
  { id: "foot-ankle", name: "Foot & Ankle", showsLevel: false },
  { id: "backbend", name: "Backbend", showsLevel: true },
];

export const DAY_ROUTINES = {
  0: {
    id: "balance",
    label: "Mobility & turnout",
    programs: ["flexibility", "turnout"],
  },
  1: {
    id: "balance",
    label: "Mobility & turnout",
    programs: ["flexibility", "turnout"],
  },
  2: {
    id: "power",
    label: "Technique & strength",
    programs: ["pirouette", "foot-ankle", "backbend"],
  },
  3: {
    id: "balance",
    label: "Mobility & turnout",
    programs: ["flexibility", "turnout"],
  },
  4: {
    id: "power",
    label: "Technique & strength",
    programs: ["pirouette", "foot-ankle", "backbend"],
  },
  5: {
    id: "balance",
    label: "Mobility & turnout",
    programs: ["flexibility", "turnout"],
  },
  6: {
    id: "power",
    label: "Technique & strength",
    programs: ["pirouette", "foot-ankle", "backbend"],
  },
};

export const WORKOUTS = {
  flexibility: [
    "Hip Mobility Beginner - Workout 1",
    "Hip Mobility Beginner - Workout 2",
    "Hip Mobility Intermediate - Workout 1",
    "Hip Mobility Intermediate - Workout 2",
    "Hip Mobility Advanced - Workout 1",
    "Hip Mobility Advanced - Workout 2",
    "Pancake Beginner - Workout 1",
    "Pancake Beginner - Workout 2",
    "Pancake Intermediate - Workout 1",
    "Pancake Intermediate - Workout 2",
    "Pancake Advanced - Workout 1",
    "Pancake Advanced - Workout 2",
    "Front Split Beginner - Workout 1",
    "Front Split Beginner - Workout 2",
    "Front Split Intermediate - Workout 1",
    "Front Split Intermediate - Workout 2",
    "Front Split Advanced - Workout 1",
    "Front Split Advanced - Workout 2",
    "Middle Split Beginner - Workout 1",
    "Middle Split Beginner - Workout 2",
    "Middle Split Intermediate - Workout 1",
    "Middle Split Intermediate - Workout 2",
    "Middle Split Advanced - Workout 1",
    "Middle Split Advanced - Workout 2",
  ],
  turnout: [
    "Week 1 & 2 - Workout 1",
    "Week 1 & 2 - Workout 2",
    "Week 3 & 4 - Workout 1",
    "Week 3 & 4 - Workout 2",
    "Week 5 & 6 - Workout 1",
    "Week 5 & 6 - Workout 2",
  ],
  pirouette: [
    "Week 1 & 2 - Workout 1",
    "Week 1 & 2 - Workout 2",
    "Week 3 & 4 - Workout 1",
    "Week 3 & 4 - Workout 2",
    "Week 5 & 6 - Workout 1",
    "Week 5 & 6 - Workout 2",
    "Workout A",
    "Workout B",
    "Workout C",
    "Workout D",
  ],
  "foot-ankle": [
    "Week 1 & 2 - Workout 1",
    "Week 1 & 2 - Workout 2",
    "Week 3 & 4 - Workout 1",
    "Week 3 & 4 - Workout 2",
    "Week 5 & 6 - Workout 1",
    "Week 5 & 6 - Workout 2",
    "Pre-Pointe Foundations Plan Booster",
  ],
  backbend: [
    "Beginner - Week 1 & 2, Workout 1",
    "Beginner - Week 1 & 2, Workout 2",
    "Beginner - Week 3 & 4, Workout 1",
    "Beginner - Week 3 & 4, Workout 2",
    "Beginner - Week 5 & 6, Workout 1",
    "Beginner - Week 5 & 6, Workout 2",
    "Intermediate - Week 1 & 2, Workout 1",
    "Intermediate - Week 1 & 2, Workout 2",
    "Intermediate - Week 3 & 4, Workout 1",
    "Intermediate - Week 3 & 4, Workout 2",
    "Intermediate - Week 5 & 6, Workout 1",
    "Intermediate - Week 5 & 6, Workout 2",
    "Advanced - Week 1 & 2, Workout 1",
    "Advanced - Week 1 & 2, Workout 2",
    "Advanced - Week 1 & 2, Workout 3",
    "Advanced - Week 3 & 4, Workout 1",
    "Advanced - Week 3 & 4, Workout 2",
    "Advanced - Week 3 & 4, Workout 3",
    "Advanced - Week 5 & 6, Workout 1",
    "Advanced - Week 5 & 6, Workout 2",
    "Advanced - Week 5 & 6, Workout 3",
    '"The Needle" Training Plan - Workout A',
    '"The Needle" Training Plan - Workout B',
    '"The Needle" Training Plan - Workout C',
    "Wrist Mobility & Strength - Workout A",
    "Wrist Mobility & Strength - Workout B",
  ],
};

export function workoutLevel(workout) {
  if (!workout) return null;
  return (
    ["beginner", "intermediate", "advanced"].find((level) =>
      workout.toLowerCase().includes(level),
    ) ?? null
  );
}
