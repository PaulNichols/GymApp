import type { FoodPhoto } from '../models/foodLog';

const MAX_WIDTH = 1024;
const QUALITY = 0.75;

export const compressPhoto = async (file: File, path: string): Promise<FoodPhoto> => {
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_WIDTH / image.naturalWidth);
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('This browser could not prepare the image for saving.');
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const webpBlob = await canvasToBlob(canvas, 'image/webp', QUALITY);

  if (webpBlob) {
    return { path, blob: webpBlob, contentType: 'image/webp' };
  }

  const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', QUALITY);

  if (!jpegBlob) {
    throw new Error('This browser could not compress the selected photo.');
  }

  return { path: path.replace(/\.webp$/, '.jpg'), blob: jpegBlob, contentType: 'image/jpeg' };
};

export const createObjectUrl = (photo: FoodPhoto): string => URL.createObjectURL(photo.blob);

const loadImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unable to load the selected photo.'));
    };
    image.src = url;
  });

const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));
