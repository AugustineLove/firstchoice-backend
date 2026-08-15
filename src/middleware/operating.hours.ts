// middleware/operatingHours.ts
import { Request, Response, NextFunction } from 'express';
import { getOperatingStatus } from '../services/setting.service';
import { formatTime } from '../utils/operatingHours.util';


interface TimeWindow {
  start: string; // 'HH:mm'
  end: string;   // 'HH:mm'
}

// 0 = Sunday ... 6 = Saturday, matching Date#getDay()
const OPERATING_HOURS: Record<number, TimeWindow[]> = {
  0: [{ start: '12:00', end: '22:00' }],                              // Sun
  1: [{ start: '08:00', end: '17:30' }, { start: '20:30', end: '22:00' }], // Mon
  2: [{ start: '08:00', end: '22:00' }],                              // Tue
  3: [{ start: '08:00', end: '17:30' }, { start: '20:30', end: '22:00' }], // Wed
  4: [{ start: '08:00', end: '22:00' }],                              // Thu
  5: [{ start: '08:00', end: '17:30' }, { start: '20:30', end: '22:00' }], // Fri
  6: [{ start: '08:00', end: '22:00' }],                              // Sat
};

const TIMEZONE = 'Africa/Accra';

function getAccraDayAndMinutes(): { day: number; minutes: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const weekdayStr = parts.find(p => p.type === 'weekday')!.value;
  const hour = parseInt(parts.find(p => p.type === 'hour')!.value, 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')!.value, 10);

  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: dayMap[weekdayStr], minutes: hour * 60 + minute };
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function isWithinOperatingHours(): { open: boolean; nextWindow?: TimeWindow } {
  const { day, minutes } = getAccraDayAndMinutes();
  const windows = OPERATING_HOURS[day] || [];

  for (const w of windows) {
    if (minutes >= toMinutes(w.start) && minutes < toMinutes(w.end)) {
      return { open: true };
    }
  }

  // find the next window today that hasn't started yet, for a friendlier message
  const upcoming = windows.find(w => toMinutes(w.start) > minutes);
  return { open: false, nextWindow: upcoming };
}

// middleware/operatingHours.ts

export async function requireOperatingHours(req: Request, res: Response, next: NextFunction) {
  try {
    const { open, nextWindow } = await getOperatingStatus();

    if (!open) {
      return res.status(403).json({
        success: false,
        message: nextWindow
          ? `We're currently closed. We'll reopen today at ${formatTime(nextWindow.start)}.`
          : `We're currently closed. Please check back during our working hours.`,
      });
    }

    next();
  } catch (err) {
    // A DB/cache hiccup here shouldn't block every order in the app —
    // log it and let the request through rather than fail-closed.
    console.error('[operatingHours] check failed, allowing request through:', err);
    next();
  }
}