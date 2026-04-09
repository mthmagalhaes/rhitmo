// Rhitmo Recorder — Background Service Worker
// Orchestrates content script ↔ offscreen document for auto-recording

let recordingTabId = null;

// ─── Content script messages ───
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  if (msg.type === 'meeting-joined' && tabId) {
    handleMeetingJoined(tabId);
    sendResponse({ ok: true });
  } else if (msg.type === 'meeting-left') {
    handleMeetingLeft();
    sendResponse({ ok: true });
  } else if (msg.type === 'recording-started') {
    chrome.storage.local.set({ recording: true, startTime: Date.now() });
    setBadge('REC', '#ef4444');
  } else if (msg.type === 'recording-error') {
    chrome.storage.local.set({ recording: false, lastError: msg.error });
    setBadge('', '#000');
  } else if (msg.type === 'upload-started') {
    setBadge('⬆', '#3b82f6');
  } else if (msg.type === 'upload-complete') {
    chrome.storage.local.set({ recording: false, startTime: null });
    if (msg.success) {
      setBadge('✓', '#22c55e');
      setTimeout(() => setBadge('', '#000'), 5000);
    } else {
      chrome.storage.local.set({ lastError: msg.error });
      setBadge('!', '#ef4444');
      setTimeout(() => setBadge('', '#000'), 5000);
    }
    closeOffscreen();
  } else if (msg.type === 'manual-stop') {
    handleMeetingLeft();
    sendResponse({ ok: true });
  }
  return true;
});

// ─── Meeting lifecycle ───
async function handleMeetingJoined(tabId) {
  const { autoRecord, authToken } = await chrome.storage.local.get(['autoRecord', 'authToken']);

  // Default autoRecord to true
  if (autoRecord === false) {
    console.log('[Rhitmo BG] Auto-record disabled, skipping');
    return;
  }
  if (!authToken) {
    console.warn('[Rhitmo BG] No auth token, cannot record');
    chrome.storage.local.set({ lastError: 'Conecte sua conta no Rhitmo primeiro.' });
    setBadge('!', '#f59e0b');
    return;
  }
  if (recordingTabId) {
    console.log('[Rhitmo BG] Already recording tab', recordingTabId);
    return;
  }

  recordingTabId = tabId;
  console.log('[Rhitmo BG] Meeting joined on tab', tabId, '— starting capture');

  try {
    const streamId = await getMediaStreamId(tabId);
    await ensureOffscreen();
    chrome.runtime.sendMessage({ type: 'start-recording', streamId });
  } catch (err) {
    console.error('[Rhitmo BG] Failed to start capture:', err);
    chrome.storage.local.set({ lastError: err.message });
    setBadge('!', '#ef4444');
    recordingTabId = null;
  }
}

async function handleMeetingLeft() {
  if (!recordingTabId) return;
  console.log('[Rhitmo BG] Meeting left — stopping recording');
  recordingTabId = null;

  try {
    chrome.runtime.sendMessage({ type: 'stop-recording' });
  } catch (err) {
    console.error('[Rhitmo BG] Error stopping:', err);
  }
}

// ─── Tab capture ───
function getMediaStreamId(tabId) {
  return new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (streamId) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!streamId) {
        reject(new Error('Não foi possível capturar áudio da aba.'));
      } else {
        resolve(streamId);
      }
    });
  });
}

// ─── Offscreen document management ───
async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording Google Meet audio for transcription',
    });
  }
}

async function closeOffscreen() {
  try {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
    });
    if (contexts.length > 0) {
      await chrome.offscreen.closeDocument();
    }
  } catch (e) {
    // ignore
  }
}

// ─── Badge helpers ───
function setBadge(text, color) {
  chrome.action.setBadgeText({ text });
  if (color) chrome.action.setBadgeBackgroundColor({ color });
}

// ─── Tab detection (fallback) ───
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isMeet = tab.url.includes('meet.google.com/') && !tab.url.includes('meet.google.com/landing');
    if (isMeet) {
      chrome.storage.local.set({ meetTabId: tabId, meetUrl: tab.url });
    }
  }
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  if (tabId === recordingTabId) {
    handleMeetingLeft();
  }
  const { meetTabId } = await chrome.storage.local.get('meetTabId');
  if (meetTabId === tabId) {
    chrome.storage.local.remove(['meetTabId', 'meetUrl']);
  }
});

// Initialize autoRecord default
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('autoRecord', ({ autoRecord }) => {
    if (autoRecord === undefined) {
      chrome.storage.local.set({ autoRecord: true });
    }
  });
});
