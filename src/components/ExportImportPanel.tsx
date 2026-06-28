import { useState } from 'react';
import { syncCurrentLandTrainingDataToGitHub } from '../services/githubSyncService';

export function ExportImportPanel() {
  const [message, setMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

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
      <h2>GitHub Sync</h2>
      <p className="muted">
        Sync writes the current programs and workout history to this repo for Codex coaching.
      </p>
      <div className="button-row">
        <button className="primary-button" type="button" onClick={() => void syncToGitHub()} disabled={isSyncing}>
          {isSyncing ? 'Syncing...' : 'Sync to GitHub'}
        </button>
      </div>
      {message && <p className="status-message">{message}</p>}
    </section>
  );
}
