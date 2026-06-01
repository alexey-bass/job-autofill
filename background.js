import { fillForms } from './filler.js';

// Keyboard shortcut (Alt+Shift+F) fills the active page without opening the popup.
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'fill-form') return;
  const { profile = {} } = await chrome.storage.sync.get('profile');
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, allFrames: true },
      func: fillForms,
      args: [profile],
    });
  } catch (err) {
    // Page disallows injection (e.g. chrome:// or the Web Store) — ignore.
  }
});
