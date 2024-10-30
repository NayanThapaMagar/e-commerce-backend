import mongoose, { Schema, Document, Model } from 'mongoose';
import { IUser } from './userModel';
import { IProduct } from './productModel';

interface IOrderItem {
  product: IProduct['_id'];
  quantity: number;
}

interface IOrder extends Document {
  user: IUser['_id']; 
  items: IOrderItem[];
  status: 'pending' | 'canceled' | 'shipped';
  totalPrice: number;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema: Schema<IOrder> = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
      },
    ],
    status: { 
      type: String, 
      enum: ['pending', 'canceled', 'shipped'], 
      default: 'pending' 
    },
    totalPrice: { type: Number, required: true, min: 0 }, 
  },
  { timestamps: true }
);

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema);
export default Order;
