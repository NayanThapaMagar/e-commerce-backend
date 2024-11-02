import request from 'supertest';
import { app, server } from '../index';
import Product from '../models/productModel';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
}

const mockAdminUserId = new mongoose.Types.ObjectId();
const mockAdminUserId0 = new mongoose.Types.ObjectId();
const mockNonAdminUserId = new mongoose.Types.ObjectId();
const testImagePath = path.join(__dirname, '/test_image.png');

// Mock admin and non-admin users
const mockAdminUser = {
    id: mockAdminUserId.toString(),
    role: 'admin',
    token: jwt.sign({ id: mockAdminUserId, role: 'admin' }, JWT_SECRET),
};

const mockAdminUser0 = {
    id: mockAdminUserId0.toString(),
    role: 'admin',
    token: jwt.sign({ id: mockAdminUserId0, role: 'admin' }, JWT_SECRET),
};

const mockNonAdminUser = {
    id: mockNonAdminUserId.toString(),
    role: 'user',
    token: jwt.sign({ id: mockNonAdminUserId, role: 'user' }, JWT_SECRET),
};

// Mock connection to actual database
jest.mock('../config/databaseConfig', () => ({
    __esModule: true, // Important for default export mocks
    default: jest.fn(), // Mock connectDB function
}));
// Mock Cloudinary and file utilities
jest.mock('../config/cloudinaryConfig', () => ({
    uploader: {
        upload: jest.fn().mockResolvedValue({ secure_url: 'https://cloudinary.com/test_image.png' }),
        destroy: jest.fn().mockResolvedValue({}),
    },
}));
jest.mock('../utils/cloudinaryUtils', () => ({
    extractCloudinaryPublicId: jest.fn().mockReturnValue('test_public_id'),
}));

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
});

afterEach(async () => {
    // Clear collections after each test
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// Close server and database connection after all tests
afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    server.close();
});

describe('Product Controller', () => {
    beforeEach(async () => {
        jest.clearAllMocks();
    });

    describe('POST /products', () => {
        it('should create a new product', async () => {
            const response = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${mockAdminUser.token}`)
                .attach('image', testImagePath)
                .field('name', 'Test Product')
                .field('description', 'This is a test product')
                .field('price', '100')
                .field('stock', '50');

            expect(response.status).toBe(201);
            expect(response.body.savedProduct).toHaveProperty('_id');
            expect(response.body.savedProduct.name).toBe('Test Product');
            expect(response.body.message).toBe('Product created succesfully');
        });

        it('should return 401 if user is not authenticated', async () => {
            const response = await request(app)
                .post('/products')
                .field('name', 'Unauthorized Product')
                .field('description', 'This should not work')
                .field('price', '50')
                .field('stock', '10');

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('User not authenticated'); // caught in middleware
        });

        it('should return 403 if user is not admin', async () => {
            const response = await request(app)
                .post('/products')
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .field('name', 'Unauthorized Product')
                .field('description', 'This should not work')
                .field('price', '50')
                .field('stock', '10');

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Access denied, admin only');
        });
    });

    describe('PUT /products/:id', () => {
        let productId: string;

        beforeEach(async () => {
            const product = await Product.create({
                name: 'Test Product',
                description: 'This is a test product',
                price: 100,
                stock: 50,
                createdBy: mockAdminUser.id,
            });
            productId = product._id.toString();
        });

        it('should update an existing product', async () => {
            const response = await request(app)
                .put(`/products/${productId}`)
                .set('Authorization', `Bearer ${mockAdminUser.token}`)
                .attach('image', testImagePath)
                .field('name', 'Updated Product')
                .field('description', 'Updated description')
                .field('price', '150')
                .field('stock', '50');

            expect(response.status).toBe(200);
            expect(response.body.updatedProduct.name).toBe('Updated Product');
            expect(response.body.message).toBe('Product updated succesfully');
        });

        it('should return 400 if product ID is invalid', async () => {
            const response = await request(app)
                .put('/products/invalid-id')
                .set('Authorization', `Bearer ${mockAdminUser.token}`)
                .field('name', 'Invalid Product')
                .field('description', 'This should not work')
                .field('price', '150')
                .field('stock', '50');

            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toBe('Invalid Object ID'); // detected in middleware validation
        });

        it('should return 404 if product not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .put(`/products/${nonExistentId}`)
                .set('Authorization', `Bearer ${mockAdminUser.token}`)
                .field('name', 'Non-existent Product')
                .field('description', 'This should not work')
                .field('price', '150')
                .field('stock', '50');

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Product not found');
        });

        it('should return 401 if user not authenticated', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .put(`/products/${nonExistentId}`)
                .field('name', 'Non-existent Product')
                .field('description', 'This should not work')
                .field('price', '150')
                .field('stock', '50');

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('User not authenticated'); // caught in middleware
        });

        it('should return 403 if user is not the creator', async () => {
            const mockProductByAnotherUser = await Product.create({
                name: 'Other User Product',
                description: 'Product from another user',
                price: 200,
                stock: 30,
                createdBy: mockNonAdminUser.id,
            });

            const response = await request(app)
                .put(`/products/${mockProductByAnotherUser._id}`)
                .set('Authorization', `Bearer ${mockAdminUser.token}`)
                .field('name', 'Unauthorized Update')
                .field('description', 'Trying to update another user\'s product')
                .field('price', '150')
                .field('stock', '50');

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Not authorized to update this product');
        });
    });

    describe('DELETE /products/:id', () => {
        let productId: string;

        beforeEach(async () => {
            const product = await Product.create({
                name: 'Test Product',
                description: 'This is a test product',
                price: 100,
                stock: 50,
                createdBy: mockAdminUser.id,
            });
            productId = product._id.toString();
        });

        it('should delete a product', async () => {
            const response = await request(app)
                .delete(`/products/${productId}`)
                .set('Authorization', `Bearer ${mockAdminUser.token}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Product deleted successfully');
        });

        it('should return 400 if product ID is invalid', async () => {
            const response = await request(app)
                .delete('/products/invalid-id')
                .set('Authorization', `Bearer ${mockAdminUser.token}`);

            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toBe('Invalid Object ID'); // detected in middleware validation
        });

        it('should return 404 if product not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId().toString();
            const response = await request(app)
                .delete(`/products/${nonExistentId}`)
                .set('Authorization', `Bearer ${mockAdminUser.token}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Product not found');
        });
        it('should return 401 if user not authenticated', async () => {
            const response = await request(app)
                .delete(`/products/${productId}`)

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('User not authenticated'); // caught in middleware
        });

        it('should return 403 if user is not the creator', async () => {
            const mockProductByAnotherUser = await Product.create({
                name: 'Other User Product',
                description: 'Product from another user',
                price: 200,
                stock: 30,
                createdBy: mockNonAdminUser.id,
            });

            const response = await request(app)
                .delete(`/products/${mockProductByAnotherUser._id}`)
                .set('Authorization', `Bearer ${mockAdminUser.token}`);

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Not authorized to delete this product');
        });
    });

    describe('GET /products/my-products', () => {
        beforeEach(async () => {
            await Product.create([
                { name: 'Product 1', description: 'Description 1', createdBy: mockAdminUser.id, price: 50, stock: 20 },
                { name: 'Product 2', description: 'Description 2', createdBy: mockAdminUser.id, price: 100, stock: 30 },
            ]);
        });

        it("should return the user's products", async () => {
            const response = await request(app)
                .get('/products/my-products')
                .set('Authorization', `Bearer ${mockAdminUser.token}`);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2);
        });

        it('should return 401 if user is not authenticated', async () => {
            const response = await request(app)
                .get('/products/my-products');

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('User not authenticated'); // caught in middleware
        });
        it('should return an empty array if user has no products', async () => {
            const response = await request(app)
                .get('/products/my-products')
                .set('Authorization', `Bearer ${mockAdminUser0.token}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('No products found');
        });
    });
    describe('GET /products', () => {
        it("should return the all products", async () => {
            await Product.create([
                { name: 'Product 1', description: 'Description 1', createdBy: mockAdminUser.id, price: 50, stock: 20 },
                { name: 'Product 2', description: 'Description 2', createdBy: mockAdminUser0.id, price: 100, stock: 30 },
            ]);
            const response = await request(app)
                .get('/products/')

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2);
        });

        it('should return an empty array if there is no products', async () => {
            const response = await request(app)
                .get('/products')

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('No products found');
        });
    });

    describe('GET /products/search', () => {
        beforeEach(async () => {
            await Product.create([
                { name: 'Apple', description: 'Delicious red fruit', price: 50, stock: 20, createdBy: mockAdminUser.id },
                { name: 'Banana', description: 'Yellow fruit', price: 20, stock: 30, createdBy: mockAdminUser.id },
            ]);
        });

        it('should return products based on search term', async () => {
            const response = await request(app).get('/products/search?name=apple');

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe('Apple');
        });

        it('should return 400 if search term is not provided', async () => {
            const response = await request(app).get('/products/search');

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid search query');
        });
    });
});
