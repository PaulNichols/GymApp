import type { WorkoutEntry } from '../types';

export const findLatestRecordedEntry = (
  history: WorkoutEntry[],
  exerciseId: string,
  excludedEntryIds: ReadonlySet<string> = new Set(),
): WorkoutEntry | undefined =>
  history
    .filter(
      (entry) =>
        entry.exerciseId === exerciseId &&
        entry.value.trim() !== '' &&
        !excludedEntryIds.has(entry.id) &&
        Number.isFinite(Date.parse(entry.completedAt)),
    )
    .sort((a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt))[0];
