import { Request, Response, NextFunction } from 'express';
import { authenticate, isAdmin, isUser } from '../../src/middlewares/authMiddleware';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { server } from '../index';
import mongoose from 'mongoose';

dotenv.config();

jest.mock('jsonwebtoken');

const mockRequest = (user?: any): Request => ({
    header: jest.fn().mockReturnValue(user ? `Bearer ${user.token}` : null),
    user: user || {},
} as unknown as Request);

const mockResponse = (): Response => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn();
    return res;
};

const mockNext = jest.fn() as NextFunction;

// Close server and database connection after all tests
afterAll(async () => {
    server.close();
    await mongoose.connection.close();
});

describe('Auth Middleware', () => {
    const JWT_SECRET = process.env.JWT_SECRET || '';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('authenticate middleware', () => {
        it('should return 401 if no token is provided', () => {
            const req = mockRequest();
            const res = mockResponse();

            authenticate(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User not authenticated' });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should call next() if token is valid', () => {
            const tokenPayload = { id: '123', role: 'admin' };
            const token = jwt.sign(tokenPayload, JWT_SECRET);
            const req = mockRequest({ token });
            const res = mockResponse();

            (jwt.verify as jest.Mock).mockReturnValue(tokenPayload);

            authenticate(req, res, mockNext);

            expect(req.user).toEqual(tokenPayload);
            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 401 if token is invalid', () => {
            const req = mockRequest({ token: 'invalid-token' });
            const res = mockResponse();

            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            authenticate(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User not authenticated' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('isAdmin middleware', () => {
        it('should call next() if user is admin', () => {
            const req = mockRequest({ role: 'admin' });
            const res = mockResponse();

            isAdmin(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 403 if user is not admin', () => {
            const req = mockRequest({ role: 'user' });
            const res = mockResponse();

            isAdmin(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Access denied, admin only' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });

    describe('isUser middleware', () => {
        it('should call next() if user is a regular user', () => {
            const req = mockRequest({ role: 'user' });
            const res = mockResponse();

            isUser(req, res, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should return 403 if user is not a regular user', () => {
            const req = mockRequest({ role: 'admin' });
            const res = mockResponse();

            isUser(req, res, mockNext);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Access denied, user only' });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});
