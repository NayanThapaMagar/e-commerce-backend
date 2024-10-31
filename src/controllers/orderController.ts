import { Request, Response } from 'express';
import Order, { IOrder } from '../models/orderModel';
import Product from '../models/productModel';
import { Server } from 'socket.io';
import mongoose from 'mongoose';

// Place an Order
export const placeOrder = (io: Server) => async (req: Request, res: Response) => {
    const { items } = req.body;
    const userId = req.user?.id;

    try {
        let totalAmount = 0;

        // Validate stock and calculate total amount
        for (const item of items) {
            if (!mongoose.Types.ObjectId.isValid(item.product)) {
                res.status(400).json({ message: 'Invalid Product ID' });
                return;
            }
            const product = await Product.findById(item.product);
            if (!product) {
                res.status(404).json({ message: `Product not found: ${item.product}` });
                return;
            }
            if (product.stock < item.quantity) {
                res.status(400).json({
                    message: `Insufficient stock for product: ${product.name}`,
                });
                return;
            }
            totalAmount += product.price * item.quantity;
        }

        // Deduct stock
        for (const item of items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity },
            });
        }

        // Create the order
        const newOrder = new Order({
            user: userId,
            items,
            totalPrice: totalAmount,
        });

        await newOrder.save();

        // Notify via socket that a new order has been placed
        io.emit('orderPlaced', { message: 'A new order has been placed', order: newOrder });

        res.status(201).json({
            message: 'Order placed successfully',
            order: newOrder,
        });
        return;
    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ message: 'Error placing order', error });
        return;
    }
};

// Update Order
export const updateOrder = (io: Server) => async (req: Request, res: Response) => {
    const { id } = req.params;
    const { items } = req.body;
    const userId = req.user?.id;

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid Order ID' });
            return;
        }

        // Find the existing order and assert the type
        const existingOrder = await Order.findById(id) as IOrder;

        if (!existingOrder) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Check if the order belongs to the user
        if (existingOrder.user.toString() !== userId) {
            res.status(403).json({ message: 'You are not authorized to update this order' });
            return;
        }

        if (existingOrder.status !== "placed") {
            res.status(400).json({
                message: `Cant update the order, The order is: ${existingOrder.status}`,
            });
            return;
        }

        // Create a map of existing product IDs and their quantities
        const existingItemsMap = new Map<string, number>(existingOrder.items.map(item => [item.product.toString(), item.quantity]));

        let totalAmount = 0;

        // Validate stock and calculate total amount
        for (const item of items) {
            if (!mongoose.Types.ObjectId.isValid(item.product)) {
                res.status(400).json({ message: 'Invalid Product ID' });
                return;
            }
            const product = await Product.findById(item.product);
            if (!product) {
                res.status(404).json({ message: `Product not found: ${item.product}` });
                return;
            }
            const existingQuantity = existingItemsMap.get(item.product.toString()) || 0; // if exist qty of item in existing order || 0
            if ((product.stock + existingQuantity) < item.quantity) {
                res.status(400).json({
                    message: `Insufficient stock for product: ${product.name}`,
                });
                return;
            }
            totalAmount += product.price * item.quantity;
        }

        // Refund the stock back to the products of existing order
        for (const item of existingOrder.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity },
            });
        }

        // Deduct stock of items in new order
        for (const item of items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: -item.quantity },
            });
        }

        // Update the order with new items and total price
        existingOrder.items = items;
        existingOrder.totalPrice = totalAmount;

        await existingOrder.save();

        // Notify via socket about the order update
        io.emit('orderUpdated', { message: 'Order has been updated', order: existingOrder });

        res.status(200).json(existingOrder);
    } catch (error) {
        console.error('Error updating order:', error);
        res.status(500).json({ message: 'Error updating order', error });
    }
};

// Get All Orders
export const getAllOrders = async (req: Request, res: Response) => {
    try {
        const orders = await Order.find()
            .populate('user')
            .populate('items.product');

        res.status(200).json(orders);
        return;
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error });
        return;
    }
};
// Get My Orders
export const getMyOrders = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    try {
        const myOrders = await Order.find({ user: userId })
            .populate('items.product');

        res.status(200).json(myOrders);
    } catch (error) {
        console.error('Error fetching user orders:', error);
        res.status(500).json({ message: 'Error fetching user orders', error });
    }
};
// Allowed status values
const allowedStatuses = ['pending', 'placed', 'shipped'] as const;
type OrderStatus = typeof allowedStatuses[number];

// Update Order Status
export const updateOrderStatus = (io: Server) => async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.query as { status?: OrderStatus };

    try {
        // Validate the status value
        if (!status || !allowedStatuses.includes(status)) {
            res.status(400).json({
                message: 'Invalid status.',
            });
            return;
        }

        const existingOrder = await Order.findById(id);

        if (!existingOrder) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Check if the new status is different from the current one
        if (existingOrder.status === status) {
            res.status(400).json({
                message: 'No update made. The order already has the specified status.',
            });
            return;
        }

        // Update the status if it's different
        existingOrder.status = status;
        const updatedOrder = await existingOrder.save();

        // Notify via socket about the order status update
        io.emit('orderUpdated', { message: 'Order status updated', order: updatedOrder });

        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(500).json({ message: 'Error updating order', error });
    }
};

// Cancel Order
export const cancelOrder = (io: Server) => async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id

    try {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ message: 'Invalid Order ID' });
            return;
        }

        // Find the existing order and assert the type
        const existingOrder = await Order.findById(id) as IOrder;

        if (!existingOrder) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Check if the order belongs to the user
        if (existingOrder.user.toString() !== userId) {
            res.status(403).json({ message: 'You are not authorized to cancel this order' });
            return;
        }

        if (existingOrder.status !== "placed") {
            res.status(400).json({
                message: `Cant cancel the order, The order is: ${existingOrder.status}`,
            });
            return;
        }

        existingOrder.status = "canceled";

        const canceledOrder = await existingOrder.save();

        // Refund the stock back to the products
        for (const item of canceledOrder.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity },
            });
        }

        // Notify via socket that an order has been placed
        io.emit('orderCancelled', { message: 'Order has been cancelled', order: canceledOrder });

        res.status(200).json({ message: 'Order cancelled successfully', order: canceledOrder });
        return;
    } catch (error) {
        res.status(500).json({ message: 'Error canceling order', error });
        return;
    }
};
