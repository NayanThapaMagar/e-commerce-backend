import request from 'supertest';
import { app, server } from '../index';
import Order, { IOrder } from '../models/orderModel';
import Product from '../models/productModel';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../models/userModel';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
}

const mockSuperAdminUserId = new mongoose.Types.ObjectId();
const mockAdminUserId = new mongoose.Types.ObjectId();
const mockNonAdminUserId = new mongoose.Types.ObjectId();
const mockNonAdminUserId0 = new mongoose.Types.ObjectId();
const mockNonAdminUserId1 = new mongoose.Types.ObjectId();

// Mock admin and non-admin users
const mockSuperAdminUser = {
    id: mockAdminUserId.toString(),
    role: 'superadmin',
    token: jwt.sign({ id: mockSuperAdminUserId, role: 'superadmin' }, JWT_SECRET),
};

const mockAdminUser = {
    id: mockAdminUserId.toString(),
    role: 'admin',
    token: jwt.sign({ id: mockAdminUserId, role: 'admin' }, JWT_SECRET),
};

const mockNonAdminUser = {
    id: mockNonAdminUserId.toString(),
    role: 'user',
    token: jwt.sign({ id: mockNonAdminUserId, role: 'user' }, JWT_SECRET),
};

const mockNonAdminUser0 = {
    id: mockNonAdminUserId0.toString(),
    role: 'user',
    token: jwt.sign({ id: mockNonAdminUserId0, role: 'user' }, JWT_SECRET),
};

const mockNonAdminUser1 = {
    id: mockNonAdminUserId1.toString(),
    role: 'user',
    token: jwt.sign({ id: mockNonAdminUserId1, role: 'user' }, JWT_SECRET),
};

// Mock connection to actual database
jest.mock('../config/databaseConfig', () => ({
    __esModule: true, // used for default export mocks
    default: jest.fn(), // Mock connectDB function
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

afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
    server.close();
});

describe('Order Controller', () => {
    let productId: string;

    beforeEach(async () => {
        await User.create({
            username: 'test',
            email: 'test@example.com',
            password: 'password123',
            role: 'superadmin',
        });

        const product = await Product.create({
            name: 'Sample Product',
            description: 'Sample description',
            price: 100,
            stock: 20,
            createdBy: mockAdminUser.id,
        });
        productId = product._id.toString();

        jest.clearAllMocks();
    });

    describe('POST /orders', () => {
        it('should place a new order', async () => {
            const response = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: productId, quantity: 2 }] });

            expect(response.status).toBe(201);
            expect(response.body.order).toHaveProperty('_id');
            expect(response.body.message).toBe('Order placed successfully');
        });

        it('should return 400 for invalid product ID', async () => {
            const response = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: 'invalid-id', quantity: 1 }] });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toBe('Invalid Product ID');
        });

        it('should return 404 if product is not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: nonExistentId, quantity: 1 }] });

            expect(response.status).toBe(404);
            expect(response.body.message).toContain('Product not found');
        });

        it('should return 400 if insufficient stock for order', async () => {
            const response = await request(app)
                .post('/orders')
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: productId, quantity: 100 }] });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Insufficient stock for product');
        });
    });

    describe('PUT /orders/:id', () => {
        let orderId: string;
        let order0: IOrder;
        let orderId0: string;

        beforeEach(async () => {
            const order = await Order.create({
                user: mockNonAdminUser.id,
                items: [{ product: productId, quantity: 1 }],
                totalPrice: 100,
                status: 'placed',
            });
            orderId = order._id.toString();

            order0 = await Order.create({
                user: mockNonAdminUser.id,
                items: [{ product: productId, quantity: 1 }],
                totalPrice: 100,
                status: 'pending',
            });
            orderId0 = order0._id.toString();
        });

        it('should update an existing order', async () => {
            const response = await request(app)
                .put(`/orders/${orderId}`)
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: productId, quantity: 2 }] });

            expect(response.status).toBe(200);
            expect(response.body.existingOrder.items[0].quantity).toBe(2);
            expect(response.body.message).toBe('Order updated succesfully');
        });

        it('should return 400 if order ID is invalid', async () => {
            const response = await request(app)
                .put('/orders/invalid-id')
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: productId, quantity: 2 }] });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toBe('Invalid Object ID'); // detected in middleware validation
        });

        it('should return 404 if order not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .put(`/orders/${nonExistentId}`)
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: productId, quantity: 2 }] });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Order not found');
        });

        it('should return 403 if user is not authorized to update order', async () => {
            const response = await request(app)
                .put(`/orders/${orderId}`)
                .set('Authorization', `Bearer ${mockNonAdminUser0.token}`) // Different non-admin user
                .send({ items: [{ product: productId, quantity: 2 }] });

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('You are not authorized to update this order');
        });

        it('should return 400 if the status of the order is other than "palced"', async () => {
            const response = await request(app)
                .put(`/orders/${orderId0}`)
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: productId, quantity: 2 }] });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe(`Cant update the order, The order is: ${order0.status}`);
        });
        it('should return 400 for invalid product ID', async () => {
            const response = await request(app)
                .put(`/orders/${orderId}`)
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: 'invalid-id', quantity: 1 }] });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toBe('Invalid Product ID');
        });

        it('should return 404 if product is not found', async () => {
            const nonExistentId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .put(`/orders/${orderId}`)
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: nonExistentId, quantity: 1 }] });

            expect(response.status).toBe(404);
            expect(response.body.message).toContain('Product not found');
        });

        it('should return 400 if insufficient stock for order', async () => {
            const response = await request(app)
                .put(`/orders/${orderId}`)
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: productId, quantity: 100 }] });

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Insufficient stock for product');
        });
    });

    describe('PATCH /orders/:id/status', () => {
        let orderId: string;

        beforeEach(async () => {
            const order = await Order.create({
                user: mockNonAdminUser.id,
                items: [{ product: productId, quantity: 1 }],
                totalPrice: 100,
                status: 'placed',
            });
            orderId = order._id.toString();
        });

        it('should update the order status', async () => {
            const response = await request(app)
                .patch(`/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${mockSuperAdminUser.token}`)
                .query({ status: 'shipped' });

            expect(response.status).toBe(200);
            expect(response.body.updatedOrder.status).toBe('shipped');
            expect(response.body.message).toBe('Order status updated');
        });

        it('should return 400 if the status is invalid', async () => {
            const response = await request(app)
                .patch(`/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${mockSuperAdminUser.token}`)
                .query({ status: 'invalid-status' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Invalid status.');
        });

        it('should return 404 if order is not found', async () => {
            const invalidOrderId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .patch(`/orders/${invalidOrderId}/status`)
                .set('Authorization', `Bearer ${mockSuperAdminUser.token}`)
                .query({ status: 'shipped' });

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Order not found');
        });

        it('should return 400 if the order already has the specified status.', async () => {
            const response = await request(app)
                .patch(`/orders/${orderId}/status`)
                .set('Authorization', `Bearer ${mockSuperAdminUser.token}`)
                .query({ status: "placed" });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('No update made. The order already has the specified status.');
        });
    });


    describe('PATCH /orders/:id/cancel', () => {
        let orderId: string;

        beforeEach(async () => {
            const order = await Order.create({
                user: mockNonAdminUser.id,
                items: [{ product: productId, quantity: 1 }],
                totalPrice: 100,
                status: 'placed',
            });
            orderId = order._id.toString();
        });

        it('should cancel an order successfully', async () => {
            const response = await request(app)
                .patch(`/orders/${orderId}/cancel`)
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Order cancelled successfully');
            expect(response.body.order.status).toBe('canceled');
        });

        it('should return 400 if order ID is invalid', async () => {
            const response = await request(app)
                .patch(`/orders/invalid-id/cancel`)
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: productId, quantity: 2 }] });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toBe('Invalid Object ID'); // detected in middleware validation
        });

        it('should return 404 if order is not found', async () => {
            const nonExistentOrderId = new mongoose.Types.ObjectId();
            const response = await request(app)
                .patch(`/orders/${nonExistentOrderId}/cancel`)
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Order not found');
        });

        it('should return 403 if user is not authorized to cancel order', async () => {
            const response = await request(app)
                .patch(`/orders/${orderId}/cancel`)
                .set('Authorization', `Bearer ${mockNonAdminUser0.token}`); // Different non-admin user

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('You are not authorized to cancel this order');
        });

        it('should return 400 if order status is not "placed"', async () => {
            await Order.findByIdAndUpdate(orderId, { status: 'shipped' });

            const response = await request(app)
                .patch(`/orders/${orderId}/cancel`)
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`);

            expect(response.status).toBe(400);
            expect(response.body.message).toContain('Cant cancel the order, The order is: shipped');
        });
    });

    describe('GET /orders - getAllOrders', () => {
        beforeEach(async () => {
            await Order.create([
                { user: mockNonAdminUser.id, items: [{ product: productId, quantity: 2 }], totalPrice: 200, status: 'placed' },
                { user: mockNonAdminUser0.id, items: [{ product: productId, quantity: 3 }], totalPrice: 300, status: 'placed' }
            ]);
        });

        it('should retrieve all orders for superadmin', async () => {
            const response = await request(app)
                .get('/orders')
                .set('Authorization', `Bearer ${mockSuperAdminUser.token}`);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(2); // we created 2 orders
        });

        it('should return 403 for non-superadmin user', async () => {
            const response = await request(app)
                .get('/orders')
                .set('Authorization', `Bearer ${mockAdminUser.token}`);

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Access denied, superadmin only');
        });
    });

    describe('GET /orders/my-orders - getMyOrders', () => {
        beforeEach(async () => {
            await Order.create([
                { user: mockNonAdminUser.id, items: [{ product: productId, quantity: 2 }], totalPrice: 200, status: 'placed' },
                { user: mockNonAdminUser0.id, items: [{ product: productId, quantity: 3 }], totalPrice: 300, status: 'placed' }
            ]);
        });

        it('should retrieve orders for authenticated user', async () => {
            const response = await request(app)
                .get('/orders/my-orders')
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`);

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(1); // only one order for this user
        });

        it('should return an empty array if user has no orders', async () => {
            const response = await request(app)
                .get('/orders/my-orders')
                .set('Authorization', `Bearer ${mockNonAdminUser1.token}`); // this user has no orders

            expect(response.status).toBe(200);
            expect(response.body.length).toBe(0);
        });
    });

});
