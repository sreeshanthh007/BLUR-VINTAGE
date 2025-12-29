
import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        color: {
            type: String,
            required: true
        },
        colorName: {
            type: String,
            required: true
        },
        size: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        discountedPrice: {
            type: Number
        },
        productImage: {
            type: String,
            required: true
        }
    }],
    totalAmount: {
        type: Number,
        required: true,
        default: 0
    }
}, { timestamps: true });

cartSchema.index({ user: 1 });

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;