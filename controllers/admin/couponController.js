// controllers/admin/couponController.js

import Coupon from "../../models/couponSchema.js";
import Cart from "../../models/cartSchema.js";

// Load coupon management page
const couponPage = async (req, res) => {
    try {
        const coupons = await Coupon.find({}).sort({ createdAt: -1 });

        return res.render('admin/couponAddPage', { coupons });
    } catch (error) {
        console.error("Error loading coupon page:", error);
        res.status(500).render('error', { message: "Failed to load coupons" });
    }
};

// Add new coupon
const addCoupon = async (req, res) => {
    try {
        const { code, limit, amount, description, startDate, endDate, minOrder } = req.body;

        // Basic validation
        if (!code || !limit || !amount || !startDate || !endDate) {
            return res.status(400).json({ success: false, message: "All required fields must be filled" });
        }

        const trimmedCode = code.trim().toUpperCase();

        const existingCoupon = await Coupon.findOne({ code: trimmedCode });

        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon code already exists" });
        }

        const parsedStartDate = new Date(startDate);
        parsedStartDate.setUTCHours(0, 0, 0, 0);

        const parsedEndDate = new Date(endDate);
        parsedEndDate.setUTCHours(23, 59, 59, 999);

        if (parsedStartDate > parsedEndDate) {
            return res.status(400).json({ success: false, message: "End date must be after start date" });
        }

        const newCoupon = new Coupon({
            code: trimmedCode,
            usageLimit: Number(limit),
            currentUsageCount: 0,
            discountType: "Flat",
            discountValue: Number(amount),
            minimumOrderAmount: Number(minOrder || 0),
            description: description.trim(),
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            isActive: true
        });

        await newCoupon.save();

        return res.json({ success: true, message: "Coupon added successfully" });
    } catch (error) {
        console.error("Error adding coupon:", error);
        return res.status(500).json({ success: false, message: "Failed to add coupon" });
    }
};

// Load edit coupon page
const loadEditCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;

        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return res.status(404).render('error', { message: "Coupon not found" });
        }

        const formattedStartDate = coupon.startDate.toISOString().split('T')[0];
        const formattedEndDate = coupon.endDate.toISOString().split('T')[0];

        res.render('admin/editCoupon', {
            coupon: {
                _id: coupon._id,
                code: coupon.code,
                usageLimit: coupon.usageLimit,
                currentUsageCount: coupon.currentUsageCount,
                discountValue: coupon.discountValue,
                minimumOrderAmount: coupon.minimumOrderAmount,
                description: coupon.description,
                startDate: formattedStartDate,
                endDate: formattedEndDate,
                isActive: coupon.isActive
            }
        });
    } catch (error) {
        console.error("Error loading edit coupon:", error);
        res.status(500).render('error', { message: "Server error" });
    }
};

// Update existing coupon
const editCoupon = async (req, res) => {
    try {
        const { couponId } = req.params;
        const { usageLimit, discountValue, minOrder, description, startDate, endDate } = req.body;

        const coupon = await Coupon.findById(couponId);

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        const parsedStartDate = new Date(startDate);
        parsedStartDate.setUTCHours(0, 0, 0, 0);

        const parsedEndDate = new Date(endDate);
        parsedEndDate.setUTCHours(23, 59, 59, 999);

        if (parsedStartDate > parsedEndDate) {
            return res.status(400).json({ success: false, message: "End date must be after start date" });
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            couponId,
            {
                usageLimit: Number(usageLimit),
                discountValue: Number(discountValue),
                minimumOrderAmount: Number(minOrder || 0),
                description: description?.trim(),
                startDate: parsedStartDate,
                endDate: parsedEndDate
            },
            { new: true, runValidators: true }
        );

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: "Failed to update coupon" });
        }

        return res.json({
            success: true,
            message: "Coupon updated successfully",
            redirectUrl: '/admin/coupons'
        });
    } catch (error) {
        console.error("Error editing coupon:", error);
        return res.status(500).json({ success: false, message: "Failed to update coupon" });
    }
};

// Delete coupon
const deleteCoupon = async (req, res) => {
    try {
        const { couponId } = req.query;

        if (!couponId) {
            return res.status(400).json({ success: false, message: "Coupon ID is required" });
        }

        const coupon = await Coupon.findByIdAndDelete(couponId);

        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        return res.json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        return res.status(500).json({ success: false, message: "Failed to delete coupon" });
    }
};

// Get currently available (active & valid) coupons – used on frontend checkout
const availableCoupons = async (req, res) => {
    try {
        const now = new Date();

        const activeCoupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: now },
            endDate: { $gte: now },
            $expr: { $lt: ["$currentUsageCount", "$usageLimit"] }
        }).select("code discountValue discountType minimumOrderAmount description");

        res.json(activeCoupons);
    } catch (error) {
        console.error("Error fetching available coupons:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};




export default {
    couponPage,
    addCoupon,
    loadEditCoupon,
    editCoupon,
    deleteCoupon,
    availableCoupons
};