import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
}

const connectDB = async () => {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Database connected');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1); // Exit the process if connection fails
    }
};

export default connectDB; // Export the connectDB function
