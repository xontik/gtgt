// Home and the exercise detail page only ever need recent history (today's
// totals, last-logged times, streaks, the Coach insights' 21-day trend
// window) - fetching the entire log unconditionally on every visit doesn't
// scale for an app meant for daily use over months/years. 180 days
// comfortably covers realistic streak lengths and recent-activity views
// while still being a large, bounded cut from "everything, forever".
// Stats' Records tab and the Log page's search are deliberately excluded -
// both are genuine full-history use cases.
export const RECENT_HISTORY_DAYS = 180;

export function recentHistorySince(): Date {
  return new Date(Date.now() - RECENT_HISTORY_DAYS * 24 * 60 * 60 * 1000);
}
