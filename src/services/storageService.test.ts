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

  it('adds only the new flexibility exercises to programs on the previous migration', () => {
    const programs = structuredClone(defaultPrograms);
    const programA = programs.find((program) => program.id === 'program-a');
    const flexibility = programs.find((program) => program.id === 'flexibility');

    if (!programA || !flexibility) {
      throw new Error('Expected default programs were not found.');
    }

    programA.exercises = programA.exercises.filter((exercise) => exercise.id !== 'assisted-chin-up');
    flexibility.exercises = flexibility.exercises.filter(
      (exercise) => exercise.id !== 'bird-dog' && exercise.id !== 'glute-bridge',
    );
    localStorage.setItem('swimGymTracker.programs', JSON.stringify(programs));
    localStorage.setItem('swimGymTracker.programMigration', '2026-07-leg-extension');

    const migrated = storageService.getPrograms();
    const migratedProgramA = migrated.find((program) => program.id === 'program-a');
    const migratedFlexibility = migrated.find((program) => program.id === 'flexibility');

    expect(migratedProgramA?.exercises.some((exercise) => exercise.id === 'assisted-chin-up')).toBe(false);
    expect(migratedFlexibility?.exercises.map((exercise) => exercise.id)).toEqual(
      expect.arrayContaining(['bird-dog', 'glute-bridge']),
    );
    expect(localStorage.getItem('swimGymTracker.programMigration')).toBe('2026-09-flexibility-additions');
  });
});
