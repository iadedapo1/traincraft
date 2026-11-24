export const routines = [
  { name: 'Upper Body Strength', duration: '55 min', focus: 'Push & pull', exercises: [
    { name: 'Barbell Bench Press', sets: 3, minReps: 6, maxReps: 8 },
    { name: 'Dumbbell Row', sets: 3, minReps: 8, maxReps: 12 },
    { name: 'Overhead Press', sets: 3, minReps: 6, maxReps: 8 },
    { name: 'Lat Pulldown', sets: 3, minReps: 10, maxReps: 12 },
    { name: 'Incline Dumbbell Press', sets: 3, minReps: 8, maxReps: 12 },
    { name: 'Cable Triceps Pushdown', sets: 3, minReps: 12, maxReps: 15 },
  ] },
  { name: 'Lower Body Strength', duration: '50 min', focus: 'Legs & core', exercises: [
    { name: 'Barbell Back Squat', sets: 3, minReps: 5, maxReps: 8 },
    { name: 'Romanian Deadlift', sets: 3, minReps: 8, maxReps: 10 },
    { name: 'Walking Lunge', sets: 3, minReps: 10, maxReps: 10, perSide: true },
    { name: 'Standing Calf Raise', sets: 3, minReps: 12, maxReps: 15 },
  ] },
]

export const activity = [
  { name: 'Lower Body Strength', kind: 'strength', date: 'Sat, Nov 21', detail: '48 min · 16 sets' },
  { name: 'Easy Evening Run', kind: 'run', date: 'Fri, Nov 20', detail: '5.2 km · 29:28' },
  { name: 'Upper Body Strength', kind: 'strength', date: 'Wed, Nov 18', detail: '52 min · 18 sets' },
  { name: 'Sunday Long Run', kind: 'run', date: 'Sun, Nov 15', detail: '8.4 km · 50:24' },
] as const
