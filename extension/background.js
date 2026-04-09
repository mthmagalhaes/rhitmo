// Rhitmo Recorder — Background Service Worker
// Detects Google Meet tabs and manages recording state

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isMeet = tab.url.includes('meet.google.com/') && !tab.url.includes('meet.google.com/landing');
    if (isMeet) {
      chrome.action.setBadgeText({ text: '●', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
      chrome.storage.local.set({ meetTabId: tabId, meetUrl: tab.url });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get(['meetTabId'], (result) => {
    if (result.meetTabId === tabId) {
      chrome.storage.local.remove(['meetTabId', 'meetUrl']);
    }
  });
});
