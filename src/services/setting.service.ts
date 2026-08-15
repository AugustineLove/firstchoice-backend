// services/setting.service.ts
import { Prisma } from '@prisma/client';
import { prisma } from '../config/prisma';
import {
  TimeWindow,
  DEFAULT_OPERATING_HOURS,
  isWithinOperatingHours,
  validateOperatingHours,
} from '../utils/operatingHours.util';

const SETTINGS_ID = 1;

// Short in-memory cache so the operating-hours middleware isn't hitting the
// DB on every single request. Every write in this file calls
// invalidateSettingsCache() so changes still take effect immediately,
// not after the TTL.
let cache: { data: any; expiresAt: number } | null = null;
const CACHE_TTL_MS = 15_000;

export function invalidateSettingsCache() {
  cache = null;
}

export async function getSettings() {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  let settings = await prisma.settings.findUnique({
    where: { id: SETTINGS_ID },
    include: { errandPickupLocation: true },
  });
  if (!settings) {
    settings = await prisma.settings.create({
      data: { id: SETTINGS_ID },
      include: { errandPickupLocation: true },
    });
  }

  cache = { data: settings, expiresAt: Date.now() + CACHE_TTL_MS };
  return settings;
}

// ─── ERRAND PRICING (existing) ────────────────────────────

export async function updateSettings(data: Partial<{
  errandPricingMode: 'FIXED' | 'PER_ITEM';
  errandFixedPrice: number;
  errandPerItemPrice: number;
  errandPickupLocationId: string | null;
}>) {
  await getSettings(); // ensures the row exists before update
  const updated = await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data,
    include: { errandPickupLocation: true },
  });
  invalidateSettingsCache();
  return updated;
}

// Shape exposed to the customer app — decoupled from DB field names
export async function getErrandPricingForCustomers() {
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

export async function updateOperatingHours(hours: Record<string, TimeWindow[]>) {
  if (!validateOperatingHours(hours)) {
    throw new Error('Invalid operating hours format');
  }
  const updated = await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data: { operatingHours: hours as unknown as Prisma.InputJsonValue },
  });
  invalidateSettingsCache();
  return updated;
}

// Called by the middleware and by the public status endpoint.
// Also self-heals an expired override so callers never see a stale one.
export async function getOperatingStatus() {
  const settings = await getSettings();

  if (settings.overrideActive) {
    const expired = settings.overrideExpiresAt && settings.overrideExpiresAt.getTime() <= Date.now();
    if (expired) {
      await prisma.settings.update({
        where: { id: SETTINGS_ID },
        data: { overrideActive: false, overrideExpiresAt: null },
      });
      invalidateSettingsCache();
    } else {
      return {
        open: true,
        overrideActive: true,
        overrideExpiresAt: settings.overrideExpiresAt,
        hours: settings.operatingHours || DEFAULT_OPERATING_HOURS,
      };
    }
  }

  const hours = (settings.operatingHours as Record<string, TimeWindow[]>) || DEFAULT_OPERATING_HOURS;
  const { open, nextWindow } = isWithinOperatingHours(hours);

  return { open, overrideActive: false, overrideExpiresAt: null, nextWindow, hours };
}

export async function setOperatingOverride(durationMinutes: number) {
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0 || durationMinutes > 24 * 60) {
    throw new Error('Duration must be between 1 minute and 24 hours');
  }
  const overrideExpiresAt = new Date(Date.now() + durationMinutes * 60_000);
  const updated = await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data: { overrideActive: true, overrideExpiresAt },
  });
  invalidateSettingsCache();
  return updated;
}

export async function clearOperatingOverride() {
  const updated = await prisma.settings.update({
    where: { id: SETTINGS_ID },
    data: { overrideActive: false, overrideExpiresAt: null },
  });
  invalidateSettingsCache();
  return updated;
}