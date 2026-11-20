import { downloadProgress, loadProgress, loadSpoilerPreference, parseProgressFile, saveProgress, saveSpoilerPreference } from './progress.js';
import { ROADMAP } from './roadmap.js';

const response = await fetch('data/trophies.json');
if (!response.ok) throw new Error(`Trophy data could not be loaded (${response.status}).`);
const catalogue = await response.json();
const trophies = catalogue.trophies;
const trophyById = new Map(trophies.map(trophy => [trophy.id, trophy]));
const validIds = new Set(trophyById.keys());
const restored = loadProgress(validIds);
let earned = restored.earned;
let selectedId = 6;
let activeKind = 'all';
const spoilerPreference = loadSpoilerPreference();
let hideStorySpoilers = spoilerPreference.enabled;

const elements = {
  count: document.getElementById('progress-count'),
  percent: document.getElementById('progress-percent'),
  fill: document.getElementById('progress-fill'),
  list: document.getElementById('trophy-list'),
  visibleCount: document.getElementById('visible-count'),
  detail: document.getElementById('detail-panel'),
  search: document.getElementById('search'),
  spoilers: document.getElementById('spoiler-toggle'),
  importFile: document.getElementById('import-file'),
  importStatus: document.getElementById('import-status'),
  roadmap: document.getElementById('roadmap-steps')
};

elements.spoilers.checked = hideStorySpoilers;
if (restored.error) showStatus(restored.error, true);
if (spoilerPreference.error) showStatus(spoilerPreference.error, true);

function isSpoilerHidden(trophy) {
  return hideStorySpoilers && trophy.kind.includes('story') && !earned.has(trophy.id);
}

function matchesCurrentFilter(trophy) {
  if (activeKind === 'missable' && !trophy.missable) return false;
  if (activeKind !== 'all' && activeKind !== 'missable' && !trophy.kind.includes(activeKind)) return false;
  const query = elements.search.value.trim().toLocaleLowerCase();
  if (!query) return true;
  if (isSpoilerHidden(trophy)) return `${trophy.id} ${trophy.grade} story trophy`.includes(query);
  return `${trophy.name} ${trophy.description} ${trophy.grade}`.toLocaleLowerCase().includes(query);
}

function createGradeBadge(grade) {
  const badge = document.createElement('span');
  badge.className = `grade grade-${grade}`;
  badge.textContent = grade;
  return badge;
}

function renderTrophyList() {
  const visible = trophies.filter(matchesCurrentFilter);
  elements.visibleCount.textContent = String(visible.length);
  elements.list.replaceChildren();

  if (visible.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = activeKind === 'missable'
      ? 'No missable trophy has been independently verified in the available list.'
      : 'No trophies match this search.';
    elements.list.append(empty);
    return;
  }

  for (const trophy of visible) {
    const hidden = isSpoilerHidden(trophy);
    const row = document.createElement('div');
    row.className = `trophy-row${selectedId === trophy.id ? ' selected' : ''}`;
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', hidden ? `Story trophy ${trophy.id}` : `${trophy.name}, ${trophy.grade}`);
    row.addEventListener('click', () => {
      selectedId = trophy.id;
      render();
    });

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = earned.has(trophy.id);
    checkbox.setAttribute('aria-label', `Mark ${hidden ? `story trophy ${trophy.id}` : trophy.name} earned`);
    checkbox.addEventListener('click', event => event.stopPropagation());
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) earned.add(trophy.id);
      else earned.delete(trophy.id);
      try {
        saveProgress(earned);
        showStatus('Progress saved on this device.');
      } catch (error) {
        showStatus(`Progress could not be saved: ${error.message}`, true);
      }
      render();
    });

    const copy = document.createElement('span');
    copy.className = 'row-copy';
    const title = document.createElement('button');
    title.type = 'button';
    title.className = 'row-title';
    title.textContent = hidden ? `Story trophy #${String(trophy.id).padStart(2, '0')}` : trophy.name;
    const description = document.createElement('span');
    description.className = 'row-description';
    description.textContent = hidden ? 'Name and description hidden' : trophy.description;
    copy.append(title, description);
    row.append(checkbox, copy, createGradeBadge(trophy.grade));
    elements.list.append(row);
  }
}

function renderSources(trophy) {
  const list = document.createElement('div');
  list.className = 'source-list';
  for (const source of trophy.sources) {
    const link = document.createElement('a');
    link.className = 'source-link';
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = source.name;
    list.append(link);
  }
  return list;
}

function renderTrophyDetail() {
  const trophy = trophyById.get(selectedId) ?? trophies[0];
  const hidden = isSpoilerHidden(trophy);
  elements.detail.replaceChildren();

  const meta = document.createElement('div');
  meta.className = 'detail-meta';
  const kicker = document.createElement('span');
  kicker.className = 'detail-kicker';
  kicker.textContent = `FIELD NOTE ${String(trophy.id).padStart(2, '0')} · ${trophy.kind.join(' / ').toUpperCase()}`;
  meta.append(kicker, createGradeBadge(trophy.grade));

  const title = document.createElement('h2');
  title.className = 'detail-title';
  title.textContent = hidden ? 'Story details hidden' : trophy.name;
  const description = document.createElement('p');
  description.className = 'detail-description';
  description.textContent = hidden ? 'Earn this trophy or turn off spoiler protection to reveal its official description.' : trophy.description;
  const status = document.createElement('p');
  status.className = 'detail-status';
  status.textContent = earned.has(trophy.id) ? '✓ Earned · saved in your tracker' : '○ Not earned · missability not confirmed';

  const rule = document.createElement('div');
  rule.className = 'detail-rule';
  const guideHeading = document.createElement('h3');
  guideHeading.className = 'guide-heading';
  guideHeading.textContent = hidden ? 'SPOILER-SAFE GUIDE' : 'FIELD GUIDE';
  const guide = document.createElement('div');
  guide.className = 'guide-copy';
  guide.textContent = hidden
    ? 'The route note is hidden with this story trophy. The source remains available for reference.'
    : trophy.guide;

  const sourceHeading = document.createElement('h4');
  sourceHeading.className = 'source-heading';
  sourceHeading.textContent = 'SOURCE FOR THIS NOTE';
  const warning = document.createElement('p');
  warning.className = 'detail-warning';
  warning.textContent = trophy.missable
    ? 'Missable flag: confirmed by a cited source.'
    : 'Missable flag: none verified. Check current in-game availability; specific lockouts are unconfirmed.';

  elements.detail.append(meta, title, description, status, rule, guideHeading, guide, sourceHeading, renderSources(trophy), warning);
}

function renderProgress() {
  const count = earned.size;
  const percentage = Math.round(count / trophies.length * 100);
  elements.count.replaceChildren(document.createTextNode(`${count} `));
  const total = document.createElement('small');
  total.textContent = `/ ${trophies.length}`;
  elements.count.append(total);
  elements.percent.textContent = `${percentage}% complete`;
  elements.fill.style.width = `${percentage}%`;
  elements.fill.parentElement.setAttribute('aria-valuenow', String(percentage));
}

function renderRoadmap() {
  elements.roadmap.replaceChildren();
  for (const step of ROADMAP) {
    const card = document.createElement('article');
    card.className = 'roadmap-card';
    const stepNumber = document.createElement('span');
    stepNumber.className = 'roadmap-step';
    stepNumber.textContent = 'PLATINUM ROUTE';
    const title = document.createElement('h3');
    title.textContent = step.title;
    const description = document.createElement('p');
    description.textContent = step.text;
    const links = document.createElement('div');
    links.className = 'roadmap-trophies';
    for (const id of step.trophyIds) {
      const trophy = trophyById.get(id);
      const link = document.createElement('a');
      link.href = `#trophy-${id}`;
      link.textContent = isSpoilerHidden(trophy) ? `#${id}` : trophy.name;
      link.addEventListener('click', event => {
        event.preventDefault();
        selectedId = id;
        activeKind = 'all';
        document.querySelectorAll('.filter').forEach(button => button.classList.toggle('active', button.dataset.kind === 'all'));
        document.querySelector('.workspace').scrollIntoView({ behavior: 'smooth' });
        render();
      });
      links.append(link, document.createTextNode(' · '));
    }
    const citation = document.createElement('a');
    citation.className = 'roadmap-cite';
    const source = trophyById.get(step.trophyIds[0]).sources[0];
    citation.href = source.url;
    citation.target = '_blank';
    citation.rel = 'noopener noreferrer';
    citation.textContent = `List source: ${source.name}`;
    card.append(stepNumber, title, description, links, citation);
    elements.roadmap.append(card);
  }
}

function render() {
  renderProgress();
  renderTrophyList();
  renderTrophyDetail();
  renderRoadmap();
}

function showStatus(message, isError = false) {
  elements.importStatus.textContent = message;
  elements.importStatus.style.color = isError ? '#a64b37' : '';
}

document.querySelectorAll('.filter').forEach(button => {
  button.addEventListener('click', () => {
    activeKind = button.dataset.kind;
    document.querySelectorAll('.filter').forEach(filter => filter.classList.toggle('active', filter === button));
    renderTrophyList();
  });
});
elements.search.addEventListener('input', renderTrophyList);
elements.spoilers.addEventListener('change', () => {
  hideStorySpoilers = elements.spoilers.checked;
  try {
    saveSpoilerPreference(hideStorySpoilers);
  } catch (error) {
    showStatus(`Spoiler preference could not be saved: ${error.message}`, true);
  }
  render();
});
document.getElementById('export-button').addEventListener('click', () => {
  try {
    downloadProgress(earned);
    showStatus('Progress export downloaded.');
  } catch (error) {
    showStatus(`Progress could not be exported: ${error.message}`, true);
  }
});
elements.importFile.addEventListener('change', async () => {
  const [file] = elements.importFile.files;
  if (!file) return;
  try {
    earned = await parseProgressFile(file, trophies);
    saveProgress(earned);
    showStatus(`Imported ${earned.size} earned ${earned.size === 1 ? 'trophy' : 'trophies'}.`);
    render();
  } catch (error) {
    showStatus(`Import failed: ${error.message}`, true);
  } finally {
    elements.importFile.value = '';
  }
});

render();
