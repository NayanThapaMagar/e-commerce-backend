import { Router } from 'express';
import {
    createProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getMyProducts,
    searchProducts
} from '../controllers/productController';
import upload from '../middlewares/uploadImage';
import {
    validateRequest,
    productValidation,
    objectIdValidation
} from '../middlewares/validators';
import { authenticate, isAdmin } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', authenticate, isAdmin, upload.single('image'), productValidation, validateRequest, createProduct);

router.put('/:id', authenticate, isAdmin, upload.single('image'), objectIdValidation, productValidation, validateRequest, updateProduct);

router.delete('/:id', authenticate, isAdmin, objectIdValidation, validateRequest, deleteProduct);

router.get('/', getAllProducts);

router.get('/my-products', authenticate, isAdmin, getMyProducts);

router.get('/search', searchProducts);

export default router;
