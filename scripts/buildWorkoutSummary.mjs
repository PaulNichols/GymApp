import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const dataPath = path.join(repoRoot, 'data', 'workout-data.json');
const summaryPath = path.join(repoRoot, 'data', 'codex-land-training-summary.json');
const windowDays = normalizePositiveInteger(process.env.WORKOUT_SUMMARY_DAYS, 31);
const endDate = process.env.WORKOUT_SUMMARY_END_DATE?.trim() || getTodayInBrisbane();

if (!existsSync(dataPath)) {
  console.log('No data/workout-data.json found; nothing to summarise.');
  process.exit(0);
}

const data = JSON.parse(await readFile(dataPath, 'utf8'));
const summary = buildLandTrainingSummary(data, { windowDays, endDate });

await mkdir(path.dirname(summaryPath), { recursive: true });
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

console.log(
  `Workout summary complete. Wrote ${path.relative(repoRoot, summaryPath)} for ${summary.totals.totalEntries} entr${
    summary.totals.totalEntries === 1 ? 'y' : 'ies'
  }.`,
);

function buildLandTrainingSummary(data, options) {
  const programs = Array.isArray(data.programs) ? data.programs : [];
  const history = Array.isArray(data.workoutHistory) ? data.workoutHistory : [];
  const expectedDates = getLastNDates(options.windowDays, options.endDate);
  const expectedDateSet = new Set(expectedDates);
  const entries = history.map(normalizeEntry).filter((entry) => entry.completedDate !== '');
  const entriesInWindow = entries.filter((entry) => expectedDateSet.has(entry.completedDate));
  const sessions = Array.from(groupBy(entriesInWindow, (entry) => `${entry.completedDate}|${entry.programId}|${entry.programName}`))
    .map(([, sessionEntries]) => summarizeSession(sessionEntries))
    .sort((a, b) => `${b.date}|${b.programName}`.localeCompare(`${a.date}|${a.programName}`));

  const exerciseDefinitions = new Map(
    programs.flatMap((program) =>
      (program.exercises ?? []).map((exercise) => [
        exercise.id,
        {
          id: exercise.id,
          name: exercise.name,
          programId: program.id,
          programName: program.name,
          category: exercise.category,
          unit: exercise.unit,
        },
      ]),
    ),
  );

  return {
    schemaVersion: 1,
    source: 'GymApp repository data',
    sourceExportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : null,
    sourceUpdatedAt: getLatestCompletedAt(entries),
    timezone: 'Australia/Brisbane',
    window: {
      days: options.windowDays,
      startDate: expectedDates.at(-1) ?? options.endDate,
      endDate: options.endDate,
    },
    totals: {
      programs: programs.length,
      exercises: programs.reduce((total, program) => total + (program.exercises?.length ?? 0), 0),
      totalEntries: entries.length,
      entriesInWindow: entriesInWindow.length,
      sessionsInWindow: sessions.length,
      trainingDaysInWindow: new Set(entriesInWindow.map((entry) => entry.completedDate)).size,
      notesInWindow: entriesInWindow.filter((entry) => entry.hasNotes).length,
    },
    programTotals: summarizeProgramTotals(entries),
    windowProgramTotals: summarizeProgramTotals(entriesInWindow),
    recentSessions: sessions,
    latestExerciseEntries: summarizeLatestExerciseEntries(entries, exerciseDefinitions),
    programs: programs.map((program) => ({
      id: normalizeString(program.id),
      name: normalizeString(program.name),
      description: normalizeString(program.description),
      exerciseCount: Array.isArray(program.exercises) ? program.exercises.length : 0,
    })),
  };
}

function normalizeEntry(entry) {
  const completedAt = normalizeString(entry.completedAt);

  return {
    id: normalizeString(entry.id),
    exerciseId: normalizeString(entry.exerciseId),
    exerciseName: normalizeString(entry.exerciseName),
    programId: normalizeString(entry.programId),
    programName: normalizeString(entry.programName),
    equipment: normalizeString(entry.equipment),
    completedAt,
    completedDate: completedAt.slice(0, 10),
    value: normalizeString(entry.value),
    numericValue: normalizeNumber(entry.value),
    unit: normalizeString(entry.unit),
    hasNotes: hasText(entry.notes),
  };
}

function summarizeSession(entries) {
  const sortedEntries = [...entries].sort((a, b) => a.completedAt.localeCompare(b.completedAt));
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
}

function summarizeProgramTotals(entries) {
  return Array.from(groupBy(entries, (entry) => entry.programName))
    .map(([programName, programEntries]) => ({
      programName,
      entries: programEntries.length,
      sessions: new Set(programEntries.map((entry) => `${entry.completedDate}|${entry.programId}`)).size,
      trainingDays: new Set(programEntries.map((entry) => entry.completedDate)).size,
      latestCompletedAt: getLatestCompletedAt(programEntries),
    }))
    .sort((a, b) => a.programName.localeCompare(b.programName));
}

function summarizeLatestExerciseEntries(entries, exerciseDefinitions) {
  const latestByExercise = new Map();

  for (const entry of entries) {
    const existing = latestByExercise.get(entry.exerciseId);

    if (!existing || existing.completedAt < entry.completedAt) {
      latestByExercise.set(entry.exerciseId, entry);
    }
  }

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
    .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
}

function getTodayInBrisbane() {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  return `${getDatePart(parts, 'year')}-${getDatePart(parts, 'month')}-${getDatePart(parts, 'day')}`;
}

function getLastNDates(days, fromDate) {
  const [year, month, day] = fromDate.split('-').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day));

  return Array.from({ length: days }, (_, index) => {
    const item = new Date(utcDate);
    item.setUTCDate(utcDate.getUTCDate() - index);

    return item.toISOString().slice(0, 10);
  });
}

function getDatePart(parts, type) {
  const value = parts.find((part) => part.type === type)?.value;

  if (!value) {
    throw new Error(`Unable to format date part: ${type}`);
  }

  return value.padStart(2, '0');
}

function getLatestCompletedAt(entries) {
  const timestamps = entries.map((entry) => entry.completedAt).filter(Boolean).sort();

  return timestamps.at(-1) ?? null;
}

function groupBy(items, keySelector) {
  const groups = new Map();

  for (const item of items) {
    const key = keySelector(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return groups;
}

function normalizePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeNumber(value) {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const parsed = Number.parseFloat(String(value));

  return Number.isFinite(parsed) ? parsed : null;
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
