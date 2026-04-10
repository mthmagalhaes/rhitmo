// Rhitmo Recorder — Offscreen Document
// Handles actual audio recording in the background

const SUPABASE_URL = 'https://lybkgujyezzzvbzypxed.supabase.co';
const UPLOAD_FN = `${SUPABASE_URL}/functions/v1/upload-meeting`;

let mediaRecorder = null;
let audioChunks = [];
let stream = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'start-recording' && msg.streamId) {
    startRecording(msg.streamId);
    sendResponse({ ok: true });
  } else if (msg.type === 'stop-recording') {
    stopRecording();
    sendResponse({ ok: true });
  } else if (msg.type === 'get-status') {
    sendResponse({
      recording: mediaRecorder?.state === 'recording',
    });
  }
  return true;
});

async function startRecording(streamId) {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      },
    });

    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      handleUpload();
    };

    mediaRecorder.start(1000);
    console.log('[Rhitmo Offscreen] Recording started');

    // Notify background that recording is active
    chrome.runtime.sendMessage({ type: 'recording-started' });
  } catch (err) {
    console.error('[Rhitmo Offscreen] Failed to start recording:', err);
    chrome.runtime.sendMessage({
      type: 'recording-error',
      error: err.message,
    });
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    console.log('[Rhitmo Offscreen] Recording stopped');
  }
}

async function handleUpload() {
  if (audioChunks.length === 0) {
    console.warn('[Rhitmo Offscreen] No audio data to upload');
    chrome.runtime.sendMessage({ type: 'upload-complete', success: false, error: 'Sem dados de áudio' });
    return;
  }

  chrome.runtime.sendMessage({ type: 'upload-started' });

  try {
    const blob = new Blob(audioChunks, { type: 'audio/webm' });
    audioChunks = [];

    const { authToken } = await chrome.storage.local.get('authToken');
    if (!authToken) {
      throw new Error('Token não encontrado. Gere um novo token no Rhitmo.');
    }

    const formData = new FormData();
    // Use 'file' field name to match backend contract
    formData.append('file', blob, `meet-auto-${Date.now()}.webm`);

    const res = await fetch(UPLOAD_FN, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error || `Erro ${res.status}`;
      
      // Provide clear message for auth failures
      if (res.status === 401) {
        throw new Error('Token expirado ou inválido. Gere um novo token no Rhitmo.');
      }
      throw new Error(errMsg);
    }

    console.log('[Rhitmo Offscreen] Upload complete');
    chrome.runtime.sendMessage({ type: 'upload-complete', success: true });
  } catch (err) {
    console.error('[Rhitmo Offscreen] Upload failed:', err);
    chrome.runtime.sendMessage({ type: 'upload-complete', success: false, error: err.message });
  }
}
