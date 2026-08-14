import { prisma } from '../config/prisma';

const SETTINGS_ID = 1;

export async function getSettings() {
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
  return settings;
}

export async function updateSettings(data: Partial<{
  errandPricingMode: 'FIXED' | 'PER_ITEM';
  errandFixedPrice: number;
  errandPerItemPrice: number;
  errandPickupLocationId: string | null;
}>) {
  await getSettings(); // ensures the row exists before update
  return prisma.settings.update({
    where: { id: SETTINGS_ID },
    data,
    include: { errandPickupLocation: true },
  });
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