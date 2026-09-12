import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DEFAULT_SETTINGS, Settings } from './src/types';
import { loadSettings, saveSettings } from './src/storage';
import { useChantCounter } from './src/useChantCounter';
import { nextMilestone } from './src/milestones';
import { LevelMeter } from './src/components/LevelMeter';
import { SettingsModal } from './src/components/SettingsModal';
import { theme } from './src/theme';

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const { count, phase, level, permissionDenied, milestones, start, pause, reset } =
    useChantCounter(settings);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      setSettingsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (settingsLoaded) saveSettings(settings);
  }, [settings, settingsLoaded]);

  const handleChangeSettings = (next: Settings) => setSettings(next);

  const handlePrimaryPress = () => {
    if (phase === 'listening') {
      pause();
    } else if (phase === 'complete') {
      reset();
    } else {
      start();
    }
  };

  const handleReset = () => {
    if (count === 0) {
      reset();
      return;
    }
    Alert.alert('Restart count?', `This will clear the current count of ${count}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restart', style: 'destructive', onPress: () => reset() },
    ]);
  };

  const upcoming = nextMilestone(count, milestones);
  const progress = Math.min(1, count / settings.target);

  const primaryLabel =
    phase === 'listening' ? 'Pause' : phase === 'complete' ? 'Start again' : count > 0 ? 'Resume' : 'Start';

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Om Count</Text>
        <Pressable
          hitSlop={12}
          onPress={() => setSettingsVisible(true)}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>

      <View style={styles.center}>
        <Text style={styles.count}>{count}</Text>
        <Text style={styles.target}>/ {settings.target}</Text>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.status}>
          {phase === 'listening' && 'Listening…'}
          {phase === 'idle' && count === 0 && 'Ready when you are'}
          {phase === 'idle' && count > 0 && 'Paused'}
          {phase === 'complete' && '108 complete 🙏'}
        </Text>

        {phase === 'listening' && (
          <View style={styles.meterWrap}>
            <LevelMeter level={level} threshold={settings.sensitivity} />
          </View>
        )}

        {phase !== 'complete' && upcoming !== null && (
          <Text style={styles.nextMilestone}>Next reminder at {upcoming}</Text>
        )}

        {permissionDenied && (
          <Pressable
            style={styles.permissionBanner}
            onPress={() => Linking.openSettings()}
          >
            <Text style={styles.permissionText}>
              Microphone access is needed to count chants. Tap to open Settings
              {Platform.OS === 'ios' ? ' > Om Count' : ''}.
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.primaryButton} onPress={handlePrimaryPress}>
          <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
        </Pressable>
        <Pressable style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </Pressable>
      </View>

      <SettingsModal
        visible={settingsVisible}
        settings={settings}
        onChange={handleChangeSettings}
        onClose={() => setSettingsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: '700',
  },
  settingsButton: {
    padding: 6,
  },
  settingsIcon: {
    fontSize: 22,
    color: theme.textDim,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    color: theme.accent,
    fontSize: 96,
    fontWeight: '800',
    lineHeight: 100,
  },
  target: {
    color: theme.textDim,
    fontSize: 20,
    marginTop: -8,
    marginBottom: 24,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.track,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.accent,
    borderRadius: 4,
  },
  status: {
    color: theme.text,
    fontSize: 16,
    marginTop: 20,
  },
  meterWrap: {
    width: '100%',
    marginTop: 16,
  },
  nextMilestone: {
    color: theme.textDim,
    fontSize: 14,
    marginTop: 12,
  },
  permissionBanner: {
    marginTop: 24,
    backgroundColor: theme.danger,
    borderRadius: 12,
    padding: 14,
  },
  permissionText: {
    color: theme.bg,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    paddingBottom: 40,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: theme.accent,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.bg,
    fontSize: 18,
    fontWeight: '700',
  },
  resetButton: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.track,
  },
  resetButtonText: {
    color: theme.textDim,
    fontSize: 15,
    fontWeight: '600',
  },
});
