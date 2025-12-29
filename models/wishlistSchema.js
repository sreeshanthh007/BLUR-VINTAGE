// models/wishlistSchema.js

import mongoose from 'mongoose';

const { Schema } = mongoose;

const wishlistSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    variant: {
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
        stock: {
            type: Number,
            default: 0
        },
        originalPrice: {
            type: Number,
            required: true
        },
        discount: {
            type: Number,
            default: 0
        },
        offerName: {
            type: String,
            default: ''
        },
        price: {
            type: Number,
            required: true
        },
        productImage: {
            type: [String],
            required: true
        },
        status: {
            type: String,
            enum: ["Available", "out of stock", "discontinued"],
            default: "Available"
        }
    },
    addedOn: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;