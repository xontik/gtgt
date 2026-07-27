export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mondayOnOrBefore(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayIndex = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dayIndex);
  return d;
}

function sundayOnOrAfter(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayIndex = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() + (6 - dayIndex));
  return d;
}

/**
 * Monday-start week columns spanning from the Monday on/before `start` to the
 * Sunday on/after `end`. Days outside [start, end] are null so callers can
 * render a blank cell (e.g. a partial grid for a Month view).
 */
export function buildWeekColumns(start: Date, end: Date): (Date | null)[][] {
  const gridStart = mondayOnOrBefore(start);
  const gridEnd = sundayOnOrAfter(end);
  const rangeStart = new Date(start);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(end);
  rangeEnd.setHours(0, 0, 0, 0);

  const weeks: (Date | null)[][] = [];
  let cursor = new Date(gridStart);
  while (cursor <= gridEnd) {
    const week: (Date | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const inRange = cursor >= rangeStart && cursor <= rangeEnd;
      week.push(inRange ? new Date(cursor) : null);
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** Every calendar day from `start` to `end`, inclusive. */
export function eachDayOfRange(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    days.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function heatBucket(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  return Math.min(4, Math.max(1, Math.ceil(ratio * 4))) as 1 | 2 | 3 | 4;
}
