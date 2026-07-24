"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.getProductById = getProductById;
exports.getProductsByVendor = getProductsByVendor;
exports.getMyProducts = getMyProducts;
exports.searchProducts = searchProducts;
exports.addAddonGroup = addAddonGroup;
exports.deleteAddonGroup = deleteAddonGroup;
exports.addVariantGroup = addVariantGroup;
const prisma_1 = require("../config/prisma");
// ─── FULL PRODUCT INCLUDE ────────────────────────────────
const fullProductInclude = {
    variantGroups: {
        include: { variants: true },
        orderBy: { id: 'asc' },
    },
    addonGroups: {
        include: { addons: true },
        orderBy: { id: 'asc' },
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
async function createProduct(userId, data) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    if (vendor.status !== 'ACTIVE')
        throw new Error('Your vendor account is not active yet');
    const { variantGroups, addonGroups, attributes, ...core } = data;
    return prisma_1.prisma.product.create({
        data: {
            vendorId: vendor.id,
            ...core,
            images: core.images || [],
            sizes: core.sizes || [],
            colors: core.colors || [],
            tags: core.tags || [],
            ...(variantGroups?.length && {
                variantGroups: {
                    create: variantGroups.map(g => ({
                        name: g.name,
                        required: g.required ?? true,
                        variants: { create: g.variants },
                    })),
                },
            }),
            ...(addonGroups?.length && {
                addonGroups: {
                    create: addonGroups.map(g => ({
                        name: g.name,
                        minSelect: g.minSelect ?? 0,
                        maxSelect: g.maxSelect ?? 10,
                        addons: { create: g.addons },
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
async function updateProduct(userId, productId, data) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId } });
    console.log(`Product: ${product}`);
    if (!product)
        throw new Error('Product not found');
    if (product.vendorId !== vendor.id)
        throw new Error('You do not own this product');
    const { variantGroups, addonGroups, attributes, ...core } = data;
    // Increase transaction timeout to 15 seconds
    return prisma_1.prisma.$transaction(async (tx) => {
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
                await Promise.all(variantGroups.map(async (g) => {
                    const group = groups.find(gr => gr.name === g.name);
                    if (group && g.variants.length) {
                        await tx.productVariant.createMany({
                            data: g.variants.map(v => ({ ...v, groupId: group.id })),
                        });
                    }
                }));
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
                        incrementMode: g.incrementable
                            ? (g.incrementMode ?? 'multiple')
                            : null,
                    })),
                });
                // Get created groups and create addons in parallel
                const groups = await tx.productAddonGroup.findMany({ where: { productId } });
                await Promise.all(addonGroups.map(async (g) => {
                    const group = groups.find(gr => gr.name === g.name);
                    if (group && g.addons.length) {
                        await tx.productAddon.createMany({
                            data: g.addons.map(a => ({ ...a, groupId: group.id })),
                        });
                    }
                }));
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
async function deleteProduct(userId, productId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId } });
    if (!product)
        throw new Error('Product not found');
    if (product.vendorId !== vendor.id)
        throw new Error('You do not own this product');
    await prisma_1.prisma.product.delete({ where: { id: productId } });
    return { message: 'Product deleted successfully' };
}
// ─── FETCH ───────────────────────────────────────────────
async function getProductById(productId) {
    const product = await prisma_1.prisma.product.findUnique({
        where: { id: productId },
        include: fullProductInclude,
    });
    if (!product)
        throw new Error('Product not found');
    return product;
}
async function getProductsByVendor(vendorId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!vendor)
        throw new Error('Vendor not found');
    return prisma_1.prisma.product.findMany({
        where: { vendorId, available: true },
        include: fullProductInclude,
        orderBy: [{ isFeatured: 'desc' }, { isPopular: 'desc' }, { createdAt: 'desc' }],
    });
}
async function getMyProducts(userId) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    return prisma_1.prisma.product.findMany({
        where: { vendorId: vendor.id },
        include: fullProductInclude,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
}
async function searchProducts(query, category) {
    return prisma_1.prisma.product.findMany({
        where: {
            available: true,
            vendor: { status: 'ACTIVE' },
            ...(query && {
                OR: [
                    { name: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                    { brand: { contains: query, mode: 'insensitive' } },
                    { tags: { has: query } },
                ],
            }),
            ...(category && { category: { equals: category, mode: 'insensitive' } }),
        },
        include: fullProductInclude,
        orderBy: [{ isFeatured: 'desc' }, { isPopular: 'desc' }],
    });
}
// ─── ADDON/VARIANT MANAGEMENT (granular updates) ─────────
async function addAddonGroup(userId, productId, data) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.vendorId !== vendor.id)
        throw new Error('Product not found');
    return prisma_1.prisma.productAddonGroup.create({
        data: {
            productId,
            name: data.name,
            minSelect: data.minSelect ?? 0,
            maxSelect: data.maxSelect ?? 10,
            addons: { create: data.addons },
        },
        include: { addons: true },
    });
}
async function deleteAddonGroup(userId, groupId) {
    const group = await prisma_1.prisma.productAddonGroup.findUnique({
        where: { id: groupId },
        include: { product: true },
    });
    if (!group)
        throw new Error('Addon group not found');
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (group.product.vendorId !== vendor?.id)
        throw new Error('Access denied');
    await prisma_1.prisma.productAddonGroup.delete({ where: { id: groupId } });
    return { message: 'Addon group deleted' };
}
async function addVariantGroup(userId, productId, data) {
    const vendor = await prisma_1.prisma.vendor.findUnique({ where: { userId } });
    if (!vendor)
        throw new Error('Vendor profile not found');
    const product = await prisma_1.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.vendorId !== vendor.id)
        throw new Error('Product not found');
    return prisma_1.prisma.productVariantGroup.create({
        data: {
            productId,
            name: data.name,
            required: data.required ?? true,
            variants: { create: data.variants },
        },
        include: { variants: true },
    });
}
//# sourceMappingURL=product.service.js.map