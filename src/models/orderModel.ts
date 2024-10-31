import mongoose, { Schema, Document, Model } from 'mongoose';

interface IOrderItem {
  product: mongoose.Types.ObjectId;
  quantity: number;
}

export interface IOrder extends Document {
  _id: mongoose.Types.ObjectId; 
  user: mongoose.Types.ObjectId; 
  items: IOrderItem[];
  status: 'pending' | 'placed' | 'shipped' | 'canceled';
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
      enum: ['pending', 'placed', 'shipped', 'canceled'], 
      default: 'placed' 
    },
    totalPrice: { type: Number, required: true, min: 0 }, 
  },
  { timestamps: true }
);

const Order: Model<IOrder> = mongoose.model<IOrder>('Order', orderSchema);
export default Order;
