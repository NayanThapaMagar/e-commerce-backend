import { Router } from 'express';
import { placeOrder, getOrders, updateOrderStatus, cancelOrder } from '../controllers/orderController';
import { authenticate } from '../middlewares/authMiddleware';
import { Server } from 'socket.io';

const router = Router();

// Initialize the routes with socket support
export default (io: Server) => {
  router.post('/', authenticate, placeOrder(io));
  router.get('/', authenticate, getOrders);
  router.put('/:id', authenticate, updateOrderStatus(io));
  router.put('/:id/cancel', authenticate, cancelOrder(io));
  return router;
};
