import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultPrograms } from '../data/defaultPrograms';
import { storageService } from './storageService';

const values = new Map<string, string>();
const localStorageStub: Storage = {
  get length() {
    return values.size;
  },
  clear: () => values.clear(),
  getItem: (key) => values.get(key) ?? null,
  key: (index) => [...values.keys()][index] ?? null,
  removeItem: (key) => values.delete(key),
  setItem: (key, value) => values.set(key, value),
};

describe('storageService program migrations', () => {
  beforeEach(() => {
    values.clear();
    vi.stubGlobal('localStorage', localStorageStub);
  });

  it('adds the September and October exercises to July programs without restoring other deleted exercises', () => {
    const programs = structuredClone(defaultPrograms);
    const programA = programs.find((program) => program.id === 'program-a');
    const flexibility = programs.find((program) => program.id === 'flexibility');

    if (!programA || !flexibility) {
      throw new Error('Expected default programs were not found.');
    }

    programA.exercises = programA.exercises.filter((exercise) => exercise.id !== 'assisted-chin-up');
    flexibility.exercises = flexibility.exercises.filter(
      (exercise) => !['bird-dog', 'glute-bridge', 'seated-chest-opener', 'cross-body-shoulder-stretch', 'seated-upper-back-twist'].includes(exercise.id),
    );
    localStorage.setItem('swimGymTracker.programs', JSON.stringify(programs));
    localStorage.setItem('swimGymTracker.programMigration', '2026-07-leg-extension');

    const migrated = storageService.getPrograms();
    const migratedProgramA = migrated.find((program) => program.id === 'program-a');
    const migratedFlexibility = migrated.find((program) => program.id === 'flexibility');

    expect(migratedProgramA?.exercises.some((exercise) => exercise.id === 'assisted-chin-up')).toBe(false);
    expect(migratedFlexibility?.exercises.map((exercise) => exercise.id)).toEqual(
      expect.arrayContaining(['bird-dog', 'glute-bridge', 'seated-chest-opener', 'cross-body-shoulder-stretch', 'seated-upper-back-twist']),
    );
    expect(localStorage.getItem('swimGymTracker.programMigration')).toBe('2026-10-upper-body-flexibility');
  });

  it('appends only the upper-body stretches to September routines and preserves edits, order, deletions, and history', () => {
    const programs = structuredClone(defaultPrograms);
    const flexibility = programs.find((program) => program.id === 'flexibility')!;
    flexibility.exercises = flexibility.exercises.filter(
      (exercise) => !['bird-dog', 'seated-chest-opener', 'cross-body-shoulder-stretch', 'seated-upper-back-twist'].includes(exercise.id),
    ).reverse();
    flexibility.name = 'My flexibility';
    flexibility.trainingNote = 'My own routine note';
    flexibility.exercises[0].guideCues = ['My own form cue'];
    flexibility.exercises.push({ id: 'custom-stretch', name: 'My stretch', equipment: 'chair', unit: 'seconds', category: 'mobility' });
    const previousExercises = structuredClone(flexibility.exercises);
    const history = [{ id: 'saved-entry', exerciseId: 'bird-dog', exerciseName: 'Bird dog', programId: 'flexibility', programName: 'Flexibility', equipment: 'mat', completedAt: '2026-09-01T09:00:00Z', value: '6', unit: 'reps each side' }];
    storageService.savePrograms(programs);
    storageService.saveWorkoutHistory(history);
    localStorage.setItem('swimGymTracker.programMigration', '2026-09-flexibility-additions');

    const migrated = storageService.getPrograms();
    const updated = migrated.find((program) => program.id === 'flexibility')!;
    expect(migrated.filter((program) => program.id !== 'flexibility')).toEqual(programs.filter((program) => program.id !== 'flexibility'));
    expect(updated.name).toBe('My flexibility');
    expect(updated.trainingNote).toBe('My own routine note');
    expect(updated.exercises.slice(0, previousExercises.length)).toEqual(previousExercises);
    expect(updated.exercises.slice(previousExercises.length).map((exercise) => exercise.id)).toEqual([
      'seated-chest-opener', 'cross-body-shoulder-stretch', 'seated-upper-back-twist',
    ]);
    expect(storageService.getWorkoutHistory()).toEqual(history);
    expect(storageService.getPrograms()).toEqual(migrated);

    // Removing a new stretch after the one-time update must remain a user choice.
    updated.exercises = updated.exercises.filter((exercise) => exercise.id !== 'seated-chest-opener');
    storageService.savePrograms(migrated);
    expect(storageService.getPrograms().find((program) => program.id === 'flexibility')?.exercises).toEqual(updated.exercises);
  });

  it('keeps an already-present stretch and its custom instructions without duplicating it', () => {
    const programs = structuredClone(defaultPrograms);
    const flexibility = programs.find((program) => program.id === 'flexibility')!;
    flexibility.exercises = flexibility.exercises.filter((exercise) => exercise.id !== 'seated-upper-back-twist');
    const shoulder = flexibility.exercises.find((exercise) => exercise.id === 'cross-body-shoulder-stretch')!;
    shoulder.guideCues = ['My comfortable range'];
    storageService.savePrograms(programs);
    localStorage.setItem('swimGymTracker.programMigration', '2026-09-flexibility-additions');

    const exercises = storageService.getPrograms().find((program) => program.id === 'flexibility')!.exercises;
    expect(exercises.filter((exercise) => exercise.id === shoulder.id)).toEqual([shoulder]);
    expect(exercises.filter((exercise) => exercise.id === 'seated-upper-back-twist')).toHaveLength(1);
  });
});
