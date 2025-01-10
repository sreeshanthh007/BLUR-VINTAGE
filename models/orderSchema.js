const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderSchema = new Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    orderItems: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
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
            productImage: {
                type: String,
                required: true
            }
        },
        price: {
            originalPrice: {
                type: Number,
                required: true
            },
            discountedPrice: {
                type: Number,
                required: true
            },
            productOffer: {
                type: Number,
                default: 0
            }
        },
        status: {
            itemStatus: {
                type: String,
                enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'],
                default: 'Processing'
            },
            return: {
                requested: {
                    type: Boolean,
                    default: false
                },
                status: {
                    type: String,
                    enum: ['Pending', 'Approved', 'Rejected'],
                    default: 'Pending'
                },
                reason: {
                    type: String
                },
                comments: {
                    type: String
                },
                requestDate: {
                    type: Date
                }
            }
        }
    }],
    shippingAddress: {
        name: {
            type: String,
            required: true
        },
        landMark: {
            type: String,
            required: true
        },
        city: {
            type: String,
            required: true
        },
        state: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        pincode: {
            type: String,
            required: true
        },
        phone: {
            type: String,
            required: true
        }
    },
    payment: {
        method: {
            type: String,
            enum: ['COD', 'Card Payment', 'Wallet', 'UPI', 'Bank Transfer', 'Razorpay'],
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Completed', 'Failed'],
            default: 'Pending'
        },
        transactionId: {
            type: String
        },
        paidAt: {
            type: Date
        }
    },
    pricing: {
        subtotal: {
            type: Number,
            required: true
        },
        coupon: {
            code: {
                type: String
            },
            discount: {
                type: Number,
                default: 0
            }
        },
        productOffersTotal: {
            type: Number,
            default: 0
        },
        finalAmount: {
            type: Number,
            required: true
        }
    },
    orderStatus: {
        type: String,
        enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled', 'Failed', 'Returned'],
        default: 'Processing'
    },
    cancelReason: {
        type: String
    },
    orderNumber: {
        type: String,
        unique: true,
        required: true
    },
    expectedDeliveryDate: {
        type: Date
    }
}, {
    timestamps: true
});

// Index for faster queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;