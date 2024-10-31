import { Request, Response } from 'express';
import Product, { IProduct } from '../models/productModel';
import cloudinary from '../config/cloudinaryConfig';
import { deleteLocalImage } from '../utils/fileUtils';
import mongoose from 'mongoose';
import { getPagination } from '../utils/pagination'
import { extractCloudinaryPublicId } from '../utils/cloudinaryUtils'

// Create a product
export const createProduct = async (req: Request, res: Response) => {
    try {
        const { name, description, price, stock } = req.body;
        const imageFile = req.file;

        // Get the user ID from the authenticated user
        const createdBy = req.user?.id;

        if (!createdBy) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }

        // Upload image to Cloudinary
        let imageUrl: string | undefined;
        if (imageFile) {
            const result = await cloudinary.uploader.upload(imageFile.path);
            imageUrl = result.secure_url;

            // Delete the uploaded image from local storage
            deleteLocalImage(imageFile.path);
        }

        const newProduct: IProduct = new Product({
            name,
            description,
            price,
            stock,
            imageUrl,
            createdBy,
        });

        const savedProduct = await newProduct.save();

        res.status(201).json(savedProduct);
    } catch (error) {
        console.error('Error creating product:', error);
        res.status(500).json({ message: 'Error creating product', error });
    }
};

// Update a product
export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, price, stock } = req.body;
        const imageFile = req.file;


        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid Object ID' });
            return;
        }

        // Find the existing product
        const existingProduct = await Product.findById(id) as IProduct;
        if (!existingProduct) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        // Check if the product was created by the user
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        if (existingProduct.createdBy.toString() !== userId.toString()) {
            res.status(403).json({ message: 'Not authorized to update this product' });
            return;
        }

        let updatedData: Partial<IProduct> = { name, description, price, stock };

        // If a new image is uploaded, update it in Cloudinary
        if (imageFile) {
            // Delete the old image from Cloudinary
            if (existingProduct.imageUrl) {
                const publicId = extractCloudinaryPublicId(existingProduct.imageUrl);
                await cloudinary.uploader.destroy(publicId);
            }

            const result = await cloudinary.uploader.upload(imageFile.path);
            updatedData.imageUrl = result.secure_url;

            // Delete the uploaded image from local storage
            deleteLocalImage(imageFile.path);
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updatedData, { new: true, runValidators: true });

        res.status(200).json(updatedProduct);
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ message: 'Error updating product', error });
    }
};

// Delete a product
export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid Object ID' });
            return;
        }

        // Find the existing product
        const existingProduct = await Product.findById(id) as IProduct;
        if (!existingProduct) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        // Check if the product was created by the user
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        if (existingProduct.createdBy.toString() !== userId.toString()) {
            res.status(403).json({ message: 'Not authorized to update this product' });
            return;
        }

        // Delete the image from Cloudinary
        if (existingProduct.imageUrl) {
            const publicId = extractCloudinaryPublicId(existingProduct.imageUrl);
            await cloudinary.uploader.destroy(publicId);
        }

        const deletedProduct = await Product.findByIdAndDelete(id);

        if (!deletedProduct) {
            res.status(404).json({ message: 'Product not found' });
            return;
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error deleting product', error });
    }
};

// Get products created by the authenticated user
export const getMyProducts = async (req: Request, res: Response) => {
    const { page = '1', limit = '10' } = req.query as {
        page?: number;
        limit?: number;
    };
    try {
        const { offset, limit: pageLimit } = getPagination(Number(page), Number(limit));
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'User not authenticated' });
            return;
        }
        const myProducts = await Product.find({ createdBy: userId })
            .skip(offset)
            .limit(pageLimit);

        if (myProducts.length === 0) {
            res.status(404).json({ message: 'No products found' });
            return;
        }

        res.status(200).json(myProducts);
    } catch (error) {
        console.error('Error fetching my products:', error);
        res.status(500).json({ message: 'Error fetching my products', error });
    }
};

// Get all products
export const getAllProducts = async (req: Request, res: Response) => {
    const { page = '1', limit = '10' } = req.query as {
        page?: number;
        limit?: number;
    };
    try {
        const { offset, limit: pageLimit } = getPagination(Number(page), Number(limit));
        const products = await Product.find()
            .skip(offset)
            .limit(pageLimit);

        if (products.length === 0) {
            res.status(404).json({ message: 'No products found' });
            return;
        }

        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Error fetching products', error });
    }
};

// Search products by name
export const searchProducts = async (req: Request, res: Response) => {
    const { name, page = '1', limit = '10' } = req.query as {
        page?: number;
        limit?: number;
        name?: string;
    };
    try {
        const { offset, limit: pageLimit } = getPagination(Number(page), Number(limit));

        if (!name || typeof name !== 'string') {
            res.status(400).json({ message: 'Invalid search query' });
            return;
        }

        const products = await Product.find({
            name: { $regex: name, $options: 'i' }, // Case-insensitive search
        })
            .skip(offset)
            .limit(pageLimit);

        if (products.length === 0) {
            res.status(404).json({ message: 'No products found' });
            return;
        }

        res.status(200).json(products);
    } catch (error) {
        console.error('Error searching products:', error);
        res.status(500).json({ message: 'Error searching products', error });
    }
};


