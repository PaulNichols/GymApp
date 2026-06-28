import { useRef, useState } from 'react';
import { syncCurrentLandTrainingDataToGitHub } from '../services/githubSyncService';
import { storageService } from '../services/storageService';

interface ExportImportPanelProps {
  onImported: () => void;
}

export function ExportImportPanel({ onImported }: ExportImportPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const exportData = () => {
    const data = storageService.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `swim-gym-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage('Export downloaded.');
  };

  const importData = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    const confirmed = window.confirm('Importing replaces your current programs and history. Continue?');
    if (!confirmed) {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const imported = storageService.importData(parsed);
      setMessage(imported ? 'Data imported.' : 'Import failed. The file did not match the expected format.');

      if (imported) {
        onImported();
        setMessage('Data imported. Syncing to GitHub...');
        try {
          setMessage(await syncCurrentLandTrainingDataToGitHub());
        } catch (error) {
          setMessage(error instanceof Error ? `Data imported locally. ${error.message}` : 'Data imported locally. GitHub sync failed.');
        }
      }
    } catch {
      setMessage('Import failed. Choose a valid JSON export file.');
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const syncToGitHub = async () => {
    setIsSyncing(true);
    setMessage('Syncing to GitHub...');

    try {
      setMessage(await syncCurrentLandTrainingDataToGitHub());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'GitHub sync failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <section className="panel">
      <h2>Data</h2>
      <p className="muted">
        Export/import still protects local browser data. Sync writes the current programs and workout history to this repo for Codex coaching.
      </p>
      <div className="button-row">
        <button className="primary-button" type="button" onClick={() => void syncToGitHub()} disabled={isSyncing}>
          {isSyncing ? 'Syncing...' : 'Sync to GitHub'}
        </button>
        <button className="secondary-button" type="button" onClick={exportData}>
          Export Data
        </button>
        <label className="secondary-button file-button">
          Import Data
          <input ref={inputRef} type="file" accept="application/json" onChange={(event) => void importData(event.target.files?.[0])} />
        </label>
      </div>
      {message && <p className="status-message">{message}</p>}
    </section>
  );
}
