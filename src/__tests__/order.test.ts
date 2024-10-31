import request from 'supertest';
import { app, server } from '../index';
import Order, { IOrder } from '../models/orderModel';
import Product from '../models/productModel';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
}

const mockSuperAdminUserId = new mongoose.Types.ObjectId();
const mockAdminUserId = new mongoose.Types.ObjectId();
const mockNonAdminUserId = new mongoose.Types.ObjectId();
const mockNonAdminUserId0 = new mongoose.Types.ObjectId();

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

const mockNonAdminUser0 = {
    id: mockNonAdminUserId.toString(),
    role: 'user',
    token: jwt.sign({ id: mockNonAdminUserId0, role: 'user' }, JWT_SECRET),
};

const mockNonAdminUser = {
    id: mockNonAdminUserId.toString(),
    role: 'user',
    token: jwt.sign({ id: mockNonAdminUserId, role: 'user' }, JWT_SECRET),
};

afterAll(async () => {
    server.close();
    await mongoose.connection.close();
});

beforeAll(() => {
    jest.setTimeout(10000);
});

describe('Order Controller', () => {
    let productId: string;

    beforeEach(async () => {
        await Order.deleteMany({});
        await Product.deleteMany({});

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
            expect(response.body.items[0].quantity).toBe(2);
        });

        it('should return 400 if order ID is invalid', async () => {
            const response = await request(app)
                .put(`/orders/invalid-id`)
                .set('Authorization', `Bearer ${mockNonAdminUser.token}`)
                .send({ items: [{ product: productId, quantity: 2 }] });

            expect(response.status).toBe(400);
            expect(response.body.errors[0].msg).toBe('Invalid Object ID');
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
                .set('Authorization', `Bearer ${mockNonAdminUser0.token}`)
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
    });

    // describe('GET /orders', () => {
    //     it('should retrieve all orders', async () => {
    //         await Order.create([
    //             { user: mockNonAdminUser.id, items: [{ product: productId, quantity: 1 }], totalPrice: 100 },
    //             { user: mockAdminUser.id, items: [{ product: productId, quantity: 2 }], totalPrice: 200 },
    //         ]);

    //         const response = await request(app)
    //             .get('/orders')
    //             .set('Authorization', `Bearer ${mockAdminUser.token}`);

    //         expect(response.status).toBe(200);
    //         expect(response.body.length).toBeGreaterThan(0);
    //     });
    // });

    // describe('DELETE /orders/:id', () => {
    //     let orderId: string;

    //     beforeEach(async () => {
    //         const order = await Order.create({
    //             user: mockNonAdminUser.id,
    //             items: [{ product: productId, quantity: 1 }],
    //             totalPrice: 100,
    //         });
    //         orderId = order._id.toString();
    //     });

    //     it('should delete an order', async () => {
    //         const response = await request(app)
    //             .delete(`/orders/${orderId}`)
    //             .set('Authorization', `Bearer ${mockAdminUser.token}`);

    //         expect(response.status).toBe(200);
    //         expect(response.body.message).toBe('Order deleted successfully');
    //     });

    //     it('should return 404 if order not found', async () => {
    //         const nonExistentId = new mongoose.Types.ObjectId();
    //         const response = await request(app)
    //             .delete(`/orders/${nonExistentId}`)
    //             .set('Authorization', `Bearer ${mockAdminUser.token}`);

    //         expect(response.status).toBe(404);
    //         expect(response.body.message).toBe('Order not found');
    //     });
    // });
});
