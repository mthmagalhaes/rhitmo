// Rhitmo Recorder — Popup Logic (Auto-Record v2)

const authView = document.getElementById('auth-view');
const tokenInput = document.getElementById('token-input');
const saveTokenBtn = document.getElementById('save-token');
const connectedBadge = document.getElementById('connected-badge');
const idleView = document.getElementById('idle-view');
const recordingView = document.getElementById('recording-view');
const uploadView = document.getElementById('upload-view');
const btnStop = document.getElementById('btn-stop');
const timerEl = document.getElementById('timer');
const msgEl = document.getElementById('msg');
const btnDisconnect = document.getElementById('btn-disconnect');
const settings = document.getElementById('settings');
const autoRecordToggle = document.getElementById('auto-record-toggle');

let timerInterval = null;

// ─── Auth ───
async function checkAuth() {
  const { authToken } = await chrome.storage.local.get('authToken');
  if (authToken) {
    showConnected();
  } else {
    authView.style.display = 'block';
    connectedBadge.style.display = 'none';
    idleView.style.display = 'none';
    recordingView.style.display = 'none';
    settings.style.display = 'none';
    btnDisconnect.style.display = 'none';
  }
}

saveTokenBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim();
  if (!token) return;
  await chrome.storage.local.set({ authToken: token });
  showConnected();
});

btnDisconnect.addEventListener('click', async () => {
  await chrome.storage.local.remove('authToken');
  checkAuth();
});

async function showConnected() {
  authView.style.display = 'none';
  connectedBadge.style.display = 'flex';
  btnDisconnect.style.display = 'block';
  settings.style.display = 'block';
  await loadSettings();
  await checkRecordingState();
}

// ─── Settings ───
async function loadSettings() {
  const { autoRecord } = await chrome.storage.local.get('autoRecord');
  autoRecordToggle.checked = autoRecord !== false;
}

autoRecordToggle.addEventListener('change', () => {
  chrome.storage.local.set({ autoRecord: autoRecordToggle.checked });
});

// ─── Recording state ───
async function checkRecordingState() {
  const { recording, startTime } = await chrome.storage.local.get(['recording', 'startTime']);

  if (recording && startTime) {
    showRecording(startTime);
  } else {
    showIdle();
  }
}

function showIdle() {
  idleView.style.display = 'block';
  recordingView.style.display = 'none';
  uploadView.style.display = 'none';
  clearInterval(timerInterval);
}

function showRecording(startTime) {
  idleView.style.display = 'none';
  recordingView.style.display = 'block';
  uploadView.style.display = 'none';

  clearInterval(timerInterval);
  updateTimer(startTime);
  timerInterval = setInterval(() => updateTimer(startTime), 1000);
}

function updateTimer(startTime) {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}

// ─── Stop button ───
btnStop.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'manual-stop' });
  recordingView.style.display = 'none';
  uploadView.style.display = 'block';
});

// ─── Listen for state changes ───
chrome.storage.onChanged.addListener((changes) => {
  if (changes.recording) {
    if (changes.recording.newValue) {
      const startTime = changes.startTime?.newValue || Date.now();
      showRecording(startTime);
    } else {
      showIdle();
    }
  }
  if (changes.lastError?.newValue) {
    showMsg(changes.lastError.newValue, 'error');
    chrome.storage.local.remove('lastError');
  }
});

// ─── Messages from background ───
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'upload-started') {
    recordingView.style.display = 'none';
    uploadView.style.display = 'block';
  } else if (msg.type === 'upload-complete') {
    uploadView.style.display = 'none';
    if (msg.success) {
      showMsg('Reunião enviada! Transcrição será processada automaticamente.', 'success');
    } else {
      showMsg(`Erro: ${msg.error}`, 'error');
    }
    showIdle();
  }
});

// ─── UI helpers ───
function showMsg(text, type) {
  msgEl.textContent = text;
  msgEl.className = `msg msg-${type}`;
  msgEl.style.display = 'block';
  setTimeout(() => { msgEl.style.display = 'none'; }, 6000);
}

// ─── Init ───
checkAuth();
