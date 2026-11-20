const PROGRESS_KEY = 'leonida-field-guide-progress-v1';
const SPOILER_KEY = 'leonida-field-guide-spoilers-v1';

export function loadProgress(validIds) {
  try {
    const stored = localStorage.getItem(PROGRESS_KEY);
    if (!stored) return { earned: new Set(), error: '' };
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error('Saved progress is not a list.');
    return {
      earned: new Set(parsed.filter(id => Number.isInteger(id) && validIds.has(id))),
      error: ''
    };
  } catch (error) {
    return { earned: new Set(), error: `Saved progress could not be read: ${error.message}` };
  }
}

export function saveProgress(earned) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...earned]));
}

export function loadSpoilerPreference() {
  try {
    return { enabled: localStorage.getItem(SPOILER_KEY) === 'true', error: '' };
  } catch (error) {
    return { enabled: false, error: `Spoiler preference could not be read: ${error.message}` };
  }
}

export function saveSpoilerPreference(enabled) {
  localStorage.setItem(SPOILER_KEY, String(enabled));
}

export async function parseProgressFile(file, trophies) {
  const parsed = JSON.parse(await file.text());
  const values = Array.isArray(parsed) ? parsed : parsed?.earned;
  if (!Array.isArray(values)) throw new Error('Choose a progress export containing an earned list.');

  const idsByName = new Map(trophies.map(trophy => [trophy.name, trophy.id]));
  const ids = new Set();
  for (const value of values) {
    const id = Number.isInteger(value) ? value : idsByName.get(value);
    if (!Number.isInteger(id) || !trophies.some(trophy => trophy.id === id)) {
      throw new Error(`Unknown trophy in progress file: ${String(value)}`);
    }
    ids.add(id);
  }
  return ids;
}

export function downloadProgress(earned) {
  const payload = JSON.stringify({
    version: 1,
    game: 'Grand Theft Auto VI',
    earned: [...earned].sort((a, b) => a - b)
  }, null, 2);
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-trophy-progress.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
