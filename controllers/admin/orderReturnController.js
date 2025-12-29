import Order from '../../models/orderSchema.js';
import Product from '../../models/productSchema.js';
import Wallet from '../../models/walletSchema.js';

const getReturnRequests = async (req, res) => {
    try {
        const pendingReturns = await Order.find({
            'orderItems.status.return.requested': true,
            'orderItems.status.return.status': "Pending"
        }).populate({
            path: "orderItems.product",
            model: "Product",
            select: "productName"
        });

        const approvedReturns = await Order.find({
            'orderItems.status.return.requested': true,
            'orderItems.status.return.status': "Approved"
        }).populate({
            path: "orderItems.product",
            model: "Product",
            select: "productName"   // fixed typo: productNamw → productName
        });

        res.render('admin/returnManagement', {
            pendingReturns,
            approvedReturns
        });
    } catch (error) {
        console.log("Error fetching return requests:", error);
        res.status(500).send("Server error");
    }
};

const initiateReturn = async (req, res) => {
    try {
        const { itemId, orderId } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const orderItem = order.orderItems.id(itemId);

        if (!orderItem) {
            return res.status(404).json({ success: false, message: "Order item not found" });
        }

        orderItem.status.return = {
            reason,
            requested: true,
            requestDate: Date.now(),
            status: "Pending"
        };

        // Check if all items have been returned
        const allItemsReturned = order.orderItems.every(
            item => item.status.itemStatus === "Delivered" && item.status.return.requested
        );

        if (allItemsReturned) {
            order.orderStatus = "Returned";
        }

        await order.save();

        return res.status(200).json({ success: true, message: "Return submitted successfully" });
    } catch (error) {
        console.log("Error in initiate return:", error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

const approvedReturn = async (req, res) => {
    try {
        const { orderId, itemId } = req.params;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const orderItem = order.orderItems.id(itemId);

        if (!orderItem) {
            return res.status(404).json({ success: false, message: "Order item not found" });
        }

        const itemPrice = orderItem.price.discountedPrice * orderItem.quantity;
        const totalOrderAmount = order.pricing.finalAmount;

        // Calculate proportional refund amount
        const totalItemsValue = order.orderItems.reduce(
            (total, item) => total + (item.price.discountedPrice * item.quantity), 0
        );

        const refundAmount = totalItemsValue > 0 
            ? (itemPrice * (totalOrderAmount / totalItemsValue))
            : 0;

        // Restock the product variant
        const product = await Product.findById(orderItem.product);

        if (product) {
            const variant = product.variants.find(
                v => v.color === orderItem.variant.color &&
                     v.size === orderItem.variant.size
            );

            if (variant) {
                variant.stock += orderItem.quantity;
                await product.save();
            }
        }

        orderItem.status.return.status = "Approved";

        // Check if all items are approved for return
        const allItemsApproved = order.orderItems.every(
            item => item.status.return.requested && item.status.return.status === "Approved"
        );

        if (allItemsApproved) {
            order.orderStatus = "Returned";
        }

        // Credit refund to wallet
        let wallet = await Wallet.findOne({ userId: order.userId });

        if (!wallet) {
            wallet = new Wallet({
                userId: order.userId,
                balance: refundAmount
            });
        } else {
            wallet.balance += refundAmount;
        }

        wallet.transactions.push({
            type: 'Refund',
            amount: refundAmount,
            orderId: orderId,
            status: 'Completed',
            description: `Partial refund for order ${order.orderNumber} - Item: ${product?.productName || 'Unknown'}`
        });

        await wallet.save();
        await order.save();

        return res.status(200).json({
            success: true,
            message: "Partial return request approved and wallet credited",
            refundAmount
        });
    } catch (error) {
        console.log("Error in approved return:", error.message);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



export default {
    getReturnRequests,
    initiateReturn,
    approvedReturn
};