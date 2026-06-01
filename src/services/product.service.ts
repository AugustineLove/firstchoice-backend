import { prisma } from '../config/prisma';

export async function createProduct(
  userId: string,
  data: {
    name: string;
    description?: string;
    price: number;
    stock: number;
    images?: string[];
    category: string;
  }
) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  console.log(vendor)
  if (!vendor) throw new Error('Vendor profile not found');
  if (vendor.status !== 'ACTIVE')
    throw new Error('Your vendor account is not active yet');

  return prisma.product.create({
    data: {
      vendorId: vendor.id,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      price: data.price,
      stock: data.stock,
      images: data.images || [],
      category: data.category.trim(),
    },
  });
}

export async function updateProduct(
  userId: string,
  productId: string,
  data: {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    images?: string[];
    category?: string;
    available?: boolean;
  }
) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');
  if (product.vendorId !== vendor.id)
    throw new Error('You do not own this product');

  return prisma.product.update({ where: { id: productId }, data });
}

export async function deleteProduct(userId: string, productId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error('Product not found');
  if (product.vendorId !== vendor.id)
    throw new Error('You do not own this product');

  await prisma.product.delete({ where: { id: productId } });
  return { message: 'Product deleted successfully' };
}

export async function getProductsByVendor(id: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) throw new Error('Vendor not found');

  return prisma.product.findMany({
    where: { vendor, available: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getProductById(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          logo: true,
          address: true,
          rating: true,
        },
      },
    },
  });

  if (!product) throw new Error('Product not found');
  return product;
}

export async function searchProducts(query: string, category?: string) {
  return prisma.product.findMany({
    where: {
      available: true,
      vendor: { status: 'ACTIVE' },
      ...(query && {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      }),
      ...(category && { category: { equals: category, mode: 'insensitive' } }),
    },
    include: {
      vendor: { select: { businessName: true, logo: true, address: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getMyProducts(userId: string) {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  if (!vendor) throw new Error('Vendor profile not found');

  return prisma.product.findMany({
    where: { vendorId: vendor.id },
    orderBy: { createdAt: 'desc' },
  });
}