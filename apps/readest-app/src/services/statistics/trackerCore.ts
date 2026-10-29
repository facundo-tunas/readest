import type { StatsTrackingConfig } from '@/types/statistics';

interface PendingEvent {
  page: number;
  startTime: number; // Unix seconds
  totalPages: number;
}

export interface FlushedEvent {
  page: number;
  startTime: number;
  duration: number;
  totalPages: number;
}

/**
 * Pure page-dwell tracker. The React layer feeds it `nowSeconds` and the
 * current `(page, totalPages)`; it returns zero-or-one immutable events to
 * persist. Events end on page-change / idle / hide / close. Each returned
 * event is final — its start_time and duration never change afterwards, which
 * lets sync use a simple start_time high-water cursor.
 */
export class TrackerCore {
  private pending: PendingEvent | null = null;
  private sessionSeconds = 0;

  constructor(private readonly cfg: StatsTrackingConfig) {}

  /** Notify the current page at `now`. Returns events flushed by leaving the prior page. */
  onPage(page: number, totalPages: number, now: number): FlushedEvent[] {
    if (this.pending && this.pending.page === page) {
      // Same page (e.g. resume after idle, or a no-op relocate): keep dwelling.
      return [];
    }
    const flushed = this.flush(now);
    this.pending = { page, startTime: now, totalPages };
    return flushed;
  }

  onIdle(now: number): FlushedEvent[] {
    return this.flush(now); // flush + pause (pending cleared)
  }

  onHide(now: number): FlushedEvent[] {
    return this.flush(now);
  }

  onClose(now: number): FlushedEvent[] {
    return this.flush(now);
  }

  /**
   * Active reading time accumulated since this tracker started, including the
   * current page's dwell. This is the same clock the persisted events use, so
   * the reading timer and statistics stay in sync.
   */
  getSessionSeconds(now: number): number {
    const p = this.pending;
    if (!p) return this.sessionSeconds;
    const raw = Math.max(now - p.startTime, 0);
    return this.sessionSeconds + Math.min(raw, this.cfg.maxEventSeconds);
  }

  /** Add elapsed time from another reading clock, such as TTS playback. */
  addSessionSeconds(seconds: number): void {
    this.sessionSeconds += Math.max(seconds, 0);
  }

  private flush(now: number): FlushedEvent[] {
    const p = this.pending;
    this.pending = null;
    if (!p) return [];
    const raw = now - p.startTime;
    const duration = Math.min(Math.max(raw, 0), this.cfg.maxEventSeconds);
    this.sessionSeconds += duration;
    if (duration < this.cfg.minEventSeconds) return [];
    return [{ page: p.page, startTime: p.startTime, duration, totalPages: p.totalPages }];
  }
}
