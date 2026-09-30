// On-device voice recording for the speaking steps: the child records up to a minute and plays it back.
// The sound stays in this screen's memory (a Blob behind an object URL) and is never sent or stored;
// leaving the step, hiding the tab or unmounting stops the microphone and drops the recording.
import { useCallback, useEffect, useRef, useState } from 'react';

export type RecorderState = 'idle' | 'recording' | 'recorded' | 'unsupported' | 'denied';

/** Longest single recording. */
export const MAX_RECORDING_MS = 60_000;

/** Formats the browser can record, most preferred first (webm/opus in Chromium, mp4/aac in Safari on iPad). */
const MIME_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];

export function pickMimeType(isSupported: (type: string) => boolean): string | undefined {
  return MIME_TYPES.find((type) => isSupported(type));
}

function recordingSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== 'undefined';
}

export interface VoiceRecorder {
  state: RecorderState;
  /** Object URL of the last recording, for an <audio> element. */
  url: string | null;
  /** Whole seconds left while recording. */
  secondsLeft: number;
  start: () => Promise<void>;
  stop: () => void;
}

export function useVoiceRecorder(maxMs: number = MAX_RECORDING_MS): VoiceRecorder {
  const [state, setState] = useState<RecorderState>(() => (recordingSupported() ? 'idle' : 'unsupported'));
  const [url, setUrl] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(maxMs / 1000));
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  /** Countdown tick and the one-minute limit of the recording in progress. */
  const tick = useRef<number | undefined>(undefined);
  const limit = useRef<number | undefined>(undefined);
  const urlRef = useRef<string | null>(null);

  const clearTimers = (): void => {
    window.clearInterval(tick.current);
    window.clearTimeout(limit.current);
  };
  const releaseMicrophone = (): void => {
    for (const track of stream.current?.getTracks() ?? []) track.stop();
    stream.current = null;
  };
  const dropRecording = (): void => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setUrl(null);
  };

  const stop = useCallback((): void => {
    clearTimers();
    if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop();
    else releaseMicrophone();
  }, []);

  const start = useCallback(async (): Promise<void> => {
    if (!recordingSupported()) {
      setState('unsupported');
      return;
    }
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState('denied');
      return;
    }
    dropRecording();
    stream.current = media;
    const mimeType = pickMimeType((type) => MediaRecorder.isTypeSupported(type));
    const rec = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    rec.onstop = () => {
      releaseMicrophone();
      recorder.current = null;
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' });
      const next = URL.createObjectURL(blob);
      urlRef.current = next;
      setUrl(next);
      setState('recorded');
    };
    recorder.current = rec;
    rec.start();
    setState('recording');
    const startedAt = Date.now();
    setSecondsLeft(Math.round(maxMs / 1000));
    tick.current = window.setInterval(() => setSecondsLeft(Math.max(0, Math.round((maxMs - (Date.now() - startedAt)) / 1000))), 250);
    limit.current = window.setTimeout(stop, maxMs);
  }, [maxMs, stop]);

  useEffect(() => {
    // A hidden tab stops recording, so the microphone is never left open in the background.
    const onHidden = (): void => {
      if (document.visibilityState === 'hidden') stop();
    };
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      clearTimers();
      if (recorder.current && recorder.current.state !== 'inactive') {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      releaseMicrophone();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [stop]);

  return { state, url, secondsLeft, start, stop };
}
