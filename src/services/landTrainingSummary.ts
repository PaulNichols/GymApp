import type { ExportData, Program, WorkoutEntry } from '../types';

interface SummaryOptions {
  windowDays: number;
  endDate: string;
}

interface NormalizedEntry extends WorkoutEntry {
  completedDate: string;
  numericValue: number | null;
  hasNotes: boolean;
}

const timeZone = 'Australia/Brisbane';

export const buildLandTrainingSummary = (
  data: ExportData,
  options: SummaryOptions = { windowDays: 31, endDate: getTodayInBrisbane() },
) => {
  const expectedDates = getLastNDates(options.windowDays, options.endDate);
  const expectedDateSet = new Set(expectedDates);
  const entries = data.workoutHistory.map(normalizeEntry).filter((entry) => entry.completedDate !== '');
  const entriesInWindow = entries.filter((entry) => expectedDateSet.has(entry.completedDate));
  const exerciseDefinitions = new Map(
    data.programs.flatMap((program) =>
      program.exercises.map((exercise) => [
        exercise.id,
        {
          programName: program.name,
          category: exercise.category,
        },
      ]),
    ),
  );

  return {
    schemaVersion: 1,
    source: 'GymApp repository data',
    sourceExportedAt: data.exportedAt,
    sourceUpdatedAt: getLatestCompletedAt(entries),
    timezone: timeZone,
    window: {
      days: options.windowDays,
      startDate: expectedDates.at(-1) ?? options.endDate,
      endDate: options.endDate,
    },
    totals: {
      programs: data.programs.length,
      exercises: data.programs.reduce((total, program) => total + program.exercises.length, 0),
      totalEntries: entries.length,
      entriesInWindow: entriesInWindow.length,
      sessionsInWindow: summarizeSessions(entriesInWindow).length,
      trainingDaysInWindow: new Set(entriesInWindow.map((entry) => entry.completedDate)).size,
      notesInWindow: entriesInWindow.filter((entry) => entry.hasNotes).length,
    },
    programTotals: summarizeProgramTotals(entries),
    windowProgramTotals: summarizeProgramTotals(entriesInWindow),
    recentSessions: summarizeSessions(entriesInWindow),
    latestExerciseEntries: summarizeLatestExerciseEntries(entries, data.programs, exerciseDefinitions),
    programs: data.programs.map((program) => ({
      id: program.id,
      name: program.name,
      description: program.description,
      exerciseCount: program.exercises.length,
    })),
  };
};

const normalizeEntry = (entry: WorkoutEntry): NormalizedEntry => ({
  ...entry,
  completedDate: entry.completedAt.slice(0, 10),
  numericValue: normalizeNumber(entry.value),
  hasNotes: Boolean(entry.notes?.trim()),
});

const summarizeSessions = (entries: NormalizedEntry[]) =>
  Array.from(groupBy(entries, (entry) => `${entry.completedDate}|${entry.programId}|${entry.programName}`))
    .map(([, sessionEntries]) => {
      const sortedEntries = [...sessionEntries].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
      const firstEntry = sortedEntries[0];

      return {
        date: firstEntry.completedDate,
        programId: firstEntry.programId,
        programName: firstEntry.programName,
        startedAt: firstEntry.completedAt,
        completedAt: sortedEntries.at(-1)?.completedAt ?? firstEntry.completedAt,
        entryCount: sortedEntries.length,
        notesCount: sortedEntries.filter((entry) => entry.hasNotes).length,
        exercises: sortedEntries.map((entry) => ({
          exerciseId: entry.exerciseId,
          exerciseName: entry.exerciseName,
          value: entry.value,
          numericValue: entry.numericValue,
          unit: entry.unit,
          hasNotes: entry.hasNotes,
        })),
      };
    })
    .sort((a, b) => `${b.date}|${b.programName}`.localeCompare(`${a.date}|${a.programName}`));

const summarizeProgramTotals = (entries: NormalizedEntry[]) =>
  Array.from(groupBy(entries, (entry) => entry.programName))
    .map(([programName, programEntries]) => ({
      programName,
      entries: programEntries.length,
      sessions: new Set(programEntries.map((entry) => `${entry.completedDate}|${entry.programId}`)).size,
      trainingDays: new Set(programEntries.map((entry) => entry.completedDate)).size,
      latestCompletedAt: getLatestCompletedAt(programEntries),
    }))
    .sort((a, b) => a.programName.localeCompare(b.programName));

const summarizeLatestExerciseEntries = (
  entries: NormalizedEntry[],
  programs: Program[],
  exerciseDefinitions: Map<string, { programName: string; category: string }>,
) => {
  const latestByExercise = new Map<string, NormalizedEntry>();

  for (const entry of entries) {
    const existing = latestByExercise.get(entry.exerciseId);

    if (!existing || existing.completedAt < entry.completedAt) {
      latestByExercise.set(entry.exerciseId, entry);
    }
  }

  const programOrder = new Map(programs.flatMap((program) => program.exercises.map((exercise, index) => [exercise.id, index])));

  return Array.from(latestByExercise.values())
    .map((entry) => {
      const definition = exerciseDefinitions.get(entry.exerciseId);

      return {
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        programName: entry.programName || definition?.programName || '',
        category: definition?.category ?? '',
        completedAt: entry.completedAt,
        value: entry.value,
        numericValue: entry.numericValue,
        unit: entry.unit,
        hasNotes: entry.hasNotes,
      };
    })
    .sort((a, b) => (programOrder.get(a.exerciseId) ?? 999) - (programOrder.get(b.exerciseId) ?? 999));
};

const getTodayInBrisbane = (): string => {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  return `${getDatePart(parts, 'year')}-${getDatePart(parts, 'month')}-${getDatePart(parts, 'day')}`;
};

const getLastNDates = (days: number, fromDate: string): string[] => {
  const [year, month, day] = fromDate.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  return Array.from({ length: days }, (_, index) => {
    const item = new Date(utcDate);
    item.setUTCDate(utcDate.getUTCDate() - index);

    return item.toISOString().slice(0, 10);
  });
};

const getDatePart = (parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string => {
  const value = parts.find((part) => part.type === type)?.value;

  if (!value) {
    throw new Error(`Unable to format date part: ${type}`);
  }

  return value.padStart(2, '0');
};

const getLatestCompletedAt = (entries: NormalizedEntry[]): string | null => {
  const timestamps = entries.map((entry) => entry.completedAt).filter(Boolean).sort();

  return timestamps.at(-1) ?? null;
};

const groupBy = <T,>(items: T[], keySelector: (item: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = keySelector(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return groups;
};

const normalizeNumber = (value: string): number | null => {
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : null;
};
