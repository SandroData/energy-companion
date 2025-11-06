// Place shared logic here – pure TS, no React/DOM.
// Example stubs we’ll flesh out soon:

export type Preference = {
  sports: string[];
  preferOutdoor?: boolean;
  preferredWindow?: 'morning' | 'afternoon' | 'evening';
};

export function pickDurationBucket(mins: number): 'short'|'medium'|'long' {
  if (mins < 20) return 'short';
  if (mins < 45) return 'medium';
  return 'long';
}

// Example future: compute a simple readiness score
export function readinessScore(params: {
  avgSleep?: number; // hrs
  mood?: number;     // 1-5
  recentLoad?: number; // mins last 3d
}) {
  const mood = params.mood ?? 3;
  const sleep = params.avgSleep ?? 7;
  const load = params.recentLoad ?? 0;

  const base = mood * 20; // 0..100
  const sleepAdj = Math.max(Math.min((sleep - 7) * 5, 10), -10);
  const loadAdj = load > 240 ? -10 : load > 120 ? -5 : 0;

  return Math.max(0, Math.min(100, Math.round(base + sleepAdj + loadAdj)));
}
