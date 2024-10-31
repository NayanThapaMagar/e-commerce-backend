import { body, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Check for validation errors
export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

// User Registration Validations
export const registerUserValidation = [
  body('username').isString().isAlphanumeric().withMessage('username must be Alphanumeric'),
  body('email').isEmail().withMessage('Must be a valid email'),
  body('password')
    .isLength({ min: 6 })
    // .isStrongPassword()
    // .withMessage('Password must be at least 8 characters long, contain at least 1 uppercase letter, 1 number, and 1 symbol.'),
    .withMessage('Password must be at least 6 characters long'),
  body('role')
    .isIn(['user', 'admin', 'superadmin'])
    .withMessage('Role must be either user or admin or superadmin'),
];

// User Login Validations
export const loginUserValidation = [
  body('email').isEmail().withMessage('Must be a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Product Validation Rules
export const productValidation = [
  body('name').isString().withMessage('Product name must be a string'),
  body('description').isString().optional(),
  body('price').isFloat({ gt: 0 }).withMessage('Price must be a positive number'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a non-negative integer'),
];

// Order Validation Rules
export const orderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be an array and contain at least one item'),

  body('items.*.product')
    .isMongoId()
    .withMessage('Invalid Product ID'),

  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
];

// Object ID Validation Rule
export const objectIdValidation = [
  param('id').isMongoId().withMessage('Invalid Object ID'),
];
