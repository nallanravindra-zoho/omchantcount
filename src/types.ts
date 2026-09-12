export type ReminderMode = 'voice' | 'chime';

export interface Settings {
  /** Total number of chants to count up to (e.g. 108). */
  target: number;
  /** Announce every Nth count (e.g. 27 -> reminders at 27, 54, 81, 108). */
  interval: number;
  reminderMode: ReminderMode;
  /** Microphone level (dB) above which sound is considered a chant. Less negative = requires a louder sound. */
  sensitivity: number;
}

export const DEFAULT_SETTINGS: Settings = {
  target: 108,
  interval: 27,
  reminderMode: 'voice',
  sensitivity: -35,
};

export const SENSITIVITY_PRESETS: { label: string; value: number }[] = [
  { label: 'Very sensitive', value: -45 },
  { label: 'Sensitive', value: -35 },
  { label: 'Normal', value: -28 },
  { label: 'Firm voice only', value: -20 },
];
