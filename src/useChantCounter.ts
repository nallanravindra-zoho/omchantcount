import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
/** How long to sample ambient noise before starting, when sensitivity is 'auto'. */
const CALIBRATION_MS = 700;
/** How far above the measured noise floor the auto threshold is set. */
const CALIBRATION_MARGIN_DB = 12;

export type Phase = 'idle' | 'calibrating' | 'listening' | 'complete';

const recordingOptions = { ...RecordingPresets.LOW_QUALITY, isMeteringEnabled: true };

export function useChantCounter(settings: Settings) {
  const recorder = useAudioRecorder(recordingOptions);
  const recorderState = useAudioRecorderState(recorder, METERING_POLL_MS);

  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [level, setLevel] = useState(SILENCE_DB);
  const [startError, setStartError] = useState<string | null>(null);
  const [effectiveThreshold, setEffectiveThreshold] = useState<number>(
    typeof settings.sensitivity === 'number' ? settings.sensitivity : -35
  );

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Recomputed synchronously during render (not a ref updated in an effect) so the UI
  // never lags behind a just-changed interval/target waiting for an unrelated re-render.
  const milestones = useMemo(
    () => getMilestones(settings.interval, settings.target),
    [settings.interval, settings.target]
  );

  // Voice-activity-detection state (kept in refs since it's updated on every metering tick).
  const inSound = useRef(false);
  const soundStartedAt = useRef<number | null>(null);
  const silenceStartedAt = useRef<number | null>(null);

  // Ambient-noise calibration state (only used when sensitivity is 'auto').
  const activeThresholdRef = useRef<number>(effectiveThreshold);
  const calibrationSamples = useRef<number[]>([]);
  const calibrationStartedAt = useRef<number | null>(null);

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
    } else if (milestones.includes(count)) {
      announceMilestone(reminderMode, count, false);
    }
  }, [count, handleCompleted, milestones]);

  const registerChantEnd = useCallback(() => {
    setCount((prev) => prev + 1);
  }, []);

  const calibrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ends calibration and locks in a threshold, however it was triggered (metering tick or safety timeout).
  const finishCalibration = useCallback(() => {
    if (calibrationTimeoutRef.current !== null) {
      clearTimeout(calibrationTimeoutRef.current);
      calibrationTimeoutRef.current = null;
    }
    const floor = calibrationSamples.current.length
      ? Math.max(...calibrationSamples.current)
      : SILENCE_DB;
    const computed = floor + CALIBRATION_MARGIN_DB;
    activeThresholdRef.current = computed;
    setEffectiveThreshold(computed);
    calibrationSamples.current = [];
    calibrationStartedAt.current = null;
    setPhase('listening');
  }, []);

  // Process each metering tick through a simple hysteresis-based voice-activity detector:
  // a chant "ends" (and is counted) once the level drops back below threshold for MIN_SILENCE_MS.
  useEffect(() => {
    if (recorderState.metering === undefined) return;
    if (phase !== 'listening' && phase !== 'calibrating') return;

    const db = recorderState.metering;
    setLevel(db);
    const now = Date.now();

    if (phase === 'calibrating') {
      calibrationSamples.current.push(db);
      if (calibrationStartedAt.current !== null && now - calibrationStartedAt.current >= CALIBRATION_MS) {
        finishCalibration();
      }
      return;
    }

    const threshold = activeThresholdRef.current;

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
  }, [recorderState.metering, phase, registerChantEnd, finishCalibration]);

  const start = useCallback(async () => {
    try {
      setStartError(null);
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

      if (!recorder.isRecording) {
        await recorder.prepareToRecordAsync();
        recorder.record();
      }
      activateKeepAwakeAsync().catch(() => {});

      if (settingsRef.current.sensitivity === 'auto') {
        calibrationSamples.current = [];
        calibrationStartedAt.current = Date.now();
        setPhase('calibrating');
        // Safety net: if metering ticks stall (seen on some emulators/devices), don't hang forever.
        calibrationTimeoutRef.current = setTimeout(finishCalibration, CALIBRATION_MS + 1000);
      } else {
        activeThresholdRef.current = settingsRef.current.sensitivity;
        setEffectiveThreshold(settingsRef.current.sensitivity);
        setPhase('listening');
      }
    } catch (e) {
      console.error('[useChantCounter] start() failed:', e);
      setStartError(
        'Could not start listening. Close any other app using the microphone and try again.'
      );
      setPhase('idle');
    }
  }, [recorder, finishCalibration]);

  const clearCalibration = () => {
    if (calibrationTimeoutRef.current !== null) {
      clearTimeout(calibrationTimeoutRef.current);
      calibrationTimeoutRef.current = null;
    }
    calibrationSamples.current = [];
    calibrationStartedAt.current = null;
  };

  const pause = useCallback(async () => {
    await stopRecorderQuietly();
    deactivateKeepAwake().catch(() => {});
    clearCalibration();
    setPhase('idle');
  }, [stopRecorderQuietly]);

  const reset = useCallback(async () => {
    await stopRecorderQuietly();
    deactivateKeepAwake().catch(() => {});
    inSound.current = false;
    soundStartedAt.current = null;
    silenceStartedAt.current = null;
    clearCalibration();
    setLevel(SILENCE_DB);
    setCount(0);
    setPhase('idle');
  }, [stopRecorderQuietly]);

  useEffect(() => {
    return () => {
      stopRecorderQuietly();
      deactivateKeepAwake().catch(() => {});
      clearCalibration();
    };
  }, [stopRecorderQuietly]);

  return {
    count,
    phase,
    level,
    permissionDenied,
    startError,
    effectiveThreshold,
    milestones,
    start,
    pause,
    reset,
  };
}
