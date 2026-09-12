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

/** Fires the configured feedback for a milestone or the final completed count. */
export function announceMilestone(mode: ReminderMode, count: number, isFinal: boolean) {
  Haptics.notificationAsync(
    isFinal ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
  ).catch(() => {});

  if (mode === 'voice') {
    Speech.speak(isFinal ? `${count}. Complete.` : String(count), { rate: 0.95 });
  } else {
    playFromStart(isFinal ? getCompletePlayer() : getChimePlayer());
  }
}
