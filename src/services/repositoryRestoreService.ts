import { storageService } from './storageService';

const workoutDataUrl = 'https://raw.githubusercontent.com/PaulNichols/GymApp/main/data/workout-data.json';

export const restoreWorkoutDataFromRepository = async (): Promise<void> => {
  const response = await fetch(`${workoutDataUrl}?t=${Date.now()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Unable to restore workout history from GitHub (${response.status}).`);
  }

  storageService.restoreFromExportData(await response.json());
};
