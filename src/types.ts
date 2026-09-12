export type ReminderMode = 'voice' | 'chime';

/** 'auto' measures the room's noise floor each time you press Start and sets the threshold relative to it. */
export type Sensitivity = number | 'auto';

export interface Settings {
  /** Total number of chants to count up to (e.g. 108). */
  target: number;
  /** Announce every Nth count (e.g. 27 -> reminders at 27, 54, 81, 108). */
  interval: number;
  reminderMode: ReminderMode;
  /** Microphone level (dB) above which sound is considered a chant, or 'auto' to calibrate from ambient noise. Less negative = requires a louder sound. */
  sensitivity: Sensitivity;
}

export const DEFAULT_SETTINGS: Settings = {
  target: 108,
  interval: 27,
  reminderMode: 'voice',
  sensitivity: 'auto',
};

export const SENSITIVITY_PRESETS: { label: string; value: Sensitivity }[] = [
  { label: 'Auto (recommended)', value: 'auto' },
  { label: 'Very sensitive', value: -45 },
  { label: 'Sensitive', value: -35 },
  { label: 'Normal', value: -28 },
  { label: 'Firm voice only', value: -20 },
];
