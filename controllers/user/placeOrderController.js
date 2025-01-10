const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");
const Cart = require("../../models/cartSchema");

const placeOrder = async (req, res) => {
    try {
        
        const userId = req.session.user
        const { cart, address, paymentMethod } = req.body;
        const orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);
        const orderItems = [];
        let subtotal = 0;

        // First verify all products have sufficient stock
        for (const items of cart.items) {
            const product = await Product.findById(items.product._id);
            if (!product) {
                throw new Error(`Product not found: ${items.product._id}`);
            }

            const variant = product.variants.find(v => 
                v.color === items.color && v.size === items.size
            );

            if (!variant || variant.stock < items.quantity) {
                throw new Error(`Insufficient stock for ${product.productName}`);
            }
        }

        // If all stock checks pass, proceed with order creation
        for (const items of cart.items) {
            const product = await Product.findById(items.product._id);
            const variant = product.variants.find(v => 
                v.color === items.color && v.size === items.size
            );

            // Update stock
            variant.stock -= items.quantity;
            await product.save();

            const orderItem = {
                product: items.product._id,
                quantity: items.quantity,
                variant: {
                    color: items.color,
                    colorName: items.colorName,
                    size: items.size,
                    productImage: items.productImage
                },
                price: {
                    originalPrice: items.price,
                    discountedPrice : items.discountPrice || items.price,
                    productOffer: items.productOffer || 0
                },
                status: {
                    itemStatus: "Processing"
                }
            };

            orderItems.push(orderItem);
            subtotal += (items.discountPrice || items.price) * items.quantity;
        }

        const order = new Order({
            userId: userId,
            orderItems,
            shippingAddress: address,
            payment: {
                method: paymentMethod,
                status: paymentMethod === "COD" ? 'Pending' : "Completed"
            },
            pricing: {
                subtotal,
                finalAmount: subtotal
            },
            orderStatus: "Processing",
            orderNumber
        });

        await order.save();
        
        // Clear the user's cart
        try {
            await Cart.findOneAndUpdate(
                { user: userId },
                { 
                    $set: { 
                        items: [],
                        totalAmount: 0
                    }
                }
            );
            console.log('Cart cleared successfully');
        } catch (cartError) {
            console.error('Error clearing cart:', cartError);
        }


        res.status(200).json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id,
            orderNumber
        });

    } catch (error) {
        console.error('Order placement error:', error);
        res.status(400).json({
            success: false,
            message: error.message || 'Failed to place order'
        });
    }
};
const orderDetails = async(req,res)=>{
    try {
        const userId = req.session.user;
        console.log("user id",userId);

        const orders = await Order.find({userId:userId})
        .sort({createdAt:-1})
        .populate({
            path:"orderItems.product",
            select:"productName description category"
        })
        
        if(!orders){
            return res.send("order not found")
        }
        res.render('user/orderDetails',{orders})
    } catch (error) {
        console.log("error in order details",error.message);
    }
}

const cancelOrder = async(req,res)=>{
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
            .populate({
                path: 'orderItems.product',
                select: 'productName variants'
            });

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        // Check if order is already cancelled or delivered
        if (order.orderStatus === 'Cancelled' || order.orderStatus === 'Delivered') {
            return res.status(400).json({ 
                success: false, 
                message: `Order cannot be cancelled as it is ${order.orderStatus.toLowerCase()}` 
            });
        }

        // Reverse the quantity for each product
        for (const item of order.orderItems) {
            const product = await Product.findById(item.product._id);
            
            if (product) {
                // Find the specific variant
                const variant = product.variants.find(v => 
                    v.color === item.variant.color && 
                    v.size === item.variant.size
                );
                
                if (variant) {
                    // Increase the stock
                    variant.stock += item.quantity;
                    await product.save();
                }
            }
        }

        // Update order status
        order.orderStatus = 'Cancelled';
        order.cancelReason = req.body.reason || 'Cancelled by user';
        await order.save();

        res.json({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
};
module.exports={
    placeOrder,
    orderDetails,
    cancelOrder,
    
}