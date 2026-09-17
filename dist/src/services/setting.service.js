"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateSettingsCache = invalidateSettingsCache;
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
exports.getErrandPricingForCustomers = getErrandPricingForCustomers;
exports.updateOperatingHours = updateOperatingHours;
exports.getOperatingStatus = getOperatingStatus;
exports.setOperatingOverride = setOperatingOverride;
exports.clearOperatingOverride = clearOperatingOverride;
exports.updateClosingStatus = updateClosingStatus;
const prisma_1 = require("../config/prisma");
const operatingHours_util_1 = require("../utils/operatingHours.util");
const SETTINGS_ID = 1;
// Short in-memory cache so the operating-hours middleware isn't hitting the
// DB on every single request. Every write in this file calls
// invalidateSettingsCache() so changes still take effect immediately,
// not after the TTL.
let cache = null;
const CACHE_TTL_MS = 15000;
function invalidateSettingsCache() {
    cache = null;
}
async function getSettings() {
    if (cache && cache.expiresAt > Date.now())
        return cache.data;
    let settings = await prisma_1.prisma.settings.findUnique({
        where: { id: SETTINGS_ID },
        include: { errandPickupLocation: true },
    });
    if (!settings) {
        settings = await prisma_1.prisma.settings.create({
            data: { id: SETTINGS_ID },
            include: { errandPickupLocation: true },
        });
    }
    cache = { data: settings, expiresAt: Date.now() + CACHE_TTL_MS };
    return settings;
}
// ─── ERRAND PRICING (existing) ────────────────────────────
async function updateSettings(data) {
    await getSettings(); // ensures the row exists before update
    const updated = await prisma_1.prisma.settings.update({
        where: { id: SETTINGS_ID },
        data,
        include: { errandPickupLocation: true },
    });
    invalidateSettingsCache();
    return updated;
}
// Shape exposed to the customer app — decoupled from DB field names
async function getErrandPricingForCustomers() {
    const s = await getSettings();
    return {
        pricingMode: s.errandPricingMode,
        fixedPrice: s.errandFixedPrice,
        perItemPrice: s.errandPerItemPrice,
        pickupLocation: s.errandPickupLocation
            ? {
                id: s.errandPickupLocation.id,
                name: s.errandPickupLocation.name,
                address: s.errandPickupLocation.address,
                latitude: s.errandPickupLocation.latitude,
                longitude: s.errandPickupLocation.longitude,
            }
            : null,
    };
}
// ─── OPERATING HOURS ──────────────────────────────────────
async function updateOperatingHours(hours) {
    if (!(0, operatingHours_util_1.validateOperatingHours)(hours)) {
        throw new Error('Invalid operating hours format');
    }
    const updated = await prisma_1.prisma.settings.update({
        where: { id: SETTINGS_ID },
        data: { operatingHours: hours },
    });
    invalidateSettingsCache();
    return updated;
}
// Called by the middleware and by the public status endpoint.
// Also self-heals an expired override so callers never see a stale one.
async function getOperatingStatus() {
    const settings = await getSettings();
    // Check if manually closed
    if (settings.isClosed) {
        return {
            open: false,
            overrideActive: false,
            overrideExpiresAt: null,
            hours: settings.operatingHours || operatingHours_util_1.DEFAULT_OPERATING_HOURS,
            isClosed: true,
            closedMessage: settings.closedMessage || 'We are currently not accepting orders. Please check back later.',
        };
    }
    if (settings.overrideActive) {
        const expired = settings.overrideExpiresAt && settings.overrideExpiresAt.getTime() <= Date.now();
        if (expired) {
            await prisma_1.prisma.settings.update({
                where: { id: SETTINGS_ID },
                data: { overrideActive: false, overrideExpiresAt: null },
            });
            invalidateSettingsCache();
        }
        else {
            return {
                open: true,
                overrideActive: true,
                overrideExpiresAt: settings.overrideExpiresAt,
                hours: settings.operatingHours || operatingHours_util_1.DEFAULT_OPERATING_HOURS,
                isClosed: false,
                closedMessage: null,
            };
        }
    }
    const hours = settings.operatingHours || operatingHours_util_1.DEFAULT_OPERATING_HOURS;
    const { open, nextWindow } = (0, operatingHours_util_1.isWithinOperatingHours)(hours);
    return {
        open,
        overrideActive: false,
        overrideExpiresAt: null,
        nextWindow,
        hours,
        isClosed: false,
        closedMessage: null,
    };
}
async function setOperatingOverride(durationMinutes) {
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 24 * 60) {
        throw new Error('Duration must be between 1 minute and 24 hours');
    }
    const overrideExpiresAt = new Date(Date.now() + durationMinutes * 60000);
    const updated = await prisma_1.prisma.settings.update({
        where: { id: SETTINGS_ID },
        data: { overrideActive: true, overrideExpiresAt },
    });
    invalidateSettingsCache();
    return updated;
}
async function clearOperatingOverride() {
    const updated = await prisma_1.prisma.settings.update({
        where: { id: SETTINGS_ID },
        data: { overrideActive: false, overrideExpiresAt: null },
    });
    invalidateSettingsCache();
    return updated;
}
// ─── CLOSING MESSAGE ──────────────────────────────────────
async function updateClosingStatus(isClosed, closedMessage) {
    const data = { isClosed };
    if (isClosed && closedMessage) {
        data.closedMessage = closedMessage;
    }
    else if (!isClosed) {
        data.closedMessage = null;
    }
    const updated = await prisma_1.prisma.settings.update({
        where: { id: SETTINGS_ID },
        data,
    });
    invalidateSettingsCache();
    return updated;
}
//# sourceMappingURL=setting.service.js.map