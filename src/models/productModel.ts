import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description: string;
    price: number;
    stock: number;
    imageUrl?: string;
    createdBy: mongoose.Types.ObjectId; 
    createdAt: Date;
    updatedAt: Date;
}

const productSchema: Schema<IProduct> = new Schema<IProduct>(
    {
        name: { type: String, required: true },
        description: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        stock: { type: Number, required: true, min: 0 },
        imageUrl: { type: String },
        createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' }, 
    },
    { timestamps: true }
);

const Product: Model<IProduct> = mongoose.model<IProduct>('Product', productSchema);
export default Product;
