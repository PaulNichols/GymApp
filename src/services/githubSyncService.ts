import type { ExportData } from '../types';
import { buildLandTrainingSummary } from './landTrainingSummary';
import { storageService } from './storageService';

interface PutContentRequest {
  path: string;
  message: string;
  content: string;
}

interface GitHubContentResponse {
  sha: string;
}

const owner = 'PaulNichols';
const repo = 'GymApp';
const branch = 'main';
const tokenKey = 'swimGymTracker.githubToken';
const maxGitHubWriteAttempts = 3;
const retryDelayMs = 700;

export const syncCurrentLandTrainingDataToGitHub = async (): Promise<string> => {
  const data = storageService.exportData();
  await syncLandTrainingDataToGitHub(data);

  return `Synced ${data.workoutHistory.length} workout entr${data.workoutHistory.length === 1 ? 'y' : 'ies'} to GitHub.`;
};

export const syncLandTrainingDataToGitHub = async (data: ExportData): Promise<void> => {
  const token = getGitHubToken();

  if (!token) {
    throw new Error('GitHub sync skipped. A fine-grained GitHub token is required for GymApp repository contents access.');
  }

  const summary = buildLandTrainingSummary(data);

  await putContentFile(token, {
    path: 'data/workout-data.json',
    message: 'Update land training data',
    content: JSON.stringify(data, null, 2),
  });

  await putContentFile(token, {
    path: 'data/codex-land-training-summary.json',
    message: 'Update land training summary',
    content: JSON.stringify(summary, null, 2),
  });
};

const getGitHubToken = (): string => {
  const existing = getStoredGitHubToken();

  if (existing) {
    return existing;
  }

  const entered = window
    .prompt('Enter your fine-grained GitHub token for GymApp. It will be remembered on this device until you forget it.')
    ?.trim();

  if (!entered) {
    return '';
  }

  saveGitHubToken(entered);
  return entered;
};

export const hasStoredGitHubToken = (): boolean => getStoredGitHubToken().length > 0;

export const forgetStoredGitHubToken = (): void => {
  localStorage.removeItem(tokenKey);
  sessionStorage.removeItem(tokenKey);
};

const getStoredGitHubToken = (): string => {
  const storedToken = localStorage.getItem(tokenKey)?.trim() ?? sessionStorage.getItem(tokenKey)?.trim() ?? '';

  if (storedToken) {
    saveGitHubToken(storedToken);
  }

  return storedToken;
};

const saveGitHubToken = (token: string): void => {
  localStorage.setItem(tokenKey, token);
  sessionStorage.removeItem(tokenKey);
};

const putContentFile = async (token: string, request: PutContentRequest): Promise<void> => {
  const content = toBase64(request.content);

  for (let attempt = 1; attempt <= maxGitHubWriteAttempts; attempt += 1) {
    const existingSha = await getExistingSha(token, request.path);
    const payload: Record<string, unknown> = {
      message: request.message,
      content,
      branch,
    };

    if (existingSha) {
      payload.sha = existingSha;
    }

    const response = await fetch(apiUrl(request.path), {
      method: 'PUT',
      headers: githubHeaders(token),
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return;
    }

    if (response.status === 409 && attempt < maxGitHubWriteAttempts) {
      await waitForRetry(attempt);
      continue;
    }

    throw createGitHubError(response.status);
  }
};

const getExistingSha = async (token: string, path: string): Promise<string | null> => {
  const response = await fetch(`${apiUrl(path)}?ref=${encodeURIComponent(branch)}`, {
    headers: githubHeaders(token),
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw createGitHubError(response.status);
  }

  const body = (await response.json()) as GitHubContentResponse;
  return body.sha;
};

const apiUrl = (path: string): string => {
  const encodedPath = path
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/');

  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedPath}`;
};

const githubHeaders = (token: string): HeadersInit => ({
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
});

const createGitHubError = (status: number): Error => {
  if (status === 401 || status === 403) {
    return new Error('GitHub rejected the token. Check that it has GymApp repository contents read/write access.');
  }

  if (status === 404) {
    return new Error('GitHub repository, branch, or data path was not found, or the token cannot access it.');
  }

  if (status === 409) {
    return new Error('GitHub is still processing a recent sync. Wait a few seconds and tap Sync again.');
  }

  return new Error(`GitHub sync failed with status ${status}.`);
};

const waitForRetry = (attempt: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, retryDelayMs * attempt);
  });

const toBase64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};
