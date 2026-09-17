"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireOperatingHours = requireOperatingHours;
const setting_service_1 = require("../services/setting.service");
const operatingHours_util_1 = require("../utils/operatingHours.util");
// 0 = Sunday ... 6 = Saturday, matching Date#getDay()
const OPERATING_HOURS = {
    0: [{ start: '12:00', end: '22:00' }], // Sun
    1: [{ start: '08:00', end: '17:30' }, { start: '20:30', end: '22:00' }], // Mon
    2: [{ start: '08:00', end: '22:00' }], // Tue
    3: [{ start: '08:00', end: '17:30' }, { start: '20:30', end: '22:00' }], // Wed
    4: [{ start: '08:00', end: '22:00' }], // Thu
    5: [{ start: '08:00', end: '17:30' }, { start: '20:30', end: '22:00' }], // Fri
    6: [{ start: '08:00', end: '22:00' }], // Sat
};
const TIMEZONE = 'Africa/Accra';
function getAccraDayAndMinutes() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(now);
    const weekdayStr = parts.find(p => p.type === 'weekday').value;
    const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
    const dayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: dayMap[weekdayStr], minutes: hour * 60 + minute };
}
function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}
function isWithinOperatingHours() {
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
async function requireOperatingHours(req, res, next) {
    try {
        const { open, nextWindow } = await (0, setting_service_1.getOperatingStatus)();
        if (!open) {
            return res.status(403).json({
                success: false,
                message: nextWindow
                    ? `We're currently closed. We'll reopen today at ${(0, operatingHours_util_1.formatTime)(nextWindow.start)}.`
                    : `We're currently closed. Please check back during our working hours.`,
            });
        }
        next();
    }
    catch (err) {
        // A DB/cache hiccup here shouldn't block every order in the app —
        // log it and let the request through rather than fail-closed.
        console.error('[operatingHours] check failed, allowing request through:', err);
        next();
    }
}
//# sourceMappingURL=operating.hours.js.map