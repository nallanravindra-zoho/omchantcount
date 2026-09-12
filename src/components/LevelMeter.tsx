import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../theme';

const MIN_DB = -60;
const MAX_DB = 0;

function clampToFraction(db: number) {
  const clamped = Math.max(MIN_DB, Math.min(MAX_DB, db));
  return (clamped - MIN_DB) / (MAX_DB - MIN_DB);
}

export function LevelMeter({ level, threshold }: { level: number; threshold: number }) {
  const levelFraction = clampToFraction(level);
  const thresholdFraction = clampToFraction(threshold);

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${levelFraction * 100}%` }]} />
      <View style={[styles.thresholdMarker, { left: `${thresholdFraction * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.track,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    height: '100%',
    backgroundColor: theme.accent,
    borderRadius: 5,
  },
  thresholdMarker: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 16,
    backgroundColor: theme.text,
    opacity: 0.6,
  },
});
