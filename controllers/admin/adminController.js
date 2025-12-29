// controllers/admin/adminController.js

import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import Product from "../../models/productSchema.js";
import Coupon from "../../models/couponSchema.js";
import moment from 'moment';
import pdfKit from 'pdfkit';
import fs from 'fs';
import path from 'path';
import bcrypt from "bcrypt";

// Admin Login
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await User.findOne({ email, isAdmin: true });

        if (!admin) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const isMatch = await bcrypt.compare(password, admin.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        req.session.admin = {
            id: admin._id,
            role: "admin"
        };

        return res.json({ success: true, redirectUrl: "/admin/dashboard" });
    } catch (error) {
        console.error('Error in admin login:', error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// Admin Logout
const logOut = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.status(500).json({ success: false, message: "Failed to log out" });
        }
        res.clearCookie("connect.sid");
        return res.json({ success: true });
    });
};

// Block User
const blockUser = async (req, res) => {
    try {
        const { userId } = req.body;
        await User.updateOne({ _id: userId }, { $set: { isBlocked: true } });
        res.json({ success: true });
    } catch (error) {
        console.error("Error blocking user:", error);
        res.status(500).json({ success: false });
    }
};

// Unblock User
const unblockUser = async (req, res) => {
    try {
        const { userId } = req.body;
        await User.updateOne({ _id: userId }, { $set: { isBlocked: false } });
        res.json({ success: true });
    } catch (error) {
        console.error("Error unblocking user:", error);
        res.status(500).json({ success: false });
    }
};

// Load Admin Login Page
const loadlogin = (req, res) => {
    try {
        if (req.session.admin) {
            return res.redirect("/admin/dashboard");
        }
        res.render('admin/adminlogin', { message: null });
    } catch (error) {
        console.error("Error loading admin login:", error);
        res.status(500).send("Server error");
    }
};

// Load Dashboard
const dashboard = (req, res) => {
    try {
        if (!req.session.admin) {
            return res.redirect("/admin/login");
        }
        res.render("admin/adminDashboard");
    } catch (error) {
        console.error("Error loading dashboard:", error);
        res.status(500).send("Server error");
    }
};

// Load User Management Page (kept for completeness)
const userManage = (req, res) => {
    res.render("admin/userManage");
};

// Order List with Pagination
const orderList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find()
            .populate("orderItems.product", "productName")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const formattedOrders = orders.map(order => {
            const itemsDisplay = order.orderItems.map(item =>
                `${item.variant.colorName} (${item.quantity})`
            ).join(', ');

            const totalQuantity = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);

            return {
                id: order.orderNumber,
                name: order.shippingAddress?.name || 'No name provided',
                address: order.shippingAddress
                    ? `${order.shippingAddress.landMark}, ${order.shippingAddress.city}`
                    : 'No address provided',
                date: order.createdAt.toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                }),
                item: `${itemsDisplay} (Total: ${totalQuantity} items)`,
                status: order.orderStatus,
                amount: order.pricing.finalAmount
            };
        });

        const pagination = {
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            lastPage: totalPages
        };

        res.render("admin/orderList", { orders: formattedOrders, pagination });
    } catch (error) {
        console.error("Error in order list:", error);
        res.status(500).send("Server error");
    }
};

// Order Details
const orderDetails = async (req, res) => {
    try {
        const orderNumber = req.query.id;

        if (!orderNumber) {
            return res.status(400).send("Order ID is required");
        }

        const order = await Order.findOne({ orderNumber })
            .populate({
                path: "orderItems.product",
                model: "Product"
            });

        if (!order) {
            return res.status(404).send("Order not found");
        }

        res.render("admin/orderDetails", { order });
    } catch (error) {
        console.error("Error in order details:", error);
        res.status(500).send("Server error");
    }
};

// Update Order Status
const updateOrderStatus = async (req, res) => {
    try {
        const { id, status } = req.query;

        if (!id || !status) {
            return res.status(400).json({ success: false, message: "Order ID and status required" });
        }

        const order = await Order.findOne({ orderNumber: id });
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        // Restore stock if cancelled
        if (status === 'Cancelled') {
            for (const item of order.orderItems) {
                await Product.findOneAndUpdate(
                    {
                        _id: item.product,
                        'variants.color': item.variant.color,
                        'variants.size': item.variant.size
                    },
                    {
                        $inc: { 'variants.$.stock': item.quantity },
                        $set: { 'variants.$.status': 'Available' }
                    }
                );
            }
        }

        order.orderStatus = status;

        if (status === "Delivered") {
            order.deliveryDate = new Date();
            if (order.payment.method === "COD") {
                order.payment.status = "Completed";
            }
        }

        await order.save();

        res.json({ success: true, message: "Order status updated successfully" });
    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ success: false });
    }
};

// Sales Report
const getSalesReport = async (req, res) => {
    try {
        const { dateRange, startDate, endDate } = req.query;

        let startDateTime, endDateTime;

        switch (dateRange) {
            case 'day':
                startDateTime = moment().startOf('day');
                endDateTime = moment().endOf('day');
                break;
            case 'week':
                startDateTime = moment().startOf('week');
                endDateTime = moment().endOf('week');
                break;
            case 'month':
                startDateTime = moment().startOf('month');
                endDateTime = moment().endOf('month');
                break;
            case 'custom':
                startDateTime = startDate ? moment(startDate).startOf('day') : moment().subtract(30, 'days');
                endDateTime = endDate ? moment(endDate).endOf('day') : moment();
                break;
            default:
                startDateTime = moment().subtract(30, 'days').startOf('day');
                endDateTime = moment().endOf('day');
        }

        const matchStage = {
            deliveryDate: { $gte: startDateTime.toDate(), $lte: endDateTime.toDate() },
            orderStatus: 'Delivered'
        };

        const salesReport = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    ordersCount: { $sum: 1 },
                    grossSales: { $sum: '$pricing.subtotal' },
                    couponDiscount: { $sum: '$pricing.coupon.discount' },
                    productOffers: { $sum: '$pricing.productOffersTotal' },
                    finalRevenue: { $sum: '$pricing.finalAmount' }
                }
            },
            { $sort: { "_id": 1 } },
            {
                $group: {
                    _id: null,
                    dailyData: { $push: "$$ROOT" },
                    totalOrders: { $sum: "$ordersCount" },
                    totalGrossSales: { $sum: "$grossSales" },
                    totalCouponDiscount: { $sum: "$couponDiscount" },
                    totalProductOffers: { $sum: "$productOffers" },
                    totalFinalRevenue: { $sum: "$finalRevenue" }
                }
            },
            {
                $project: {
                    _id: 0,
                    dailyData: 1,
                    totalOrders: 1,
                    totalGrossSales: 1,
                    totalCouponDiscount: 1,
                    totalProductOffers: 1,
                    totalFinalRevenue: 1,
                    totalDiscount: { $add: ['$totalCouponDiscount', '$totalProductOffers'] },
                    averageOrderValue: { $divide: ['$totalFinalRevenue', { $max: ['$totalOrders', 1] }] }
                }
            }
        ]);

        const report = salesReport[0] || {
            totalOrders: 0,
            totalGrossSales: 0,
            totalCouponDiscount: 0,
            totalProductOffers: 0,
            totalFinalRevenue: 0,
            totalDiscount: 0,
            averageOrderValue: 0,
            dailyData: []
        };

        report.discountPercentage = report.totalGrossSales ? (report.totalDiscount / report.totalGrossSales * 100) : 0;

        const paymentMethodStats = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: '$payment.method',
                    count: { $sum: 1 },
                    total: { $sum: '$pricing.finalAmount' }
                }
            }
        ]);

        report.paymentMethods = paymentMethodStats;

        res.render('admin/salesreport', {
            title: 'Sales Report',
            report,
            dateRange: dateRange || 'month',
            startDate: startDateTime.format('YYYY-MM-DD'),
            endDate: endDateTime.format('YYYY-MM-DD'),
            moment
        });
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).render('error', { message: 'Error generating sales report' });
    }
};

// Analytics Dashboard
const getAnalyticsDashboard = async (req, res) => {
    try {
        const timeframe = req.query.timeframe || 'monthly';
        let startDate, endDate;

        switch (timeframe) {
            case 'weekly':
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                startDate.setDate(startDate.getDate() - startDate.getDay());
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'monthly':
                startDate = new Date();
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
                break;
            case 'yearly':
                startDate = new Date(new Date().getFullYear(), 0, 1);
                endDate = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
                break;
            default:
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
        }

        const topProducts = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate }, orderStatus: { $nin: ['Cancelled', 'Failed'] } } },
            { $unwind: '$orderItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderItems.product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: '$orderItems.product',
                    productName: { $first: '$productInfo.productName' },
                    totalQuantity: { $sum: '$orderItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderItems.quantity', '$orderItems.price.discountedPrice'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);

        const topCategories = await Order.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate }, orderStatus: { $nin: ['Cancelled', 'Failed'] } } },
            { $unwind: '$orderItems' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'orderItems.product',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'productInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$categoryInfo._id',
                    categoryName: { $first: '$categoryInfo.name' },
                    totalQuantity: { $sum: '$orderItems.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$orderItems.quantity', '$orderItems.price.discountedPrice'] } }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);

        res.render('admin/analyticDashboard', {
            topProducts,
            topCategories,
            timeframe,
            dateRange: {
                start: startDate.toLocaleDateString(),
                end: endDate.toLocaleDateString()
            }
        });
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).send('Error generating analytics');
    }
};



export default {
    loadlogin,
    dashboard,
    login,
    userManage,
    logOut,
    blockUser,
    unblockUser,
    orderList,
    orderDetails,
    updateOrderStatus,
    getSalesReport,
    getAnalyticsDashboard
};