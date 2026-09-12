import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
} from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { getMilestones } from './milestones';
import { announceMilestone } from './feedback';
import { Settings } from './types';

const METERING_POLL_MS = 100;
/** A sound must stay above threshold this long before it counts as a chant starting (filters clicks/pops). */
const MIN_SOUND_MS = 150;
/** Silence must last this long before a chant is considered finished and counted. */
const MIN_SILENCE_MS = 350;
const SILENCE_DB = -160;

export type Phase = 'idle' | 'listening' | 'complete';

const recordingOptions = { ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true };

export function useChantCounter(settings: Settings) {
  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder, METERING_POLL_MS);

  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [level, setLevel] = useState(SILENCE_DB);

  const phaseRef = useRef<Phase>('idle');
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const milestonesRef = useRef(getMilestones(settings.interval, settings.target));
  useEffect(() => {
    milestonesRef.current = getMilestones(settings.interval, settings.target);
  }, [settings.interval, settings.target]);

  // Voice-activity-detection state (kept in refs since it's updated on every metering tick).
  const inSound = useRef(false);
  const soundStartedAt = useRef<number | null>(null);
  const silenceStartedAt = useRef<number | null>(null);

  const stopRecorderQuietly = useCallback(async () => {
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
    } catch {
      // Recorder may already be stopped; nothing to do.
    }
  }, [recorder]);

  const handleCompleted = useCallback(async () => {
    setPhase('complete');
    await stopRecorderQuietly();
    deactivateKeepAwake().catch(() => {});
    announceMilestone(settingsRef.current.reminderMode, settingsRef.current.target, true);
  }, [stopRecorderQuietly]);

  // React to count changes: fire milestone/completion feedback exactly once per change.
  useEffect(() => {
    if (count === 0) return;
    const { target, reminderMode } = settingsRef.current;
    if (count >= target) {
      handleCompleted();
    } else if (milestonesRef.current.includes(count)) {
      announceMilestone(reminderMode, count, false);
    }
  }, [count, handleCompleted]);

  const registerChantEnd = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  // Process each metering tick through a simple hysteresis-based voice-activity detector:
  // a chant "ends" (and is counted) once the level drops back below threshold for MIN_SILENCE_MS.
  useEffect(() => {
    if (phase !== 'listening') return;
    if (recorderState.metering === undefined) return;

    const db = recorderState.metering;
    setLevel(db);
    const now = Date.now();
    const threshold = settingsRef.current.sensitivity;

    if (db > threshold) {
      silenceStartedAt.current = null;
      if (!inSound.current) {
        if (soundStartedAt.current === null) soundStartedAt.current = now;
        if (now - soundStartedAt.current >= MIN_SOUND_MS) {
          inSound.current = true;
        }
      }
    } else {
      soundStartedAt.current = null;
      if (inSound.current) {
        if (silenceStartedAt.current === null) silenceStartedAt.current = now;
        if (now - silenceStartedAt.current >= MIN_SILENCE_MS) {
          inSound.current = false;
          silenceStartedAt.current = null;
          registerChantEnd();
        }
      }
    }
  }, [recorderState.metering, phase, registerChantEnd]);

  const start = useCallback(async () => {
    let permission = await getRecordingPermissionsAsync();
    if (!permission.granted) {
      permission = await requestRecordingPermissionsAsync();
    }
    if (!permission.granted) {
      setPermissionDenied(true);
      return;
    }
    setPermissionDenied(false);

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    });

    inSound.current = false;
    soundStartedAt.current = null;
    silenceStartedAt.current = null;

    await recorder.prepareToRecordAsync();
    recorder.record();
    activateKeepAwakeAsync().catch(() => {});
    setPhase('listening');
  }, [recorder]);

  const pause = useCallback(async () => {
    await stopRecorderQuietly();
    deactivateKeepAwake().catch(() => {});
    setPhase('idle');
  }, [stopRecorderQuietly]);

  const reset = useCallback(async () => {
    await stopRecorderQuietly();
    deactivateKeepAwake().catch(() => {});
    inSound.current = false;
    soundStartedAt.current = null;
    silenceStartedAt.current = null;
    setLevel(SILENCE_DB);
    setCount(0);
    setPhase('idle');
  }, [stopRecorderQuietly]);

  useEffect(() => {
    return () => {
      stopRecorderQuietly();
      deactivateKeepAwake().catch(() => {});
    };
  }, [stopRecorderQuietly]);

  return {
    count,
    phase,
    level,
    permissionDenied,
    milestones: milestonesRef.current,
    start,
    pause,
    reset,
  };
}
