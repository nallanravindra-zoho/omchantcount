import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Settings, SENSITIVITY_PRESETS } from '../types';
import { getMilestones } from '../milestones';
import { theme } from '../theme';

interface Props {
  visible: boolean;
  settings: Settings;
  onClose: () => void;
  onChange: (next: Settings) => void;
}

export function SettingsModal({ visible, settings, onClose, onChange }: Props) {
  const [targetText, setTargetText] = useState(String(settings.target));
  const [intervalText, setIntervalText] = useState(String(settings.interval));

  // The modal stays mounted (just hidden) between opens, so resync the text fields to the
  // real settings each time it opens rather than trusting whatever was last typed/loaded.
  useEffect(() => {
    if (visible) {
      setTargetText(String(settings.target));
      setIntervalText(String(settings.interval));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const commitTarget = () => {
    const n = Math.max(1, Math.round(Number(targetText)) || settings.target);
    setTargetText(String(n));
    onChange({ ...settings, target: n });
  };

  const commitInterval = () => {
    const n = Math.max(1, Math.round(Number(intervalText)) || settings.interval);
    setIntervalText(String(n));
    onChange({ ...settings, interval: n });
  };

  // Closing the modal (Done, backdrop, or the hardware/gesture back action) must not silently
  // discard a value that was typed but never blurred — commit both fields together in one
  // update so neither overwrites the other, then close.
  const handleRequestClose = () => {
    const target = Math.max(1, Math.round(Number(targetText)) || settings.target);
    const interval = Math.max(1, Math.round(Number(intervalText)) || settings.interval);
    setTargetText(String(target));
    setIntervalText(String(interval));
    onChange({ ...settings, target, interval });
    onClose();
  };

  const previewMilestones = getMilestones(
    Math.max(1, Math.round(Number(intervalText)) || settings.interval),
    Math.max(1, Math.round(Number(targetText)) || settings.target)
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleRequestClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.title}>Settings</Text>

            <Text style={styles.label}>Total chants</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={targetText}
              onChangeText={setTargetText}
              onBlur={commitTarget}
              onSubmitEditing={commitTarget}
              placeholderTextColor={theme.textDim}
            />

            <Text style={styles.label}>Remind every</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={intervalText}
              onChangeText={setIntervalText}
              onBlur={commitInterval}
              onSubmitEditing={commitInterval}
              placeholderTextColor={theme.textDim}
            />
            <Text style={styles.hint}>Reminders at: {previewMilestones.join(', ')}</Text>

            <Text style={styles.label}>Reminder style</Text>
            <View style={styles.row}>
              <SegmentButton
                label="Spoken number"
                active={settings.reminderMode === 'voice'}
                onPress={() => onChange({ ...settings, reminderMode: 'voice' })}
              />
              <SegmentButton
                label="Chime + vibration"
                active={settings.reminderMode === 'chime'}
                onPress={() => onChange({ ...settings, reminderMode: 'chime' })}
              />
            </View>

            <Text style={styles.label}>Mic sensitivity</Text>
            <View style={styles.wrapRow}>
              {SENSITIVITY_PRESETS.map((preset) => (
                <SegmentButton
                  key={preset.value}
                  label={preset.label}
                  active={settings.sensitivity === preset.value}
                  onPress={() => onChange({ ...settings, sensitivity: preset.value })}
                />
              ))}
            </View>
            <Text style={styles.hint}>
              If quiet background noise gets counted, choose a firmer setting. If soft chants are
              missed, choose a more sensitive one.
            </Text>
          </ScrollView>

          <Pressable style={styles.doneButton} onPress={handleRequestClose}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.segment, active && styles.segmentActive]} onPress={onPress}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.bgElevated,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  title: {
    color: theme.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  label: {
    color: theme.textDim,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 18,
    marginBottom: 8,
  },
  input: {
    backgroundColor: theme.bg,
    color: theme.text,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
  },
  hint: {
    color: theme.textDim,
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  segment: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.track,
  },
  segmentActive: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  segmentText: {
    color: theme.textDim,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: theme.bg,
  },
  doneButton: {
    marginTop: 12,
    backgroundColor: theme.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneText: {
    color: theme.bg,
    fontSize: 16,
    fontWeight: '700',
  },
});
