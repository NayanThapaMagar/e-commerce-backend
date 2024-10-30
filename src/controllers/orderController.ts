import { Request, Response } from 'express';
import Order from '../models/orderModel';
import Product from '../models/productModel';
import { Server } from 'socket.io'; 

// Place an Order
export const placeOrder = (io: Server) => async (req: Request, res: Response) => {
    const { items } = req.body; 
    const userId = req.user?.id;

    try {
        let totalAmount = 0;

        // Validate stock and calculate total amount
        for (const item of items) {
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

// Get All Orders
export const getOrders = async (req: Request, res: Response) => {
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

// Update Order Status
export const updateOrderStatus = (io: Server) => async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    try {
        const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });

        if (!updatedOrder) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Notify via socket about the order status update
        io.emit('orderUpdated', { message: 'Order status updated', order: updatedOrder });

        res.status(200).json(updatedOrder);
        return;
    } catch (error) {
        res.status(500).json({ message: 'Error updating order', error });
        return;
    }
};

// Cancel Order
export const cancelOrder = (io: Server) => async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const canceledOrder = await Order.findByIdAndUpdate(id, { status: 'canceled' }, { new: true });

        if (!canceledOrder) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Refund the stock back to the products
        for (const item of canceledOrder.items) {
            await Product.findByIdAndUpdate(item.product, {
                $inc: { stock: item.quantity },
            });
        }

        // Notify via socket that an order has been canceled
        io.emit('orderCancelled', { message: 'Order has been cancelled', order: canceledOrder });

        res.status(200).json({ message: 'Order cancelled successfully', order: canceledOrder });
        return;
    } catch (error) {
        res.status(500).json({ message: 'Error canceling order', error });
        return;
    }
};
