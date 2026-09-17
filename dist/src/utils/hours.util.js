"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWithinHours = isWithinHours;
function isWithinHours(hours, at = new Date()) {
    if (!hours)
        return false; // no hours set = treat as closed, or flip to true if you'd rather default-open
    const day = at.getDay().toString(); // 0-6
    const ranges = hours[day];
    if (!ranges || ranges.length === 0)
        return false;
    const nowMinutes = at.getHours() * 60 + at.getMinutes();
    return ranges.some(({ start, end }) => {
        const [sh, sm] = start.split(':').map(Number);
        const [eh, em] = end.split(':').map(Number);
        const startMinutes = sh * 60 + sm;
        const endMinutes = eh * 60 + em;
        return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    });
}
//# sourceMappingURL=hours.util.js.map