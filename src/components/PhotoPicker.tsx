import type { FoodPhoto } from '../models/foodLog';
import { compressPhoto } from '../services/photoCompression';

interface PhotoPickerProps {
  label: string;
  path: string;
  onPhotoSelected: (photo: FoodPhoto) => void;
  onError: (message: string) => void;
}

export function PhotoPicker({ label, path, onPhotoSelected, onError }: PhotoPickerProps) {
  const handleChange = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    try {
      onPhotoSelected(await compressPhoto(file, path));
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Photo compression failed.');
    }
  };

  return (
    <label className="field file-field">
      <span>{label}</span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => void handleChange(event.target.files?.[0])}
      />
    </label>
  );
}
