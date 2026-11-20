const STORAGE_KEY = 'leonida-ledger-earned-v1';
const SPOILER_KEY = 'leonida-ledger-spoilers-v1';
const SOURCE_NAME = 'Exophase · PS5 trophy list';
const ROADMAP = [
  {
    title: '01 / Campaign landmarks',
    detail: 'Advance through the named opening, chapters, and missions as they appear. Only the chapter milestones are explicit order markers; the list does not map every mission to a chapter.',
    ids: [2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 13],
    note: 'Chapter 1 → 4, plus named missions'
  },
  {
    title: '02 / Character strands',
    detail: 'Keep available character and stranger strands on your radar. The list identifies final missions for Andy, Kenton, Billy, Randy, and Tyrone, and asks for eight stranger strands.',
    ids: [22, 23, 24, 25, 26, 27],
    note: '6 related trophies · 8 stranger strands'
  },
  {
    title: '03 / Build progress in parallel',
    detail: 'Work on repeatable counts and activities alongside the story. Record distinct races, range medals, stunts, challenges, and other totals in the game tracker where it exposes them.',
    ids: [14, 15, 16, 17, 18, 19, 20, 21, 29, 32, 33, 34, 36, 37, 38, 39, 40, 41, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53],
    note: 'Counts come from the trophy wording'
  },
  {
    title: '04 / Sweep the world list',
    detail: 'Track discovered places, vehicles, meditation spots, card sets, WAiNK It uses, garage properties, and Scooter Bros registrations. Locations and extra totals are not provided here.',
    ids: [28, 30, 31, 35, 42, 54, 55],
    note: 'Use the in-game map and ledgers'
  },
  {
    title: '05 / Finish, then reconcile',
    detail: 'Complete the final mission when ready, bring the completion record to 100%, then compare your checklist against the full PS5 list. No verified source here confirms what becomes unavailable after the finale.',
    ids: [7, 14, 1],
    note: 'Final mission → 100% → platinum check'
  }
];

const ui = {
  earned: document.getElementById('earned-count'),
  percent: document.getElementById('completion-label'),
  meter: document.getElementById('meter-fill'),
  checklist: document.getElementById('checklist'),
  visible: document.getElementById('shown-count'),
  guide: document.getElementById('guide-panel'),
  roadmap: document.getElementById('roadmap-list'),
  search: document.getElementById('search-input'),
  spoilers: document.getElementById('spoiler-setting'),
  importer: document.getElementById('import-progress'),
  feedback: document.getElementById('feedback'),
  loadError: document.getElementById('load-error')
};

let catalogue = [];
let earned = new Set();
let activeFilter = 'all';
let selectedId = 14;
let hideSpoilers = true;

function showFeedback(message, isError = false) {
  ui.feedback.textContent = message;
  ui.feedback.classList.toggle('is-error', isError);
}

function readPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const ids = JSON.parse(stored);
      if (!Array.isArray(ids)) throw new Error('Saved progress is not a list.');
      const knownIds = new Set(catalogue.map(item => item.id));
      earned = new Set(ids.filter(id => Number.isInteger(id) && knownIds.has(id)));
    }
    const spoilerValue = localStorage.getItem(SPOILER_KEY);
    hideSpoilers = spoilerValue === null ? true : spoilerValue === 'true';
  } catch (error) {
    showFeedback(`Saved settings could not be read: ${error.message}`, true);
  }
  ui.spoilers.checked = hideSpoilers;
}

function saveEarned() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...earned].sort((a, b) => a - b)));
}

function isHidden(item) {
  return hideSpoilers && item.kind === 'story' && !earned.has(item.id);
}

function filteredTrophies() {
  const query = ui.search.value.trim().toLocaleLowerCase();
  return catalogue.filter(item => {
    if (activeFilter === 'missable' && !item.missable) return false;
    if (activeFilter !== 'all' && activeFilter !== 'missable' && item.kind !== activeFilter) return false;
    if (!query) return true;
    if (isHidden(item)) return `story trophy ${item.id} ${item.grade}`.includes(query);
    return `${item.name} ${item.description} ${item.grade} ${item.kind} ${item.guide}`.toLocaleLowerCase().includes(query);
  });
}

function gradeTag(grade) {
  const tag = document.createElement('span');
  tag.className = `grade-tag grade-${grade}`;
  tag.textContent = grade;
  return tag;
}

function renderChecklist() {
  const matches = filteredTrophies();
  ui.visible.textContent = String(matches.length);
  ui.checklist.replaceChildren();
  if (matches.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-message';
    empty.textContent = activeFilter === 'missable'
      ? 'No missable trophy has been verified. This is not confirmation that none can be missed.'
      : 'No trophies match this search.';
    ui.checklist.append(empty);
    return;
  }

  for (const item of matches) {
    const row = document.createElement('article');
    row.className = `trophy-entry${selectedId === item.id ? ' is-selected' : ''}`;
    row.dataset.trophyId = String(item.id);

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = earned.has(item.id);
    check.setAttribute('aria-label', `Mark ${isHidden(item) ? `story trophy ${item.id}` : item.name} earned`);
    check.addEventListener('change', () => {
      if (check.checked) earned.add(item.id);
      else earned.delete(item.id);
      try {
        saveEarned();
        showFeedback('Progress saved on this device.');
      } catch (error) {
        showFeedback(`Progress could not be saved: ${error.message}`, true);
      }
      render();
    });

    const select = document.createElement('button');
    select.type = 'button';
    select.className = 'entry-copy';
    select.setAttribute('aria-pressed', String(selectedId === item.id));
    const title = document.createElement('strong');
    title.textContent = isHidden(item) ? `Story trophy ${String(item.id).padStart(2, '0')}` : item.name;
    const description = document.createElement('span');
    description.textContent = isHidden(item) ? 'Name and description hidden' : item.description;
    select.append(title, description);
    select.addEventListener('click', () => {
      selectedId = item.id;
      render();
    });

    row.append(check, select, gradeTag(item.grade));
    ui.checklist.append(row);
  }
}

function renderGuide() {
  const item = catalogue.find(candidate => candidate.id === selectedId) ?? catalogue[0];
  if (!item) return;
  const hidden = isHidden(item);
  ui.guide.replaceChildren();

  const meta = document.createElement('div');
  meta.className = 'guide-meta';
  const index = document.createElement('span');
  index.textContent = `ENTRY ${String(item.id).padStart(2, '0')} / ${item.kind.toUpperCase()}`;
  meta.append(index, gradeTag(item.grade));

  const heading = document.createElement('h2');
  heading.textContent = hidden ? 'Story note held back' : item.name;
  const description = document.createElement('p');
  description.className = 'official-description';
  description.textContent = hidden ? 'Earn this trophy or turn off spoiler protection to reveal its official description.' : item.description;

  const state = document.createElement('p');
  state.className = 'earned-state';
  state.textContent = earned.has(item.id) ? '✓ Earned · saved in your browser' : '○ Not earned';

  const divider = document.createElement('div');
  divider.className = 'guide-divider';
  const noteLabel = document.createElement('p');
  noteLabel.className = 'field-label';
  noteLabel.textContent = hidden ? 'SPOILER-SAFE NOTE' : 'FIELD NOTE';
  const note = document.createElement('p');
  note.className = 'guide-copy';
  note.textContent = hidden ? 'This story entry stays covered until you earn it. The route note is hidden with the title.' : item.guide;

  const sourceHeading = document.createElement('p');
  sourceHeading.className = 'field-label source-label';
  sourceHeading.textContent = 'REFERENCE';
  const sources = document.createElement('div');
  sources.className = 'source-links';
  for (const source of item.sources) {
    const link = document.createElement('a');
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = source.name;
    sources.append(link);
  }

  const missable = document.createElement('p');
  missable.className = `missable-state${item.missable ? ' is-confirmed' : ''}`;
  missable.textContent = item.missable
    ? 'Missable: verified by a cited source.'
    : 'Missable status: unconfirmed; no lockout is asserted.';
  ui.guide.append(meta, heading, description, state, divider, noteLabel, note, sourceHeading, sources, missable);
}

function renderProgress() {
  const total = catalogue.length;
  const complete = earned.size;
  const percent = total ? Math.round(complete / total * 100) : 0;
  ui.earned.replaceChildren(document.createTextNode(`${complete} `));
  const denominator = document.createElement('small');
  denominator.textContent = `/ ${total}`;
  ui.earned.append(denominator);
  ui.percent.textContent = `${percent}% complete`;
  ui.meter.style.width = `${percent}%`;
  ui.meter.parentElement.setAttribute('aria-valuenow', String(percent));
}

function renderRoadmap() {
  ui.roadmap.replaceChildren();
  for (const phase of ROADMAP) {
    const card = document.createElement('article');
    card.className = 'route-card';
    const kicker = document.createElement('p');
    kicker.className = 'route-note';
    kicker.textContent = phase.note;
    const title = document.createElement('h3');
    title.textContent = phase.title;
    const detail = document.createElement('p');
    detail.className = 'route-detail';
    detail.textContent = phase.detail;
    const links = document.createElement('div');
    links.className = 'route-trophies';
    for (const id of phase.ids) {
      const item = catalogue.find(candidate => candidate.id === id);
      if (!item) continue;
      const link = document.createElement('button');
      link.type = 'button';
      link.textContent = isHidden(item) ? `#${id}` : item.name;
      link.setAttribute('aria-label', `Open ${isHidden(item) ? `story trophy ${id}` : item.name}`);
      link.addEventListener('click', () => {
        selectedId = id;
        activeFilter = 'all';
        document.querySelectorAll('.filter-button').forEach(button => button.classList.toggle('is-active', button.dataset.filter === 'all'));
        render();
        document.querySelector('.tracker').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      links.append(link);
    }
    const citation = document.createElement('a');
    citation.className = 'route-source';
    citation.href = catalogue.find(item => item.id === phase.ids[0]).sources[0].url;
    citation.target = '_blank';
    citation.rel = 'noopener noreferrer';
    citation.textContent = `List reference: ${SOURCE_NAME} ↗`;
    card.append(kicker, title, detail, links, citation);
    ui.roadmap.append(card);
  }
}

function render() {
  renderProgress();
  renderChecklist();
  renderGuide();
  renderRoadmap();
}

function parseImport(contents) {
  const payload = JSON.parse(contents);
  const values = Array.isArray(payload) ? payload : payload?.earned;
  if (!Array.isArray(values)) throw new Error('The file must contain an earned list.');
  const byName = new Map(catalogue.map(item => [item.name, item.id]));
  const ids = new Set();
  for (const value of values) {
    const id = Number.isInteger(value) ? value : byName.get(value);
    if (!Number.isInteger(id) || !catalogue.some(item => item.id === id)) {
      throw new Error(`Unknown trophy in progress file: ${String(value)}`);
    }
    ids.add(id);
  }
  return ids;
}

function exportProgress() {
  const payload = {
    version: 1,
    game: 'Grand Theft Auto VI',
    exportedAt: new Date().toISOString(),
    earned: [...earned].sort((a, b) => a - b)
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'leonida-field-notes-progress.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function validateCatalogue(items) {
  if (!Array.isArray(items) || items.length !== 55) throw new Error('The trophy catalogue must contain all 55 entries.');
  const ids = new Set();
  for (const item of items) {
    if (!Number.isInteger(item.id) || ids.has(item.id)) throw new Error('The trophy catalogue has a missing or duplicate id.');
    ids.add(item.id);
    if (!item.name || !item.description || !item.grade || !item.kind || !item.guide?.trim() || !item.sources?.length) {
      throw new Error(`Trophy ${item.id} is missing required guide data.`);
    }
  }
}

async function start() {
  const response = await fetch('data/trophies.json');
  if (!response.ok) throw new Error(`Trophy data did not load (${response.status}).`);
  const data = await response.json();
  catalogue = data.trophies;
  validateCatalogue(catalogue);
  ui.loadError.textContent = '';
  readPreferences();
  render();
}

document.querySelectorAll('.filter-button').forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('.filter-button').forEach(filter => filter.classList.toggle('is-active', filter === button));
    renderChecklist();
  });
});
ui.search.addEventListener('input', renderChecklist);
ui.spoilers.addEventListener('change', () => {
  hideSpoilers = ui.spoilers.checked;
  try {
    localStorage.setItem(SPOILER_KEY, String(hideSpoilers));
  } catch (error) {
    showFeedback(`Spoiler preference could not be saved: ${error.message}`, true);
  }
  render();
});
document.getElementById('export-progress').addEventListener('click', () => {
  try {
    exportProgress();
    showFeedback('Progress file exported.');
  } catch (error) {
    showFeedback(`Export failed: ${error.message}`, true);
  }
});
ui.importer.addEventListener('change', async () => {
  const [file] = ui.importer.files;
  if (!file) return;
  try {
    earned = parseImport(await file.text());
    saveEarned();
    render();
    showFeedback(`Imported ${earned.size} earned ${earned.size === 1 ? 'trophy' : 'trophies'}.`);
  } catch (error) {
    showFeedback(`Import failed: ${error.message}`, true);
  } finally {
    ui.importer.value = '';
  }
});

start().catch(error => {
  ui.loadError.textContent = `Guide data could not be loaded: ${error.message}`;
});
