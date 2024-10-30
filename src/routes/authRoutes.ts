import express from 'express';
import { validateRequest, registerUserValidation, loginUserValidation } from '../middlewares/validators';
import { registerUser, loginUser } from '../controllers/authController';

const router = express.Router();

// User Registration Route
router.post(
  '/register',
  registerUserValidation, // Use the imported validation
  validateRequest,
  registerUser
);

// User Login Route
router.post(
  '/login',
  loginUserValidation, // Use the imported validation
  validateRequest,
  loginUser
);

export default router;
