"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OPERATING_HOURS = exports.TIMEZONE = void 0;
exports.getAccraDayAndMinutes = getAccraDayAndMinutes;
exports.toMinutes = toMinutes;
exports.formatTime = formatTime;
exports.isWithinOperatingHours = isWithinOperatingHours;
exports.validateOperatingHours = validateOperatingHours;
exports.TIMEZONE = 'Africa/Accra';
exports.DEFAULT_OPERATING_HOURS = {
    '0': [{ start: '12:00', end: '22:00' }], // Sun
    '1': [{ start: '08:00', end: '17:30' }, { start: '20:30', end: '22:00' }], // Mon
    '2': [{ start: '08:00', end: '22:00' }], // Tue
    '3': [{ start: '08:00', end: '17:30' }, { start: '20:30', end: '22:00' }], // Wed
    '4': [{ start: '08:00', end: '22:00' }], // Thu
    '5': [{ start: '08:00', end: '17:30' }, { start: '20:30', end: '22:00' }], // Fri
    '6': [{ start: '08:00', end: '22:00' }], // Sat
};
function getAccraDayAndMinutes() {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: exports.TIMEZONE,
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
// '20:30' -> '8:30 PM' — the old code appended "PM" to 24h strings, which
// produced nonsense like "20:30PM". This fixes that.
function formatTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}
function isWithinOperatingHours(hours) {
    const { day, minutes } = getAccraDayAndMinutes();
    const windows = hours[String(day)] || [];
    for (const w of windows) {
        if (minutes >= toMinutes(w.start) && minutes < toMinutes(w.end)) {
            return { open: true };
        }
    }
    const upcoming = windows.find(w => toMinutes(w.start) > minutes);
    return { open: false, nextWindow: upcoming };
}
function validateOperatingHours(hours) {
    if (typeof hours !== 'object' || hours === null)
        return false;
    const timeRe = /^([01]\d|2[0-3]):([0-5]\d)$/;
    for (const [day, windows] of Object.entries(hours)) {
        const dayNum = Number(day);
        if (!Number.isInteger(dayNum) || dayNum < 0 || dayNum > 6)
            return false;
        if (!Array.isArray(windows))
            return false;
        for (const w of windows) {
            if (!w || typeof w !== 'object')
                return false;
            const { start, end } = w;
            if (!timeRe.test(start) || !timeRe.test(end))
                return false;
            if (toMinutes(start) >= toMinutes(end))
                return false;
        }
    }
    return true;
}
//# sourceMappingURL=operatingHours.util.js.map