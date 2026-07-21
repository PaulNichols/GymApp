import { describe, expect, it } from 'vitest';
import type { WorkoutEntry } from '../types';
import { findLatestRecordedEntry } from './workoutHistory';

const entry = (overrides: Partial<WorkoutEntry>): WorkoutEntry => ({
  id: 'entry-default',
  exerciseId: 'leg-press',
  exerciseName: 'Leg press',
  programId: 'program-a',
  programName: 'Program A',
  equipment: 'Leg press machine',
  completedAt: '2026-07-01T08:00:00.000Z',
  value: '75',
  unit: 'kg',
  ...overrides,
});

describe('findLatestRecordedEntry', () => {
  it('returns the newest nonblank value for the exercise', () => {
    const history = [
      entry({ id: 'recorded', value: '75' }),
      entry({ id: 'skipped', completedAt: '2026-07-14T08:00:00.000Z', value: '', notes: 'Skip' }),
      entry({ id: 'other', exerciseId: 'kettlebell-swing', completedAt: '2026-07-15T08:00:00.000Z', value: '14' }),
    ];

    expect(findLatestRecordedEntry(history, 'leg-press')?.id).toBe('recorded');
  });

  it('excludes entries saved during the workout in progress', () => {
    const history = [
      entry({ id: 'previous', value: '75' }),
      entry({ id: 'current', completedAt: '2026-07-22T08:00:00.000Z', value: '80', notes: 'Today' }),
    ];

    expect(findLatestRecordedEntry(history, 'leg-press', new Set(['current']))).toMatchObject({
      id: 'previous',
      value: '75',
    });
  });

  it('returns the note belonging to the displayed value', () => {
    const history = [
      entry({ id: 'older', completedAt: '2026-06-01T08:00:00.000Z', value: '70', notes: 'Older note' }),
      entry({ id: 'latest', value: '75', notes: 'Good depth' }),
    ];

    expect(findLatestRecordedEntry(history, 'leg-press')).toMatchObject({
      value: '75',
      notes: 'Good depth',
    });
  });
});
