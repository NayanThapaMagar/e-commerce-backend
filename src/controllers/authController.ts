import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/userModel';

import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables.');
}

const HASH_ROUNDS = 10;

// User Registration
export const registerUser = async (req: Request, res: Response) => {
  const { username, email, password, role } = req.body;

  try {
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    if (existingUser) {
      const conflictField = existingUser.email === email ? 'email' : 'username';
      res.status(401).json({
        message: `User with this ${conflictField} already exists. Please try with a different ${conflictField}.`
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, HASH_ROUNDS);
    const newUser = new User({ username, email, password: hashedPassword, role });
    const savedUser = await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      token,
      user: { id: savedUser._id, email: savedUser.email, role: savedUser.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error, please try again later' });
  }
};

// User Login
export const loginUser = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ success: false, message: 'User not found' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(400).json({ success: false, message: 'Incorrect password' });
      return;
    }

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      success: true,
      token,
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error, please try again later' });
  }
};
