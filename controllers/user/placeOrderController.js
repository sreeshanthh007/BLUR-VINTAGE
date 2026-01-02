
import Product from "../../models/productSchema.js";
import Order from "../../models/orderSchema.js";
import Cart from "../../models/cartSchema.js";
import Coupon from '../../models/couponSchema.js';
import Wallet from '../../models/walletSchema.js';
import { razorpayInstance } from "../../config/razorPay.js";
import crypto from 'crypto';

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const { cart, address, paymentMethod, coupon } = req.body;

        const orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);
        const orderItems = [];
        let subtotal = 0;
        let totalProductOffersDiscount = 0;

        // Process each item and calculate pricing
        for (const item of cart.items) {
            const product = await Product.findById(item.product._id)
                .populate('productOffer')
                .populate({
                    path: 'category',
                    populate: { path: 'categoryOffer' }
                });

            if (!product) {
                return res.status(400).json({ success: false, message: `Product not found: ${item.product.productName}` });
            }

            if (product.isBlocked) {
                return res.status(400).json({ success: false, message: `Product is blocked: ${product.productName}` });
            }

            if (!product.category?.isListed) {
                return res.status(400).json({ success: false, message: "Product category is currently unavailable" });
            }

            const variant = product.variants.find(v =>
                v.color === item.color && v.size === item.size
            );

            if (!variant) {
                return res.status(400).json({ success: false, message: `Variant not found: ${item.size}, ${item.color}` });
            }

            // Calculate best discount
            const now = new Date();
            let bestDiscount = 0;
            let discountedPrice = variant.price;
            let offerType = 'No Offer';

            if (product.productOffer && now >= product.productOffer.startDate && now <= product.productOffer.expiryDate) {
                bestDiscount = product.productOffer.discount;
                discountedPrice = variant.price * (1 - bestDiscount / 100);
                offerType = 'Product Offer';
            }

            if (product.category?.categoryOffer && now >= product.category.categoryOffer.startDate && now <= product.category.categoryOffer.expiryDate) {
                const catDiscount = product.category.categoryOffer.discount;
                if (catDiscount > bestDiscount) {
                    bestDiscount = catDiscount;
                    discountedPrice = variant.price * (1 - catDiscount / 100);
                    offerType = 'Category Offer';
                }
            }

            discountedPrice = Math.round(discountedPrice);
            const itemTotal = discountedPrice * item.quantity;
            subtotal += itemTotal;

            if (bestDiscount > 0) {
                totalProductOffersDiscount += (variant.price - discountedPrice) * item.quantity;
            }

            // ATOMIC STOCK DEDUCTION for COD & Wallet only
            if (paymentMethod !== "RAZORPAY") {
                const updated = await Product.findOneAndUpdate(
                    {
                        _id: product._id,
                        "variants.color": item.color,
                        "variants.size": item.size,
                        "variants.stock": { $gte: item.quantity }
                    },
                    {
                        $inc: { "variants.$.stock": -item.quantity }
                    },
                    { new: true }
                );

                if (!updated) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${product.productName} (${item.size}, ${item.color})`
                    });
                }
            }

            orderItems.push({
                product: item.product._id,
                quantity: item.quantity,
                variant: {
                    color: item.color,
                    colorName: item.colorName,
                    size: item.size,
                    productImage: item.productImage
                },
                price: {
                    originalPrice: variant.price,
                    discountedPrice,
                    productOffer: bestDiscount,
                    offerType
                },
                status: { itemStatus: "Processing" }
            });
        }

        // Apply coupon
        let finalDiscount = 0;
        if (coupon?.code) {
            const validCoupon = await Coupon.findOne({
                code: coupon.code.toUpperCase(),
                isActive: true
            });

            if (!validCoupon) throw new Error("Invalid coupon");
            if (subtotal < validCoupon.minimumOrderAmount) throw new Error(`Minimum order amount ₹${validCoupon.minimumOrderAmount} not met`);
            if (validCoupon.currentUsageCount >= validCoupon.usageLimit) throw new Error("Coupon usage limit exceeded");

            finalDiscount = validCoupon.discountType === "Percentage"
                ? Math.round(subtotal * (validCoupon.discountValue / 100))
                : validCoupon.discountValue;

            finalDiscount = Math.min(finalDiscount, subtotal);
            validCoupon.currentUsageCount += 1;
            await validCoupon.save();
        }

        const finalAmount = subtotal - finalDiscount;

        // Razorpay: Only create order, no stock deduction yet
        if (paymentMethod === "RAZORPAY") {
            const options = {
                amount: Math.round(finalAmount * 100),
                currency: "INR",
                receipt: orderNumber
            };

            const razorPayOrder = await razorpayInstance.orders.create(options);
            return res.json({
                success: true,
                razorpayOrderId: razorPayOrder.id,
                amount: razorPayOrder.amount,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID
            });
        }

        // Wallet payment
        if (paymentMethod === "WALLET") {
            const wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.balance < finalAmount) {
                throw new Error("Insufficient wallet balance");
            }

            wallet.balance -= finalAmount;
            wallet.transactions.push({
                type: "Purchase",
                description: `Purchase - Order #${orderNumber}`,
                amount: finalAmount,
                orderId: orderNumber,
                status: "Completed"
            });
            await wallet.save();
        }

        // Create order (COD or Wallet)
        const order = new Order({
            userId,
            orderItems,
            shippingAddress: address,
            payment: {
                method: paymentMethod,
                status: paymentMethod === "COD" ? "Pending" : "Completed"
            },
            pricing: {
                subtotal,
                coupon: coupon ? { code: coupon.code, discount: finalDiscount } : undefined,
                productOffersTotal: Math.round(totalProductOffersDiscount),
                finalAmount
            },
            orderStatus: "Processing",
            orderNumber
        });

        await order.save();

        // Clear cart
        await Cart.findOneAndUpdate(
            { user: userId },
            { $set: { items: [], totalAmount: 0 } }
        );

        res.json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id,
            orderNumber
        });

    } catch (error) {
        console.error('Order placement error:', error);
        res.status(400).json({ success: false, message: error.message || 'Failed to place order' });
    }
};

const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user || req.session?.passport?.user;

        const coupon = await Coupon.findOne({
            code: couponCode.toUpperCase(),
            isActive: true
        });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid or expired coupon" });
        }

        const cart = await Cart.findOne({ user: userId });
        if (cart.totalAmount < coupon.minimumOrderAmount) {
            return res.json({
                success: false,
                message: `Minimum order amount of ₹${coupon.minimumOrderAmount} not met`
            });
        }

        if (coupon.currentUsageCount >= coupon.usageLimit) {
            return res.json({ success: false, message: "Coupon usage limit exceeded" });
        }

        let discountAmount = coupon.discountType === "Percentage"
            ? cart.totalAmount * (coupon.discountValue / 100)
            : coupon.discountValue;

        discountAmount = Math.min(discountAmount, cart.totalAmount);

        res.json({
            success: true,
            discountAmount,
            couponCode: coupon.code,
            message: "Coupon applied successfully"
        });
    } catch (error) {
        console.error("Error applying coupon:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cart, address, coupon } = req.body;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }

        const userId = req.session.user || req.session?.passport?.user;
        const orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);
        const orderItems = [];
        let subtotal = 0;
        let totalProductOffersDiscount = 0;
        let finalDiscount = 0;

        // Deduct stock atomically on successful payment
        for (const item of cart.items) {
            const product = await Product.findById(item.product._id)
                .populate('productOffer')
                .populate({ path: 'category', populate: { path: 'categoryOffer' } });

            const variant = product.variants.find(v => v.color === item.color && v.size === item.size);
            if (!variant) throw new Error("Variant not found");

            let discountedPrice = variant.price;
            let bestDiscount = 0;
            let offerType = 'No Offer';

            const now = new Date();
            if (product.productOffer && now >= product.productOffer.startDate && now <= product.productOffer.expiryDate) {
                bestDiscount = product.productOffer.discount;
                discountedPrice = variant.price * (1 - bestDiscount / 100);
                offerType = 'Product Offer';
            }

            if (product.category?.categoryOffer && now >= product.category.categoryOffer.startDate && now <= product.category.categoryOffer.expiryDate) {
                const catDiscount = product.category.categoryOffer.discount;
                if (catDiscount > bestDiscount) {
                    bestDiscount = catDiscount;
                    discountedPrice = variant.price * (1 - catDiscount / 100);
                    offerType = 'Category Offer';
                }
            }

            discountedPrice = Math.round(discountedPrice);
            subtotal += discountedPrice * item.quantity;
            totalProductOffersDiscount += (variant.price - discountedPrice) * item.quantity;

            // ATOMIC STOCK DEDUCTION
            const updatedProduct = await Product.findOneAndUpdate(
                {
                    _id: product._id,
                    "variants.color": item.color,
                    "variants.size": item.size,
                    "variants.stock": { $gte: item.quantity }
                },
                {
                    $inc: { "variants.$.stock": -item.quantity }
                },
                { new: true }
            );

            if (!updatedProduct) {
                return res.status(400).json({
                    success: false,
                    message: `Item out of stock: ${product.productName} (${item.size}, ${item.color})`
                });
            }

            orderItems.push({
                product: item.product._id,
                quantity: item.quantity,
                variant: {
                    color: item.color,
                    colorName: item.colorName,
                    size: item.size,
                    productImage: item.productImage
                },
                price: {
                    originalPrice: variant.price,
                    discountedPrice,
                    productOffer: bestDiscount,
                    offerType
                },
                status: { itemStatus: "Processing" }
            });
        }

        // Apply coupon
        if (coupon?.code) {
            const validCoupon = await Coupon.findOne({ code: coupon.code.toUpperCase(), isActive: true });
            if (validCoupon && subtotal >= validCoupon.minimumOrderAmount && validCoupon.currentUsageCount < validCoupon.usageLimit) {
                finalDiscount = validCoupon.discountType === "Percentage"
                    ? Math.round(subtotal * (validCoupon.discountValue / 100))
                    : validCoupon.discountValue;
                finalDiscount = Math.min(finalDiscount, subtotal);
                validCoupon.currentUsageCount += 1;
                await validCoupon.save();
            }
        }

        const finalAmount = subtotal - finalDiscount;

        const order = new Order({
            userId,
            orderItems,
            shippingAddress: address,
            payment: {
                method: "Razorpay",
                status: "Completed",
                razorpay: { orderId: razorpay_order_id, paymentId: razorpay_payment_id, signature: razorpay_signature },
                paidAt: new Date()
            },
            pricing: {
                subtotal,
                productOffersTotal: Math.round(totalProductOffersDiscount),
                coupon: coupon ? { code: coupon.code, discount: finalDiscount } : undefined,
                finalAmount
            },
            orderStatus: "Processing",
            orderNumber
        });

        await order.save();
        await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [], totalAmount: 0 } });

        res.json({ success: true, message: "Payment verified and order placed successfully", orderNumber });
    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(400).json({ success: false, message: error.message || 'Payment verification failed' });
    }
};

const verifyPaymentFailure = async (req, res) => {
    try {
        const { razorpayOrderId, cart, address, coupon } = req.body;
        const userId = req.session.user || req.session?.passport?.user;
        const orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);

        const orderItems = [];
        let subtotal = 0;
        let totalProductOffersDiscount = 0;

        for (const item of cart.items) {
            const product = await Product.findById(item.product._id)
                .populate('productOffer')
                .populate({ path: 'category', populate: { path: 'categoryOffer' } });

            const variant = product.variants.find(v => v.color === item.color && v.size === item.size);

            let discountedPrice = variant.price;
            let bestDiscount = 0;

            const now = new Date();
            if (product.productOffer && now >= product.productOffer.startDate && now <= product.productOffer.expiryDate) {
                bestDiscount = product.productOffer.discount;
                discountedPrice = variant.price * (1 - bestDiscount / 100);
            }

            if (product.category?.categoryOffer && now >= product.category.categoryOffer.startDate && now <= product.category.categoryOffer.expiryDate) {
                const catDiscount = product.category.categoryOffer.discount;
                if (catDiscount > bestDiscount) {
                    discountedPrice = variant.price * (1 - catDiscount / 100);
                }
            }

            discountedPrice = Math.round(discountedPrice);
            subtotal += discountedPrice * item.quantity;
            totalProductOffersDiscount += (variant.price - discountedPrice) * item.quantity;

            orderItems.push({
                product: item.product._id,
                quantity: item.quantity,
                variant: {
                    color: item.color,
                    colorName: item.colorName,
                    size: item.size,
                    productImage: item.productImage
                },
                price: {
                    originalPrice: variant.price,
                    discountedPrice,
                    productOffer: bestDiscount,
                    offerType: bestDiscount > 0 ? 'Product/Category Offer' : 'No Offer'
                },
                status: { itemStatus: "Cancelled" }
            });
        }

        let couponDiscount = 0;
        if (coupon?.code) {
            const validCoupon = await Coupon.findOne({ code: coupon.code.toUpperCase(), isActive: true });
            if (validCoupon && subtotal >= validCoupon.minimumOrderAmount) {
                couponDiscount = validCoupon.discountType === "Percentage"
                    ? Math.round(subtotal * (validCoupon.discountValue / 100))
                    : validCoupon.discountValue;
                couponDiscount = Math.min(couponDiscount, subtotal);
            }
        }

        const finalAmount = subtotal - couponDiscount;

        const order = await Order.create({
            userId,
            orderItems,
            shippingAddress: address,
            payment: {
                method: 'Razorpay',
                status: 'Failed',
                razorpay: { orderId: razorpayOrderId }
            },
            pricing: {
                subtotal,
                productOffersTotal: Math.round(totalProductOffersDiscount),
                coupon: coupon ? { code: coupon.code, discount: couponDiscount } : undefined,
                finalAmount
            },
            orderStatus: 'Failed',
            orderNumber
        });

        // await Cart.findOneAndUpdate({ user: userId }, { $set: { items: [], totalAmount: 0 } });

        res.json({ success: true, message: 'Order created with failed payment status', orderNumber });
    } catch (error) {
        console.error('Payment failure processing error:', error);
        res.status(500).json({ success: false, message: 'Failed to process payment failure' });
    }
};

const retryPayment = async (req, res) => {
    try {
        const { orderId } = req.params;
        const order = await Order.findById(orderId);

        if (!order || order.payment.status !== "Failed") {
            return res.status(400).json({ success: false, message: "Order not eligible for retry" });
        }

        const options = {
            amount: Math.round(order.pricing.finalAmount * 100),
            currency: "INR",
            receipt: order.orderNumber
        };

        const razorPayOrder = await razorpayInstance.orders.create(options);
        order.payment.razorpay.orderId = razorPayOrder.id;
        await order.save();

        res.json({
            success: true,
            razorpayOrderId: razorPayOrder.id,
            amount: razorPayOrder.amount,
            razorpayKeyId: process.env.RAZORPAY_KEY_ID,
            orderNumber: order.orderNumber,
            customerName: order.shippingAddress.name,
            customerPhone: order.shippingAddress.phone
        });
    } catch (error) {
        console.error('Retry payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to initiate retry' });
    }
};

const retryPaymentVerification = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (expectedSignature !== razorpay_signature) {
            return res.status(400).json({ success: false, message: "Payment verification failed" });
        }

        const order = await Order.findOne({ 'payment.razorpay.orderId': razorpay_order_id });
        if (!order || order.payment.status === "Completed") {
            return res.status(400).json({ success: false, message: "Invalid or already completed order" });
        }

    
        for (const item of order.orderItems) {
            const updatedProduct = await Product.findOneAndUpdate(
                {
                    _id: item.product,
                    "variants.color": item.variant.color,
                    "variants.size": item.variant.size,
                    "variants.stock": { $gte: item.quantity }
                },
                {
                    $inc: { "variants.$.stock": -item.quantity }
                },
                { new: true }
            );

            if (!updatedProduct) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock during retry: ${item.variant.size}, ${item.variant.color}`
                });
            }

            item.status.itemStatus = "Processing";
        }

        order.payment.status = "Completed";
        order.payment.razorpay.paymentId = razorpay_payment_id;
        order.payment.razorpay.signature = razorpay_signature;
        order.payment.paidAt = new Date();
        order.orderStatus = "Processing";

        await order.save();

        res.json({ success: true, message: "Retry payment successful" });
    } catch (error) {
        console.error('Retry payment verification error:', error);
        res.status(500).json({ success: false, message: 'Retry failed' });
    }
};

const orderDetails = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const page = parseInt(req.query.page) || 1;
        const limit = 3;
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ userId });
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
                path: "orderItems.product",
                select: "productName description category"
            });

        res.render('user/orderDetails', {
            orders,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        console.error("Error in order details:", error);
        res.status(500).send("Server error");
    }
};

const cancelOrder = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(orderId)
            .populate({ path: "orderItems.product", select: "productName variants" });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const orderItem = order.orderItems.id(itemId);
        if (!orderItem) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        if (orderItem.status.itemStatus === 'Cancelled' || orderItem.status.itemStatus === 'Delivered') {
            return res.status(400).json({ success: false, message: `Item already ${orderItem.status.itemStatus.toLowerCase()}` });
        }

        const refundAmount = orderItem.price.discountedPrice * orderItem.quantity;

        if ((order.payment.method === "Razorpay" && order.payment.status === "Completed") || order.payment.method === "Wallet") {
            const wallet = await Wallet.findOne({ userId: order.userId });
            if (!wallet) {
                return res.status(400).json({ success: false, message: "Wallet not found" });
            }

            wallet.balance += refundAmount;
            wallet.transactions.push({
                type: "Refund",
                amount: refundAmount,
                orderId: order.orderNumber,
                description: `Refund for cancelled item - ${order.orderNumber}`,
                status: "Completed"
            });
            await wallet.save();
        }

        // Restock
        const product = await Product.findById(orderItem.product._id);
        if (product) {
            const variant = product.variants.find(v =>
                v.color === orderItem.variant.color && v.size === orderItem.variant.size
            );
            if (variant) {
                variant.stock += orderItem.quantity;
                await product.save();
            }
        }

        orderItem.status.itemStatus = 'Cancelled';
        orderItem.status.return = { reason, requested: true, status: "Pending" };

        if (order.orderItems.every(item => item.status.itemStatus === 'Cancelled')) {
            order.orderStatus = 'Cancelled';
        }

        await order.save();

        res.json({ success: true, message: 'Item cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling item:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel item' });
    }
};

const cancelAllOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(orderId)
            .populate({ path: "orderItems.product", select: "productName variants" });

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.orderStatus === "Cancelled" || order.orderStatus === "Delivered") {
            return res.status(400).json({ success: false, message: `Order is already ${order.orderStatus.toLowerCase()}` });
        }

        let totalRefundAmount = 0;

        for (const item of order.orderItems) {
            if (item.status.itemStatus === "Cancelled") continue;

            totalRefundAmount += item.price.discountedPrice * item.quantity;

            const product = await Product.findById(item.product._id);
            if (product) {
                const variant = product.variants.find(v =>
                    v.color === item.variant.color && v.size === item.variant.size
                );
                if (variant) {
                    variant.stock += item.quantity;
                    await product.save();
                }
            }

            item.status.itemStatus = "Cancelled";
        }

        if ((order.payment.method === "Razorpay" && order.payment.status === "Completed") || order.payment.method === "Wallet") {
            const wallet = await Wallet.findOne({ userId: order.userId });
            if (wallet) {
                wallet.balance += totalRefundAmount;
                wallet.transactions.push({
                    type: "Refund",
                    amount: totalRefundAmount,
                    orderId: order.orderNumber,
                    description: `Full refund for cancelled order ${order.orderNumber}`,
                    status: "Completed"
                });
                await wallet.save();
            }
        }

        order.orderStatus = "Cancelled";
        order.cancelReason = reason || "Cancelled by user";
        await order.save();

        res.json({ success: true, message: "Entire order cancelled successfully" });
    } catch (error) {
        console.error("Error cancelling order:", error);
        res.status(500).json({ success: false, message: "Failed to cancel order" });
    }
};

export default {
    placeOrder,
    applyCoupon,
    verifyPayment,
    verifyPaymentFailure,
    retryPayment,
    retryPaymentVerification,
    orderDetails,
    cancelOrder,
    cancelAllOrder
};

