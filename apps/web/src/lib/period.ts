export type Period = 'day' | 'week' | 'month' | 'year';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const dayIndex = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dayIndex);
  return d;
}

function endOfWeek(date: Date): Date {
  const d = startOfWeek(date);
  d.setDate(d.getDate() + 6);
  return endOfDay(d);
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function endOfYear(date: Date): Date {
  return endOfDay(new Date(date.getFullYear(), 11, 31));
}

export function periodRange(period: Period, referenceDate: Date): { start: Date; end: Date } {
  switch (period) {
    case 'day':
      return { start: startOfDay(referenceDate), end: endOfDay(referenceDate) };
    case 'week':
      return { start: startOfWeek(referenceDate), end: endOfWeek(referenceDate) };
    case 'month':
      return { start: startOfMonth(referenceDate), end: endOfMonth(referenceDate) };
    case 'year':
      return { start: startOfYear(referenceDate), end: endOfYear(referenceDate) };
  }
}

export function shiftPeriod(period: Period, referenceDate: Date, delta: number): Date {
  const d = new Date(referenceDate);
  switch (period) {
    case 'day':
      d.setDate(d.getDate() + delta);
      break;
    case 'week':
      d.setDate(d.getDate() + delta * 7);
      break;
    case 'month':
      d.setMonth(d.getMonth() + delta);
      break;
    case 'year':
      d.setFullYear(d.getFullYear() + delta);
      break;
  }
  return d;
}

export function formatPeriodLabel(period: Period, referenceDate: Date): string {
  const { start, end } = periodRange(period, referenceDate);
  switch (period) {
    case 'day':
      return start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    case 'week':
      return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
    case 'month':
      return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    case 'year':
      return `${start.getFullYear()}`;
  }
}
