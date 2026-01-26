import { useState, useRef, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export type MeetingRecorderState = 'idle' | 'recording' | 'paused' | 'processing';

export interface MeetingChunk {
  index: number;
  blob: Blob;
  base64?: string;
}

export interface MeetingRecorderData {
  chunks: MeetingChunk[];
  totalDuration: number;
  mimeType: string;
  leaderNotes: string;
}

interface UseMeetingRecorderOptions {
  onChunkReady?: (chunk: MeetingChunk) => void;
}

const CHUNK_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_DURATION_SECONDS = 80 * 60; // 1h20m
const MAX_CHUNKS = 8;

export const useMeetingRecorder = (options: UseMeetingRecorderOptions = {}) => {
  const [state, setState] = useState<MeetingRecorderState>('idle');
  const [duration, setDuration] = useState(0);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [leaderNotes, setLeaderNotes] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<MeetingChunk[]>([]);
  const currentChunkBlobsRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chunkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mimeTypeRef = useRef<string>('audio/webm');
  const { toast } = useToast();

  // Format duration as MM:SS or HH:MM:SS
  const formatDuration = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Get supported mime type
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    
    return 'audio/webm';
  };

  // Save current chunk
  const saveCurrentChunk = useCallback(() => {
    if (currentChunkBlobsRef.current.length === 0) return;
    
    const chunkBlob = new Blob(currentChunkBlobsRef.current, { type: mimeTypeRef.current });
    const chunk: MeetingChunk = {
      index: chunksRef.current.length,
      blob: chunkBlob,
    };
    
    chunksRef.current.push(chunk);
    currentChunkBlobsRef.current = [];
    setCurrentChunk(chunksRef.current.length);
    
    options.onChunkReady?.(chunk);
  }, [options]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    currentChunkBlobsRef.current = [];
    setDuration(0);
    setCurrentChunk(0);
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      chunksRef.current = [];
      currentChunkBlobsRef.current = [];
      
      // Setup audio analyser for waveform
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const mimeType = getSupportedMimeType();
      mimeTypeRef.current = mimeType;
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          currentChunkBlobsRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(100);
      setState('recording');
      
      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev + 1 >= MAX_DURATION_SECONDS) {
            // Auto-stop at max duration
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      
      // Start chunk timer
      chunkTimerRef.current = setInterval(() => {
        if (chunksRef.current.length < MAX_CHUNKS - 1) {
          saveCurrentChunk();
        }
      }, CHUNK_INTERVAL_MS);
      
    } catch (error: any) {
      console.error('Microphone error:', error);
      
      let message = "Não foi possível acessar o microfone.";
      if (error.name === 'NotAllowedError') {
        message = "Permissão de microfone negada. Habilite nas configurações do navegador.";
      } else if (error.name === 'NotFoundError') {
        message = "Nenhum microfone encontrado.";
      }
      
      toast({
        title: "Erro de microfone",
        description: message,
        variant: "destructive"
      });
    }
  }, [toast, saveCurrentChunk]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setState('paused');
    }
  }, [state]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev + 1 >= MAX_DURATION_SECONDS) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
      setState('recording');
    }
  }, [state]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    cleanup();
    setLeaderNotes('');
    setState('idle');
  }, [cleanup]);

  // Stop recording and return data
  const stopRecording = useCallback((): Promise<MeetingRecorderData> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve({
          chunks: [],
          totalDuration: 0,
          mimeType: mimeTypeRef.current,
          leaderNotes,
        });
        return;
      }
      
      setState('processing');
      
      // Stop timers
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (chunkTimerRef.current) {
        clearInterval(chunkTimerRef.current);
        chunkTimerRef.current = null;
      }
      
      const mediaRecorder = mediaRecorderRef.current;
      const totalDuration = duration;
      
      mediaRecorder.onstop = async () => {
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        // Close audio context
        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        
        // Save any remaining audio as final chunk
        if (currentChunkBlobsRef.current.length > 0) {
          const chunkBlob = new Blob(currentChunkBlobsRef.current, { type: mimeTypeRef.current });
          const chunk: MeetingChunk = {
            index: chunksRef.current.length,
            blob: chunkBlob,
          };
          chunksRef.current.push(chunk);
          currentChunkBlobsRef.current = [];
        }
        
        // Convert all chunks to base64
        const chunksWithBase64 = await Promise.all(
          chunksRef.current.map(async (chunk) => {
            return new Promise<MeetingChunk>((resolveChunk) => {
              const reader = new FileReader();
              reader.readAsDataURL(chunk.blob);
              reader.onloadend = () => {
                const base64 = (reader.result as string).split(',')[1];
                resolveChunk({
                  ...chunk,
                  base64,
                });
              };
            });
          })
        );
        
        const data: MeetingRecorderData = {
          chunks: chunksWithBase64,
          totalDuration,
          mimeType: mimeTypeRef.current,
          leaderNotes,
        };
        
        // Cleanup refs but don't reset state yet
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        
        resolve(data);
      };
      
      mediaRecorder.stop();
    });
  }, [duration, leaderNotes]);

  // Reset to idle state
  const reset = useCallback(() => {
    cleanup();
    setLeaderNotes('');
    setState('idle');
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return {
    state,
    duration,
    currentChunk,
    totalChunks: MAX_CHUNKS,
    leaderNotes,
    setLeaderNotes,
    analyserRef,
    formatDuration,
    maxDuration: MAX_DURATION_SECONDS,
    startRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    stopRecording,
    reset,
  };
};
