/**
 * Clock Adapter
 *
 * Real-time clock implementation for production use.
 * Provides time abstraction for deterministic testing.
 */

import type { Clock } from '@core/ports';

/**
 * Real-time clock implementation that returns actual system time.
 *
 * This is the production clock adapter used in the application.
 * For testing, a mock clock can be injected to control time values.
 *
 * @example
 * ```typescript
 * import { realClock } from '@adapters/clock';
 *
 * const now = realClock.now();
 * console.log(now); // Current system time
 * ```
 */
export const realClock: Clock = {
  /**
   * Returns the current system date and time.
   *
   * @returns A new Date object representing the current moment
   */
  now: () => new Date(),
};
