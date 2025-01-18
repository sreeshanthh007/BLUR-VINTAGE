const mongoose = require('mongoose');
const {Schema} = mongoose;

const wishlistSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
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


wishlistSchema.index({ userId: 1, product: 1, 'variant.color': 1, 'variant.size': 1 }, { unique: true });