import { prisma } from '../config/prisma';

// ─── TYPES ───────────────────────────────────────────────

interface VariantGroupInput {
  name: string;
  required?: boolean;
  variants: { name: string; priceAdjustment?: number; available?: boolean; images?: string[] }[];
}

type IncrementMode = 'multiple' | 'free' | 'halves' | 'custom';

interface AddonInput {
  name: string;
  price?: number;
  available?: boolean;
  incrementable?: boolean;
  incrementMode?: IncrementMode | string;
  customIncrementValue?: number;
}

interface AddonGroupInput {
  name: string;
  minSelect?: number;
  maxSelect?: number;
  addons: AddonInput[];
  incrementable?: boolean;
  incrementMode?: string;
  customIncrementValue?: number;
}

interface AttributeInput {
  key: string;
  value: string;
}

interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  stock: number;
  images?: string[];
  category: string;
  available?: boolean;

  // Rich fields
  preparationTime?: number;
  calories?: number;
  weight?: number;
  volume?: number;
  unit?: string;
  brand?: string;
  expiryInfo?: string;
  sku?: string;
  sizes?: string[];
  colors?: string[];
  tags?: string[];
  isPopular?: boolean;
  isFeatured?: boolean;

  // Relations
  variantGroups?: VariantGroupInput[];
  addonGroups?: AddonGroupInput[];
  attributes?: AttributeInput[];
}

// ─── ADDON PRICING NORMALIZATION ─────────────────────────
//
// Pricing formulas (qty = quantity selected, base = addon.price):
//   multiple -> base * qty
//   free     -> base + (qty - 1) * 1
//   halves   -> base + (qty - 1) * (base / 2)
//   custom   -> base + (qty - 1) * customIncrementValue
//
// customIncrementValue only applies to 'custom' mode and is always
// coerced to a positive number (defaulting to 1 if missing/invalid/<=0).

const VALID_INCREMENT_MODES: IncrementMode[] = ['multiple', 'free', 'halves', 'custom'];

function normalizeAddon(a: AddonInput) {
  const incrementable = Boolean(a.incrementable);

  let incrementMode: IncrementMode | null = null;
  if (incrementable) {
    const requested = (a.incrementMode ?? 'multiple') as IncrementMode;
    incrementMode = VALID_INCREMENT_MODES.includes(requested) ? requested : 'multiple';
  }

  let customIncrementValue: number | null = null;
  if (incrementable && incrementMode === 'custom') {
    const raw = Number(a.customIncrementValue);
    customIncrementValue = Number.isFinite(raw) && raw > 0 ? raw : 1;
  }

  return {
    name: a.name,
    price: a.price ?? 0,
    available: a.available ?? true,
    incrementable,
    incrementMode,
    customIncrementValue,
  };
}

// ─── FULL PRODUCT INCLUDE ────────────────────────────────

const fullProductInclude = {
  variantGroups: {
    include: { variants: true },
    orderBy: { id: 'asc' as const },
  },
  addonGroups: {
    include: { addons: true },
    orderBy: { id: 'asc' as const },
  },
  attributes: true,
  vendor: {
    select: {
      id: true,
      businessName: true,
      businessType: true,
      logo: true,
      address: true,
      rating: true,
    },
  },
};

// ─── CREATE ──────────────────────────────────────────────

export async function createProduct(userId: string, data: CreateProductInput) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');
  if (vendor.status !== 'ACTIVE')
    throw new Error('Your vendor account is not active yet');

  const { variantGroups, addonGroups, attributes, ...core } = data;

  return prisma.product.create({
    data: {
      vendorId: vendor.id,
      ...core,
      images: core.images || [],
      sizes:  core.sizes  || [],
      colors: core.colors || [],
      tags:   core.tags   || [],

      ...(variantGroups?.length && {
        variantGroups: {
          create: variantGroups.map(g => ({
            name:     g.name,
            required: g.required ?? true,
            variants: { create: g.variants },
          })),
        },
      }),

      ...(addonGroups?.length && {
        addonGroups: {
          create: addonGroups.map(g => ({
            name:      g.name,
            minSelect: g.minSelect ?? 0,
            maxSelect: g.maxSelect ?? 10,
            addons: { create: g.addons.map(normalizeAddon) },
          })),
        },
      }),

      ...(attributes?.length && {
        attributes: { create: attributes },
      }),
    },
    include: fullProductInclude,
  });
}

// ─── UPDATE ──────────────────────────────────────────────

export async function updateProduct(
  userId: string,
  productId: string,
  data: Partial<CreateProductInput>
) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');

  const product = await prisma.product.findUnique({ where: { id: productId } });
  console.log(`Product: ${product}`)
  if (!product) throw new Error('Product not found');
  if (product.vendorId !== vendor.id) throw new Error('You do not own this product');

  const { variantGroups, addonGroups, attributes, ...core } = data;

  // Increase transaction timeout to 15 seconds
  return prisma.$transaction(async (tx) => {
    // Update core fields
    const updated = await tx.product.update({
      where: { id: productId },
      data: core,
    });

    // Replace variant groups if provided
    if (variantGroups !== undefined) {
      await tx.productVariantGroup.deleteMany({ where: { productId } });
      if (variantGroups.length) {
        await tx.productVariantGroup.createMany({
          data: variantGroups.map(g => ({ productId, name: g.name, required: g.required ?? true })),
        });
        
        // Get created groups and create variants in parallel
        const groups = await tx.productVariantGroup.findMany({ where: { productId } });
        await Promise.all(
          variantGroups.map(async (g) => {
            const group = groups.find(gr => gr.name === g.name);
            if (group && g.variants.length) {
              await tx.productVariant.createMany({
                data: g.variants.map(v => ({ ...v, groupId: group.id })),
              });
            }
          })
        );
      }
    }

    // Replace addon groups if provided
    if (addonGroups !== undefined) {
      await tx.productAddonGroup.deleteMany({ where: { productId } });
      if (addonGroups.length) {
        await tx.productAddonGroup.createMany({
          data: addonGroups.map(g => ({ 
            productId, 
            name: g.name, 
            minSelect: g.minSelect ?? 0, 
            maxSelect: g.maxSelect ?? 10,
            incrementable: Boolean(g.incrementable),
            incrementMode:
              g.incrementable
                ? (g.incrementMode ?? 'multiple')
                : null,
          })),
        });
        
        // Get created groups and create addons in parallel
        const groups = await tx.productAddonGroup.findMany({ where: { productId } });
        await Promise.all(
          addonGroups.map(async (g) => {
            const group = groups.find(gr => gr.name === g.name);
            if (group && g.addons.length) {
              await tx.productAddon.createMany({
                data: g.addons.map(a => ({ ...normalizeAddon(a), groupId: group.id })),
              });
            }
          })
        );
      }
    }

    // Replace attributes if provided
    if (attributes !== undefined) {
      await tx.productAttribute.deleteMany({ where: { productId } });
      if (attributes.length) {
        await tx.productAttribute.createMany({
          data: attributes.map(a => ({ ...a, productId })),
        });
      }
    }

    return tx.product.findUnique({ 
      where: { id: productId }, 
      include: fullProductInclude 
    });
  }, {
    timeout: 15000, // Increase timeout to 15 seconds
    maxWait: 20000, // Maximum time to wait for transaction to acquire lock
  });
}

// ─── DELETE ──────────────────────────────────────────────

export async function deleteProduct(userId: string, productId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');
  if (product.vendorId !== vendor.id) throw new Error('You do not own this product');

  await prisma.product.delete({ where: { id: productId } });
  return { message: 'Product deleted successfully' };
}

// ─── FETCH ───────────────────────────────────────────────

export async function getProductById(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: fullProductInclude,
  });
  if (!product) throw new Error('Product not found');
  return product;
}

export async function getProductsByVendor(vendorId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor) throw new Error('Vendor not found');

  return prisma.product.findMany({
    where: { vendorId, available: true },
    include: fullProductInclude,
    orderBy: [{ isFeatured: 'desc' }, { isPopular: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function getMyProducts(userId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');

  return prisma.product.findMany({
    where: { vendorId: vendor.id },
    include: fullProductInclude,
    orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function searchProducts(query: string, category?: string) {
  return prisma.product.findMany({
    where: {
      available: true,
      vendor: { status: 'ACTIVE' },
      ...(query && {
        OR: [
          { name:        { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { brand:       { contains: query, mode: 'insensitive' } },
          { tags:        { has: query } },
        ],
      }),
      ...(category && { category: { equals: category, mode: 'insensitive' } }),
    },
    include: fullProductInclude,
    orderBy: [{ isFeatured: 'desc' }, { isPopular: 'desc' }],
  });
}

// ─── ADDON/VARIANT MANAGEMENT (granular updates) ─────────

export async function addAddonGroup(userId: string, productId: string, data: AddonGroupInput) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.vendorId !== vendor.id) throw new Error('Product not found');

  return prisma.productAddonGroup.create({
    data: {
      productId,
      name:      data.name,
      minSelect: data.minSelect ?? 0,
      maxSelect: data.maxSelect ?? 10,
      addons: { create: data.addons.map(normalizeAddon) },
    },
    include: { addons: true },
  });
}

export async function deleteAddonGroup(userId: string, groupId: string) {
  const group = await prisma.productAddonGroup.findUnique({
    where: { id: groupId },
    include: { product: true },
  });
  if (!group) throw new Error('Addon group not found');

  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (group.product.vendorId !== vendor?.id) throw new Error('Access denied');

  await prisma.productAddonGroup.delete({ where: { id: groupId } });
  return { message: 'Addon group deleted' };
}

export async function addVariantGroup(userId: string, productId: string, data: VariantGroupInput) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.vendorId !== vendor.id) throw new Error('Product not found');

  return prisma.productVariantGroup.create({
    data: {
      productId,
      name:     data.name,
      required: data.required ?? true,
      variants: { create: data.variants },
    },
    include: { variants: true },
  });
}

// ─── ADDON PRICE CALCULATION (for order pricing) ─────────
//
// Use this wherever an order/cart computes the price of a selected
// addon at a given quantity, so the formula lives in exactly one place.

export function calculateAddonPrice(
  addon: { price: number; incrementable: boolean; incrementMode: string | null; customIncrementValue: number | null },
  qty: number
): number {
  const quantity = Math.max(1, Math.floor(qty));
  const base = addon.price ?? 0;

  if (!addon.incrementable || quantity <= 1) return base;

  switch (addon.incrementMode) {
    case 'multiple':
      return base * quantity;
    case 'free':
      return base + (quantity - 1) * 1;
    case 'halves':
      return base + (quantity - 1) * (base / 2);
    case 'custom': {
      const step = addon.customIncrementValue && addon.customIncrementValue > 0 ? addon.customIncrementValue : 1;
      return base + (quantity - 1) * step;
    }
    default:
      return base * quantity;
  }
}
