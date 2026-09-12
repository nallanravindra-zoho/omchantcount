import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { ReminderMode } from './types';

const chimeSource = require('../assets/sounds/chime.wav');
const completeSource = require('../assets/sounds/complete.wav');

let chimePlayer: AudioPlayer | null = null;
let completePlayer: AudioPlayer | null = null;

function getChimePlayer(): AudioPlayer {
  if (!chimePlayer) chimePlayer = createAudioPlayer(chimeSource);
  return chimePlayer;
}

function getCompletePlayer(): AudioPlayer {
  if (!completePlayer) completePlayer = createAudioPlayer(completeSource);
  return completePlayer;
}

function playFromStart(player: AudioPlayer) {
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // Ignore playback errors (e.g. audio session momentarily unavailable).
  }
}

/** Approximate playback length of the bundled feedback sounds, with a safety margin. */
const CHIME_DURATION_MS = 750;
const COMPLETE_DURATION_MS = 900;

/**
 * Fires the configured feedback for a milestone or the final completed count, and resolves
 * once it has finished playing — callers use this to briefly pause listening so the phone
 * doesn't hear its own spoken number or chime and miscount it as a chant.
 */
export function announceMilestone(
  mode: ReminderMode,
  count: number,
  isFinal: boolean
): Promise<void> {
  Haptics.notificationAsync(
    isFinal ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
  ).catch(() => {});

  if (mode === 'voice') {
    return new Promise((resolve) => {
      Speech.speak(isFinal ? `${count}. Complete.` : String(count), {
        rate: 0.95,
        onDone: () => resolve(),
        onStopped: () => resolve(),
        onError: () => resolve(),
      });
    });
  }

  playFromStart(isFinal ? getCompletePlayer() : getChimePlayer());
  const durationMs = isFinal ? COMPLETE_DURATION_MS : CHIME_DURATION_MS;
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}
