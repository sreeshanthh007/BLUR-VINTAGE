    const mongoose = require("mongoose");
    const { Schema } = mongoose;

    const couponSchema = new Schema({
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true
        },
        description: {
            type: String,
            required: true
        },
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        usageLimit: {
            type: Number,
            required: true
        },
        currentUsageCount: {
            type: Number,
            default: 0
        },
        discountType: { 
            type: String,
            enum: ['Percentage', 'Flat'],
            required: true
        },
        discountValue: {
            type: Number,
            required: true,
            min: 0
        },
        minimumOrderAmount: {
            type: Number,
            default: 0
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }, {
        timestamps: true
    });

    const Coupon = mongoose.model("Coupon", couponSchema);
    module.exports = Coupon;