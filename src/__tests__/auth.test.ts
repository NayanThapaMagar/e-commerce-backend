import request from 'supertest';
import { app, server } from '../index';
import User from '../models/userModel';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Mock the User model, jwt, and bcrypt methods
jest.mock('../models/userModel');
jest.mock('jsonwebtoken');
jest.mock('bcryptjs');

// Close server and database connection after all tests
afterAll(async () => {
    server.close();
    await mongoose.connection.close();
});

describe('Auth Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks(); // Reset mocks before each test
    });

    // Test User Registration Success
    test('POST /auth/register - Should register a new user', async () => {
        const mockUser = { _id: '1', email: 'test@example.com', role: 'user' };
        const hashedPassword = 'hashedpassword';
        const token = 'test-token';

        (User.findOne as jest.Mock).mockResolvedValue(null); // No existing user
        (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword); // Hash the password
        (User.prototype.save as jest.Mock).mockResolvedValue(mockUser); // Mock save to return the user
        (jwt.sign as jest.Mock).mockReturnValue(token); // Mock JWT token generation

        const response = await request(app)
            .post('/auth/register')
            .send({
                username: 'nayan',
                email: 'test@example.com',
                password: 'password123',
                role: 'user',
            });

        expect(response.status).toBe(201);
        expect(response.body).toEqual({
            success: true,
            message: 'User registered successfully!',
            token,
            user: { id: '1', email: 'test@example.com', role: 'user' },
        });
    });

    // Test for email conflict
    test('POST /auth/register - Should return 401 if email already exists', async () => {
        const existingUser = { email: 'test@example.com', username: 'otherUser' };
        (User.findOne as jest.Mock).mockResolvedValue(existingUser); // Mock existing user with email

        const response = await request(app)
            .post('/auth/register')
            .send({
                username: 'nayan',
                email: 'test@example.com', 
                password: 'password123',
                role: 'user',
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe(
            'User with this email already exists. Please try with a different email.'
        );
    });

    // Test for username conflict
    test('POST /auth/register - Should return 401 if username already exists', async () => {
        const existingUser = { email: 'otherUser@example.com', username: 'nayan' };
        (User.findOne as jest.Mock).mockResolvedValue(existingUser); // Mock existing user with username

        const response = await request(app)
            .post('/auth/register')
            .send({
                username: 'nayan', 
                email: 'new@example.com',
                password: 'password123',
                role: 'user',
            });

        expect(response.status).toBe(401);
        expect(response.body.message).toBe(
            'User with this username already exists. Please try with a different username.'
        );
    });

    // Test for server error
    test('POST /auth/register - Should return 500 if there is a server error', async () => {
        const mockError = new Error('Database error');

        // Mock User.findOne to return no user and then throw an error when saving
        (User.findOne as jest.Mock).mockResolvedValue(null); // Simulate no existing user
        (User.prototype.save as jest.Mock).mockRejectedValue(mockError); // Simulate a save error

        const response = await request(app)
            .post('/auth/register')
            .send({
                username: 'nayan',
                email: 'new@example.com',
                password: 'password123',
                role: 'user',
            });

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('Server error, please try again later');
    });

    // Test User Login Success
    test('POST /auth/login - Should authenticate user and return a token', async () => {
        const mockUser = { _id: '1', email: 'test@example.com', password: 'hashedpassword', role: 'user' };
        const token = 'test-token';

        (User.findOne as jest.Mock).mockResolvedValue(mockUser); // Mock user found
        (bcrypt.compare as jest.Mock).mockResolvedValue(true); // Mock password match
        (jwt.sign as jest.Mock).mockReturnValue(token); // Mock JWT token generation

        const response = await request(app)
            .post('/auth/login')
            .send({ email: 'test@example.com', password: 'password123' });

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            success: true,
            token,
            user: { id: '1', email: 'test@example.com', role: 'user' },
        });
    });

    // Test Login Failure - Invalid Credentials
    test('POST /auth/login - Should return 400 for invalid email or password', async () => {
        (User.findOne as jest.Mock).mockResolvedValue(null); // No user found

        const response = await request(app)
            .post('/auth/login')
            .send({ email: 'wrong@example.com', password: 'password123' });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('User not found');
    });

    // Test Login Failure - Password Mismatch
    test('POST /auth/login - Should return 400 if password does not match', async () => {
        const mockUser = { _id: '1', email: 'test@example.com', password: 'hashedpassword' };

        (User.findOne as jest.Mock).mockResolvedValue(mockUser); // Mock user found
        (bcrypt.compare as jest.Mock).mockResolvedValue(false); // Mock password mismatch

        const response = await request(app)
            .post('/auth/login')
            .send({ email: 'test@example.com', password: 'wrongpassword' });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Incorrect password');
    });

    // Test Server Error Handling
    test('POST /auth/login - Should return 500 for server errors', async () => {
        (User.findOne as jest.Mock).mockRejectedValue(new Error('Server error')); // Simulate error

        const response = await request(app)
            .post('/auth/login')
            .send({ email: 'test@example.com', password: 'password123' });

        expect(response.status).toBe(500);
        expect(response.body.message).toBe('Server error, please try again later');
    });
});
