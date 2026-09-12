/** Computes the reminder checkpoints: every Nth count up to (and always including) the target. */
export function getMilestones(interval: number, target: number): number[] {
  const safeInterval = Math.max(1, Math.floor(interval) || 1);
  const safeTarget = Math.max(1, Math.floor(target) || 1);

  const stops = new Set<number>();
  for (let m = safeInterval; m < safeTarget; m += safeInterval) {
    stops.add(m);
  }
  stops.add(safeTarget);
  return Array.from(stops).sort((a, b) => a - b);
}

export function nextMilestone(count: number, milestones: number[]): number | null {
  for (const m of milestones) {
    if (m > count) return m;
  }
  return null;
}
