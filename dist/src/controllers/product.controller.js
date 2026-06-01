"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProduct = createProduct;
exports.updateProduct = updateProduct;
exports.deleteProduct = deleteProduct;
exports.getProductsByVendor = getProductsByVendor;
exports.getProductById = getProductById;
exports.searchProducts = searchProducts;
exports.getMyProducts = getMyProducts;
exports.addAddonGroup = addAddonGroup;
exports.deleteAddonGroup = deleteAddonGroup;
exports.addVariantGroup = addVariantGroup;
const ProductService = __importStar(require("../services/product.service"));
async function createProduct(req, res) {
    try {
        const { name, price, stock, category } = req.body;
        if (!name || price === undefined || stock === undefined || !category) {
            res.status(400).json({ success: false, message: 'name, price, stock and category are required' });
            return;
        }
        const product = await ProductService.createProduct(req.user.id, req.body);
        res.status(201).json({ success: true, data: product });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function updateProduct(req, res) {
    try {
        const product = await ProductService.updateProduct(req.user.id, req.params.id, req.body);
        res.status(200).json({ success: true, data: product });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function deleteProduct(req, res) {
    try {
        const result = await ProductService.deleteProduct(req.user.id, req.params.id);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getProductsByVendor(req, res) {
    try {
        const products = await ProductService.getProductsByVendor(req.params.vendorId);
        res.status(200).json({ success: true, data: products });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getProductById(req, res) {
    try {
        const product = await ProductService.getProductById(req.params.id);
        res.status(200).json({ success: true, data: product });
    }
    catch (err) {
        res.status(404).json({ success: false, message: err.message });
    }
}
async function searchProducts(req, res) {
    try {
        const { q, category } = req.query;
        const products = await ProductService.searchProducts(q, category);
        res.status(200).json({ success: true, data: products });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function getMyProducts(req, res) {
    try {
        const products = await ProductService.getMyProducts(req.user.id);
        res.status(200).json({ success: true, data: products });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function addAddonGroup(req, res) {
    try {
        const result = await ProductService.addAddonGroup(req.user.id, req.params.id, req.body);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function deleteAddonGroup(req, res) {
    try {
        const result = await ProductService.deleteAddonGroup(req.user.id, req.params.groupId);
        res.status(200).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
async function addVariantGroup(req, res) {
    try {
        const result = await ProductService.addVariantGroup(req.user.id, req.params.id, req.body);
        res.status(201).json({ success: true, data: result });
    }
    catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
}
//# sourceMappingURL=product.controller.js.map