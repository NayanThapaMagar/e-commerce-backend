import express from 'express';
import dotenv from 'dotenv';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';
import connectDB from './config/databaseConfig';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

// Create an instance of Express
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(express.json());
app.use(apiLimiter); // Rate limiting middleware

// Connect to MongoDB
connectDB();

// Socket.io connection for real-time notifications
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Routes
app.use('/auth', authRoutes); // Authentication routes
app.use('/products', productRoutes); // Product management routes
app.use('/orders', orderRoutes(io)); // Order management routes with socket.io

// Error handling middleware
app.use(errorHandler);


// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export { server, app };