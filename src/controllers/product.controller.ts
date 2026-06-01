import { Request, Response } from 'express';
import * as ProductService from '../services/product.service';
import { AuthRequest } from '../interface/auth-request.interface.ts';

export async function createProduct(req: AuthRequest, res: Response) {
  try {
    const { name, price, stock, category } = req.body;

    if (!name || !price || stock === undefined || !category) {
      res.status(400).json({
        success: false,
        message: 'name, price, stock and category are required',
      });
      return;
    }

    const product = await ProductService.createProduct(req.user!.id, req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateProduct(req: AuthRequest, res: Response) {
  try {
    const product = await ProductService.updateProduct(
      req.user!.id,
      req.params.id as string,
      req.body
    );
    res.status(200).json({ success: true, data: product });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function deleteProduct(req: AuthRequest, res: Response) {
  try {
    const result = await ProductService.deleteProduct(
      req.user!.id,
      req.params.id as string
    );
    res.status(200).json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getProductsByVendor(req: Request, res: Response) {
  try {
    const products = await ProductService.getProductsByVendor(req.params.vendorId as string);
    console.log(`Products: ${products}`);
    res.status(200).json({ success: true, data: products });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getProductById(req: Request, res: Response) {
  try {
    const product = await ProductService.getProductById(req.params.id as string);
    res.status(200).json({ success: true, data: product });
  } catch (err: any) {
    res.status(404).json({ success: false, message: err.message });
  }
}

export async function searchProducts(req: Request, res: Response) {
  try {
    const { q, category } = req.query;
    const products = await ProductService.searchProducts(
      q as string,
      category as string
    );
    res.status(200).json({ success: true, data: products });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

export async function getMyProducts(req: AuthRequest, res: Response) {
  try {
    const products = await ProductService.getMyProducts(req.user!.id);
    res.status(200).json({ success: true, data: products });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}