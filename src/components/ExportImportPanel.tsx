import { useState } from 'react';
import {
  forgetStoredGitHubToken,
  hasStoredGitHubToken,
  syncCurrentLandTrainingDataToGitHub,
} from '../services/githubSyncService';

export function ExportImportPanel() {
  const [message, setMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasToken, setHasToken] = useState(hasStoredGitHubToken);

  const syncToGitHub = async () => {
    setIsSyncing(true);
    setMessage('Syncing to GitHub...');

    try {
      setMessage(await syncCurrentLandTrainingDataToGitHub());
      setHasToken(hasStoredGitHubToken());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'GitHub sync failed.');
      setHasToken(hasStoredGitHubToken());
    } finally {
      setIsSyncing(false);
    }
  };

  const forgetToken = () => {
    forgetStoredGitHubToken();
    setHasToken(false);
    setMessage('GitHub token forgotten on this device.');
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
        {hasToken && (
          <button className="secondary-button" type="button" onClick={forgetToken} disabled={isSyncing}>
            Forget token
          </button>
        )}
      </div>
      {hasToken && <p className="muted">GitHub sync is ready on this device.</p>}
      {message && <p className="status-message">{message}</p>}
    </section>
  );
}
