type TimedEventSettings = {
  picks_locked?: boolean | null;
  pick_lock_time?: string | null;
  mvp_open_time?: string | null;
  mvp_voting_closed?: boolean | null;
};

export type EventPhase = "picks" | "intermission" | "mvp" | "closed";

export function getEventPhase(
  settings: TimedEventSettings | null | undefined,
  now = Date.now(),
): EventPhase {
  const pickLock = settings?.pick_lock_time
    ? Date.parse(settings.pick_lock_time)
    : Number.POSITIVE_INFINITY;
  const mvpOpen = settings?.mvp_open_time
    ? Date.parse(settings.mvp_open_time)
    : Number.POSITIVE_INFINITY;

  if (now >= mvpOpen) {
    return settings?.mvp_voting_closed ? "closed" : "mvp";
  }
  if (settings?.picks_locked || now >= pickLock) return "intermission";
  return "picks";
}
