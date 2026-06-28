import JSZip from 'jszip';
import type { FoodLogDay, FoodPhoto } from '../models/foodLog';
import type { LocalFoodLogRepository } from '../repositories/LocalFoodLogRepository';
import { getFoodLogJsonPath, getLastNDates } from './dateService';

export const exportCurrentDay = async (day: FoodLogDay, photos: FoodPhoto[]): Promise<void> => {
  const zip = new JSZip();

  addDay(zip, day);

  for (const photo of photos) {
    zip.file(photo.path, photo.blob);
  }

  await downloadZip(zip, `food-log-${day.date}.zip`);
};

export const exportLast7Days = async (repository: LocalFoodLogRepository): Promise<void> => {
  const zip = new JSZip();
  const dates = getLastNDates(7);
  const days = await Promise.all(dates.map((date) => repository.getDay(date)));

  for (const day of days) {
    if (!day) {
      continue;
    }

    addDay(zip, day);

    const photoPaths = [
      ...day.meals.map((meal) => meal.photoPath),
      ...day.snacks.map((snack) => snack.photoPath),
    ].filter((path): path is string => Boolean(path));

    for (const path of photoPaths) {
      const photo = await repository.getPhoto(path);

      if (photo) {
        zip.file(photo.path, photo.blob);
      }
    }
  }

  await downloadZip(zip, 'food-log-last-7-days.zip');
};

const addDay = (zip: JSZip, day: FoodLogDay): void => {
  zip.file(getFoodLogJsonPath(day.date), JSON.stringify(day, null, 2));
};

const downloadZip = async (zip: JSZip, filename: string): Promise<void> => {
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
