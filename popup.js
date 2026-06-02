import { fillForms } from './filler.js';

const FIELDS = [
  'firstName', 'lastName', 'email', 'phone', 'location',
  'address', 'city', 'state', 'zip', 'country',
  'linkedin', 'github', 'website',
];

const statusEl = document.getElementById('status');
let statusTimer;

function flash(message, isError) {
  statusEl.textContent = message;
  statusEl.classList.toggle('error', !!isError);
  statusEl.classList.add('show');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => statusEl.classList.remove('show'), 1500);
}

async function loadProfile() {
  const { profile = {} } = await chrome.storage.sync.get('profile');
  for (const f of FIELDS) {
    const input = document.getElementById(f);
    if (input) input.value = profile[f] || '';
  }
}

function readProfile() {
  const profile = {};
  for (const f of FIELDS) {
    const input = document.getElementById(f);
    if (input) profile[f] = input.value.trim();
  }
  return profile;
}

async function saveProfile() {
  await chrome.storage.sync.set({ profile: readProfile() });
  flash('Saved');
}

async function fillActivePage() {
  const { profile = {} } = await chrome.storage.sync.get('profile');
  const hasData = Object.values(profile).some((v) => v && String(v).trim());
  if (!hasData) {
    flash('Add your details first', true);
    return;
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    flash('No active tab', true);
    return;
  }
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: fillForms,
      args: [profile],
    });
    const count = results.reduce((n, r) => n + (r.result || 0), 0);
    flash(count ? `Filled ${count} field${count === 1 ? '' : 's'}` : 'No matching fields', !count);
  } catch (err) {
    flash('Cannot fill this page', true);
  }
}

// Auto-save on edit (debounced).
let saveTimer;
document.getElementById('profile').addEventListener('input', () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveProfile, 400);
});

document.getElementById('fill').addEventListener('click', fillActivePage);

loadProfile();
