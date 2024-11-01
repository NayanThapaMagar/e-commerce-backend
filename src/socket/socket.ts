import { Server } from 'socket.io';
import User from '../models/userModel';

export const userSockets = new Map<string, string>(); // Maps user ID to socket ID

export const registerSocketHandlers = (io: Server) => {
    io.on('connection', (socket) => {
        console.log('A user connected:', socket.id);

        // Register the user's socket ID when they log in
        socket.on('registerUserSocket', (userId: string) => {
            userSockets.set(userId, socket.id);
            console.log(`User with ID ${userId} connected`);
        });

        // Handle disconnection
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
            // remove the socket ID from userSockets if necessary
            for (const [userId, id] of userSockets.entries()) {
                if (id === socket.id) {
                    userSockets.delete(userId);
                    console.log(`User with ID ${userId} disconnected.`);
                    break;
                }
            }
        });
    });
};

// Function to get a user's socket ID
export const getUserSocketId = (userId: string): string | undefined => {
    return userSockets.get(userId);
};

export const getSuperadminSocketId = async (): Promise<string | undefined> => {
    try {
        // Fetch the superadmin user from the database
        const superadmin = await User.findOne({ role: 'superadmin' });

        // If no superadmin is found, log an error and return undefined
        if (!superadmin) {
            console.error('No superadmin found in the database.');
            return undefined;
        }

        // Get the superadmin's socket ID using their user ID
        const superadminSocketId = userSockets.get(superadmin._id.toString()); 

        return superadminSocketId; // This will be string or undefined
    } catch (error) {
        console.error('Error fetching superadmin socket ID:', error);
        return undefined;
    }
};
