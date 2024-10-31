import { Router } from 'express';
import { placeOrder, getAllOrders, getMyOrders, updateOrder, updateOrderStatus, cancelOrder } from '../controllers/orderController';
import { authenticate, isUser, isSuperAdmin } from '../middlewares/authMiddleware';
import {
  validateRequest,
  orderValidation,
  objectIdValidation
} from '../middlewares/validators';
import { Server } from 'socket.io';

const router = Router();

export default (io: Server) => {
  router.post('/', authenticate, isUser, orderValidation, validateRequest, placeOrder(io));

  router.get('/', authenticate, isSuperAdmin, getAllOrders);
  router.get('/my-orders', authenticate, isUser, getMyOrders);

  router.put('/:id', authenticate, isUser, objectIdValidation, orderValidation, validateRequest, updateOrder(io));
  router.patch('/:id/status', authenticate, isSuperAdmin, objectIdValidation, validateRequest, updateOrderStatus(io));

  router.patch('/:id/cancel', authenticate, isUser, objectIdValidation, validateRequest, cancelOrder(io));
  return router;
};
