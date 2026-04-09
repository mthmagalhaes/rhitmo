// Rhitmo Recorder — Popup Logic
// States: auth → idle → recording → converting → uploading → done

const SUPABASE_URL = 'https://lybkgujyezzzvbzypxed.supabase.co';
const UPLOAD_FN = `${SUPABASE_URL}/functions/v1/upload-meeting`;

// DOM refs
const authView = document.getElementById('auth-view');
const tokenInput = document.getElementById('token-input');
const saveTokenBtn = document.getElementById('save-token');
const connectedBadge = document.getElementById('connected-badge');
const noMeet = document.getElementById('no-meet');
const recorder = document.getElementById('recorder');
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const statusIcon = document.getElementById('status-icon');
const statusText = document.getElementById('status-text');
const timerEl = document.getElementById('timer');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');
const msgEl = document.getElementById('msg');
const btnDisconnect = document.getElementById('btn-disconnect');

let mediaRecorder = null;
let audioChunks = [];
let timerInterval = null;
let startTime = 0;
let stream = null;

// ─── Auth ───
async function checkAuth() {
  const { authToken } = await chrome.storage.local.get('authToken');
  if (authToken) {
    showConnected();
  } else {
    authView.style.display = 'block';
    connectedBadge.style.display = 'none';
    recorder.style.display = 'none';
    noMeet.style.display = 'none';
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
  await checkMeetTab();
}

// ─── Meet detection ───
async function checkMeetTab() {
  const { meetTabId } = await chrome.storage.local.get('meetTabId');
  // Also check active tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isMeet = activeTab?.url?.includes('meet.google.com/') && !activeTab?.url?.includes('meet.google.com/landing');
  
  if (isMeet || meetTabId) {
    recorder.style.display = 'block';
    noMeet.style.display = 'none';
  } else {
    recorder.style.display = 'none';
    noMeet.style.display = 'block';
  }
}

// ─── Recording ───
btnRecord.addEventListener('click', async () => {
  try {
    // Use tabCapture to capture audio from the active tab
    stream = await new Promise((resolve, reject) => {
      chrome.tabCapture.capture({ audio: true, video: false }, (s) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (!s) {
          reject(new Error('Não foi possível capturar áudio da aba.'));
        } else {
          resolve(s);
        }
      });
    });

    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      handleRecordingComplete();
    };

    mediaRecorder.start(1000); // collect data every second
    startTime = Date.now();
    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);

    statusIcon.textContent = '🔴';
    statusText.textContent = 'Gravando...';
    btnRecord.style.display = 'none';
    btnStop.style.display = 'block';
  } catch (err) {
    showMsg(err.message, 'error');
  }
});

btnStop.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
  clearInterval(timerInterval);
  btnStop.style.display = 'none';
});

function updateTimer() {
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');
  timerEl.textContent = `${m}:${s}`;
}

// ─── Post-recording ───
async function handleRecordingComplete() {
  statusIcon.textContent = '⏳';
  statusText.textContent = 'Preparando upload...';
  progress.style.display = 'block';
  progressFill.style.width = '30%';
  progressText.textContent = 'Convertendo áudio...';

  try {
    // Create blob from recorded chunks (WebM/Opus)
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    
    progressFill.style.width = '60%';
    progressText.textContent = 'Enviando para o Rhitmo...';

    const { authToken } = await chrome.storage.local.get('authToken');
    if (!authToken) {
      showMsg('Token não encontrado. Reconecte sua conta.', 'error');
      resetUI();
      return;
    }

    // Upload as WebM — the edge function handles conversion
    const formData = new FormData();
    formData.append('audio', blob, `meet-recording-${Date.now()}.webm`);

    const res = await fetch(UPLOAD_FN, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    });

    progressFill.style.width = '90%';

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Erro ${res.status}`);
    }

    progressFill.style.width = '100%';
    progressText.textContent = 'Enviado com sucesso!';
    statusIcon.textContent = '✅';
    statusText.textContent = 'Gravação enviada!';
    showMsg('Reunião enviada! A transcrição será processada automaticamente.', 'success');

    setTimeout(resetUI, 3000);
  } catch (err) {
    showMsg(`Erro no upload: ${err.message}`, 'error');
    resetUI();
  }
}

// ─── UI Helpers ───
function resetUI() {
  btnRecord.style.display = 'block';
  btnStop.style.display = 'none';
  progress.style.display = 'none';
  progressFill.style.width = '0%';
  statusIcon.textContent = '🎙️';
  statusText.textContent = 'Pronto para gravar';
  timerEl.textContent = '00:00';
  audioChunks = [];
}

function showMsg(text, type) {
  msgEl.textContent = text;
  msgEl.className = `msg msg-${type}`;
  msgEl.style.display = 'block';
  setTimeout(() => { msgEl.style.display = 'none'; }, 5000);
}

// ─── Init ───
checkAuth();
