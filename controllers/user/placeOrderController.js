    const Product = require("../../models/productSchema");
    const Order = require("../../models/orderSchema");
    const Cart = require("../../models/cartSchema");
    const Coupon = require('../../models/couponSchema');
    const Wallet = require('../../models/walletSchema')
    const { razorpayInstance } = require("../../config/razorPay");


    const placeOrder = async (req, res) => {
        try {
            const userId = req.session.user || req.session?.passport?.user;
            const { cart, address, paymentMethod, coupon } = req.body;
            const orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);
            const orderItems = [];
            let subtotal = 0;
            let finalDiscount = 0;
            let totalProductOffersDiscount = 0;
    
            // First verify all products and calculate product-level discounts
            for (const item of cart.items) {
                const product = await Product.findById(item.product._id)
                    .populate('productOffer')
                    .populate({
                        path: 'category',
                        populate: { path: 'categoryOffer' }
                    });
    
                if (!product) {
                    throw new Error(`Product not found: ${item.product._id}`);
                }
    
                const variant = product.variants.find(v =>
                    v.color === item.color && v.size === item.size
                );
    
                if (!variant || variant.stock < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.productName}`);
                }
    
                // Calculate product discounts
                const now = new Date();
                let bestDiscount = 0;
                let originalPrice = variant.price;
                let discountedPrice = originalPrice;
                let offerType = 'No Offer';
    
                // Check product offer
                if (product.productOffer &&
                    now >= product.productOffer.startDate &&
                    now <= product.productOffer.expiryDate) {
                    bestDiscount = product.productOffer.discount;
                    discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
                    offerType = 'Product Offer';
                }
    
                // Check category offer
                if (product.category?.categoryOffer &&
                    now >= product.category.categoryOffer.startDate &&
                    now <= product.category.categoryOffer.expiryDate) {
                    const categoryDiscount = product.category.categoryOffer.discount;
                    if (categoryDiscount > bestDiscount) {
                        bestDiscount = categoryDiscount;
                        discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
                        offerType = 'Category Offer';
                    }
                }
    
                discountedPrice = Math.round(discountedPrice);
                const itemTotal = discountedPrice * item.quantity;
                subtotal += itemTotal;
    
                if (bestDiscount > 0) {
                    totalProductOffersDiscount += (originalPrice - discountedPrice) * item.quantity;
                }
    
                // Update stock
                variant.stock -= item.quantity;
                await product.save();
    
                // Create order item
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
                        originalPrice: originalPrice,
                        discountedPrice: discountedPrice,
                        productOffer: bestDiscount,
                        offerType: offerType
                    },
                    status:{
                        itemStatus:"Processing"
                    }
                });
            }
    
            // Calculate coupon discount after product discounts
            if (coupon && coupon.code) {
                const validCoupon = await Coupon.findOne({
                    code: coupon.code.toUpperCase(),
                    isActive: true
                });
    
                if (!validCoupon) {
                    throw new Error("Invalid coupon");
                }
    
                if (subtotal < validCoupon.minimumOrderAmount) {
                    throw new Error(`Minimum order amount of Rs. ${validCoupon.minimumOrderAmount} not met`);
                }
    
                if (validCoupon.currentUsageCount >= validCoupon.usageLimit) {
                    throw new Error("Coupon usage limit exceeded!");
                }
    
                finalDiscount = validCoupon.discountType === "Percentage"
                    ? subtotal * (validCoupon.discountValue / 100)
                    : validCoupon.discountValue;
    
                finalDiscount = Math.min(finalDiscount, subtotal);
    
                
                validCoupon.currentUsageCount += 1;
                await validCoupon.save();
            }
    
           
            const finalAmount = subtotal - finalDiscount;
    
            
            if (paymentMethod === "RAZORPAY") {
                const options = {
                    amount: Math.round(finalAmount * 100), // Razorpay expects amount in paise
                    currency: "INR",
                    receipt: orderNumber
                };
    
                const razorPayOrder = await razorpayInstance.orders.create(options);
                return res.status(200).json({
                    success: true,
                    razorpayOrderId: razorPayOrder.id,
                    amount: razorPayOrder.amount,
                    razorpayKeyId: process.env.RAZORPAY_KEY_ID
                });
            }
    
            const order = new Order({
                userId,
                orderItems,
                shippingAddress: address,
                payment: {
                    method: paymentMethod,
                    status: paymentMethod === "COD" ? 'Pending' : "Completed"
                },
                pricing: {
                    subtotal,                
                    coupon: coupon ? {
                        code: coupon.code,
                        discount: finalDiscount
                    } : undefined,
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
                {
                    $set: {
                        items: [],
                        totalAmount: 0
                    }
                }
            );
    
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

    const applyCoupon = async(req,res)=>{
        try {
            const {couponCode} = req.body;
            const userId = req.session?.user || req.session?.passport?.user;

            const coupon = await Coupon.findOne({
                code:couponCode.toUpperCase(),
                isActive:true,
            }); 



        if (!coupon) {
            return res.json({ 
                success: false, 
                message: "Invalid or expired coupon" 
            });
        }

        const cart = await Cart.findOne({user:userId});

        if(cart.totalAmount < coupon.minimumOrderAmount){
            return res.json({ 
                success: false, 
                message: `Minimum order amount of Rs. ${coupon.minimumOrderAmount} not met` 
            });
        }

        if(coupon.currentUsageCount>=coupon.usageLimit){
            return res.json({success:false,message:"coupon limit exceeds !"})
        }
        

        let discountAmount = coupon.discountType === "Percentage"
        ? cart.totalAmount * (coupon.discountValue / 100)
        : coupon.discountValue;

        
        discountAmount = Math.min(discountAmount,cart.totalAmount);


        res.json({
            success: true,
            discountAmount,
            couponCode:coupon.code,
            message: "Coupon applied successfully"
        });
        } catch (error) {
            console.log("error in apply coupon controller",error.message)
        }
    }

    const verifyPayment = async (req, res) => {
        try {
            const { razorpay_order_id, razorpay_payment_id, razorpay_signature, cart, address, coupon } = req.body;
    
            console.log("Received payment verification request with coupon:", coupon);
            console.log("Cart details:", JSON.stringify(cart, null, 2));
    
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const crypto = require("crypto");
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest("hex");
    
            if (expectedSignature === razorpay_signature) {
                const userId = req.session?.user || req.session?.passport?.user;
                const orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);
                const orderItems = [];
                let subtotalAfterOffers = 0;
                let totalProductOffersDiscount = 0;
                let finalDiscount = 0;
    
                // Process cart items and calculate subtotal after offers
                for (const item of cart.items) {
                    const product = await Product.findById(item.product._id)
                        .populate('productOffer')
                        .populate({
                            path: 'category',
                            populate: { path: 'categoryOffer' }
                        });
    
                    const variant = product.variants.find(v =>
                        v.color === item.color && v.size === item.size
                    );
    
                    if (!variant) {
                        return res.status(400).json({ success: false, message: `Variant not found for product ${item.product._id}` });
                    }
                    if (variant.stock < item.quantity) {
                        return res.status(400).json({ success: false, message: `Insufficient stock for product ${item.product._id}` });
                    }
    
                    // Calculate product discounts
                    const now = new Date();
                    let bestDiscount = 0;
                    let originalPrice = variant.price;
                    let discountedPrice = originalPrice;
                    let offerType = 'No Offer';
    
                    // Check product offer
                    if (product.productOffer &&
                        now >= product.productOffer.startDate &&
                        now <= product.productOffer.expiryDate) {
                        bestDiscount = product.productOffer.discount;
                        discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
                        offerType = 'Product Offer';
                    }
    
                    // Check category offer
                    if (product.category?.categoryOffer &&
                        now >= product.category.categoryOffer.startDate &&
                        now <= product.category.categoryOffer.expiryDate) {
                        const categoryDiscount = product.category.categoryOffer.discount;
                        if (categoryDiscount > bestDiscount) {
                            bestDiscount = categoryDiscount;
                            discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
                            offerType = 'Category Offer';
                        }
                    }
    
                    discountedPrice = Math.round(discountedPrice);
                    const itemTotal = discountedPrice * item.quantity;
                    subtotalAfterOffers += itemTotal;
    
                    if (bestDiscount > 0) {
                        totalProductOffersDiscount += (originalPrice - discountedPrice) * item.quantity;
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
                            originalPrice: originalPrice,
                            discountedPrice: discountedPrice,
                            productOffer: bestDiscount,
                            offerType: offerType
                        },
                        status: {
                            itemStatus: "Processing"
                        }
                    });
                }
    
                // Calculate coupon discount
                if (coupon && coupon.code) {
                    console.log("Coupon details:", coupon);
                    const validCoupon = await Coupon.findOne({
                        code: coupon.code.toUpperCase(),
                        isActive: true
                    });
    
                    console.log("Valid Coupon:", validCoupon);
    
                    if (validCoupon) {
                        console.log("Subtotal after offers:", subtotalAfterOffers);
                        console.log("Minimum order amount:", validCoupon.minimumOrderAmount);
    
                        if (subtotalAfterOffers < validCoupon.minimumOrderAmount) {
                            console.log(`Minimum order amount of Rs. ${validCoupon.minimumOrderAmount} not met`);
                            throw new Error(`Minimum order amount of Rs. ${validCoupon.minimumOrderAmount} not met`);
                        }
    
                        if (validCoupon.currentUsageCount >= validCoupon.usageLimit) {
                            console.log("Coupon usage limit exceeded");
                            throw new Error("Coupon usage limit exceeded!");
                        }
    
                        // Calculate discount based on coupon type
                        finalDiscount = validCoupon.discountType === "Percentage"
                            ? Math.round(subtotalAfterOffers * (validCoupon.discountValue / 100))
                            : validCoupon.discountValue;
    
                        finalDiscount = Math.min(finalDiscount, subtotalAfterOffers);
    
                        console.log("Final Discount:", finalDiscount);
    
                        validCoupon.currentUsageCount += 1;
                        await validCoupon.save();
                    } else {
                        console.log("No valid coupon found");
                    }
                }
    
                // Calculate final amount
                const finalAmount = subtotalAfterOffers - finalDiscount;
    
                console.log("Final Amount Calculation:", {
                    subtotalAfterOffers,
                    finalDiscount,
                    finalAmount
                });
    
                const order = new Order({
                    userId,
                    orderItems,
                    shippingAddress: address,
                    payment: {
                        method: "Razorpay",
                        status: "Completed",
                        razorpay: {
                            orderId: razorpay_order_id,
                            paymentId: razorpay_payment_id,
                            signature: razorpay_signature
                        },
                        paidAt: Date.now()
                    },
                    pricing: {
                        subtotal: subtotalAfterOffers,
                        productOffersTotal: Math.round(totalProductOffersDiscount),
                        coupon: coupon ? {
                            code: coupon.code,
                            discount: finalDiscount
                        } : undefined,
                        finalAmount: finalAmount
                    },
                    orderStatus: "Processing",
                    orderNumber
                });
    
                await order.save();
    
                await Cart.findOneAndUpdate(
                    { user: userId },
                    {
                        $set: {
                            items: [],
                            totalAmount: 0
                        }
                    }
                );
    
                res.status(200).json({ success: true, message: "payment verified and order placed successfully", orderNumber });
            } else {
                res.status(400).json({ success: false, message: "payment verification failed" });
            }
    
        } catch (error) {
            console.error('Order placement error:', error);
            res.status(400).json({
                success: false,
                message: error.message || 'Failed to place order'
            });
        }
    };



    const verifyPaymentFailure = async (req, res) => {
        try {
            const { razorpayOrderId, failureDetails, cart, address, coupon } = req.body;
            const userId = req.session?.user || req.session?.passport?.user;
            const orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);
    
            const orderItems = [];
            let subtotalAfterOffers = 0;
            let totalProductOffersDiscount = 0;
    
            // Process each item in the cart
            for (const item of cart.items) {
                const product = await Product.findById(item.product._id)
                    .populate('productOffer')
                    .populate({
                        path: 'category',
                        populate: { path: 'categoryOffer' }
                    });
    
                if (!product) {
                    throw new Error(`Product not found: ${item.product._id}`);
                }
    
                const variant = product.variants.find(v =>
                    v.color === item.color && v.size === item.size
                );
    
                if (!variant) {
                    throw new Error(`Variant not found for product ${item.product._id}`);
                }
    
                // Calculate product discounts
                const now = new Date();
                let bestDiscount = 0;
                let originalPrice = variant.price;
                let discountedPrice = originalPrice;
                let offerType = 'No Offer';
    
                // Check product offer
                if (product.productOffer &&
                    now >= product.productOffer.startDate &&
                    now <= product.productOffer.expiryDate) {
                    bestDiscount = product.productOffer.discount;
                    discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
                    offerType = 'Product Offer';
                }
    
                // Check category offer
                if (product.category?.categoryOffer &&
                    now >= product.category.categoryOffer.startDate &&
                    now <= product.category.categoryOffer.expiryDate) {
                    const categoryDiscount = product.category.categoryOffer.discount;
                    if (categoryDiscount > bestDiscount) {
                        bestDiscount = categoryDiscount;
                        discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
                        offerType = 'Category Offer';
                    }
                }
    
                discountedPrice = Math.round(discountedPrice);
                const itemTotal = discountedPrice * item.quantity;
                subtotalAfterOffers += itemTotal;
    
                if (bestDiscount > 0) {
                    totalProductOffersDiscount += (originalPrice - discountedPrice) * item.quantity;
                }
    
                orderItems.push({
                    product: product._id,
                    quantity: item.quantity,
                    variant: {
                        color: item.color,
                        colorName: item.colorName,
                        size: item.size,
                        productImage: item.productImage
                    },
                    price: {
                        originalPrice: originalPrice,
                        discountedPrice: discountedPrice,
                        productOffer: bestDiscount,
                        offerType: offerType
                    },
                    status: {
                        itemStatus:"Cancelled",
                        return: {
                            requested: false,
                            status: 'Pending'
                        }
                    }
                });
            }
    
            // Calculate coupon discount
            let couponDiscount = 0;
            if (coupon?.code) {
                const validCoupon = await Coupon.findOne({
                    code: coupon.code.toUpperCase(),
                    isActive: true
                });
    
                if (validCoupon) {
                    if (subtotalAfterOffers >= validCoupon.minimumOrderAmount) {
                        couponDiscount = validCoupon.discountType === "Percentage"
                            ? Math.round(subtotalAfterOffers * (validCoupon.discountValue / 100))
                            : validCoupon.discountValue;
    
                        couponDiscount = Math.min(couponDiscount, subtotalAfterOffers);
                    }
                }
            }
    
            // Create the order
            const order = await Order.create({
                userId,
                orderItems,
                shippingAddress: address,
                payment: {
                    method: 'Razorpay',
                    status: 'Failed',
                    razorpay: {
                        orderId: razorpayOrderId
                    }
                },
                pricing: {
                    subtotal: subtotalAfterOffers,
                    productOffersTotal: Math.round(totalProductOffersDiscount),
                    coupon: coupon ? {
                        code: coupon.code,
                        discount: couponDiscount
                    } : undefined,
                    finalAmount: subtotalAfterOffers - couponDiscount
                },
                orderStatus: 'Failed',
                orderNumber
            });
    
            await Cart.findOneAndUpdate(
                { user: userId },
                { $set: { items: [], totalAmount: 0 } }
            );
    
            return res.status(200).json({
                success: true,
                message: 'Order created with payment failed status',
                orderNumber: order.orderNumber
            });
    
        } catch (error) {
            console.error('Payment failure processing error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to process payment failure',
                error: error.message
            });
        }
    };



    const retryPayment = async(req,res)=>{
        try {
            const {orderId} = req.params;

            const order = await Order.findById(orderId);

            if(!order){
                return res.status(400).json({success:false,message:"order not found"})
            };

            if(order.payment.status!=="Failed"){
                return res.status(400).json({success:false,message:"this order is not eligible for retry payment"})
            }

            const options = {
                amount: Math.round(order.pricing.finalAmount * 100),
                currency: "INR",
                receipt: order.orderNumber,
                payment_capture: 1
            };

            const razorPayOrder = await razorpayInstance.orders.create(options);

            order.payment.razorpay.orderId = razorPayOrder.id;

            await order.save();

            return res.status(200).json({
                success:true,
                razorpayOrderId:razorPayOrder.id,
                amount:razorPayOrder.amount,
                razorpayKeyId:process.env.RAZORPAY_KEY_ID,
                orderNumber:order.orderNumber,
                customerName:order.shippingAddress.name,
                customerPhone:order.shippingAddress.phone
            });





        } catch (error) {
            console.error('Retry payment error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to initiate payment retry'
        });
            
        }
    }


    const retryPaymentVerification = async (req, res) => {
        try {
            const { 
                razorpay_order_id, 
                razorpay_payment_id, 
                razorpay_signature 
            } = req.body;
    
            // Verify signature
            const body = razorpay_order_id + "|" + razorpay_payment_id;
            const crypto = require('crypto')
            const expectedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(body.toString())
                .digest('hex');
    
            if (expectedSignature !== razorpay_signature) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Payment verification failed" 
                });
            }
    
            // Find and update order
            const order = await Order.findOne({
                'payment.razorpay.orderId': razorpay_order_id
            });
    
            if (!order) {
                return res.status(404).json({ 
                    success: false, 
                    message: "Order not found" 
                });
            }
    
            // Update payment details
            order.payment.status = 'Completed';
            order.payment.razorpay.paymentId = razorpay_payment_id;
            order.payment.razorpay.signature = razorpay_signature;
            order.payment.paidAt = new Date();
            order.orderStatus = 'Processing';

            for(let item of order.orderItems){
                item.status.itemStatus="Processing"
            }
    
            await order.save();
    
            res.status(200).json({
                success: true,
                message: "Payment verified successfully"
            });
    
        } catch (error) {
            console.error('Payment verification error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Payment verification failed'
            });
        }
    };



    const orderDetails = async(req,res)=>{
        try {
            const userId = req.session.user || req.session?.passport?.user;
        
            const page = parseInt(req.query.page )|| 1;

            const limit = 4;

            const skip =  (page-1)*limit;


            const totalOrders = await Order.countDocuments({userId:userId});

            const totalPages = Math.ceil(totalOrders/limit);

            

            const orders = await Order.find({userId:userId})
            .sort({createdAt:-1})
            .skip(skip)
            .limit(limit)
            .populate({
                path:"orderItems.product",
                select:"productName description category"
            });


            
            if(!orders){
                return res.send("order not found")
            }
            res.render('user/orderDetails',{
                orders,
                currentPage:page,
                totalPages,
                hasNextPage:page<totalPages,
                hasPrevPage: page>1
            })
        } catch (error) {
            console.log("error in order details",error.message);
        }
    }

       const cancelOrder = async(req,res)=>{
            try {
                const {orderId,itemId} = req.params
                console.log("checking",orderId,itemId)
                const {reason,message} = req.body
                const order = await Order.findById(orderId)
                .populate({
                    path:"orderItems.product",
                    select:"productName variants"
                })

                if (!order) {
                    return res.status(404).json({ success: false, message: 'Order not found' });
                }

                const orderItem =  order.orderItems.id(itemId)
                if(!orderItem){
                    return res.status(404).json({success:false, message:"orde item not found"})
                }

                
               
                if (orderItem.status.itemStatus === 'Cancelled' || orderItem.status.itemStatus === 'Delivered') {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Order cannot be cancelled as it is ${orderItem.status.itemStatus.toLowerCase()}` 
                    });
                } 
                
              

                const refundAmount = orderItem.price.discountedPrice * orderItem.quantity;

      
                if(order.payment.method==="Razorpay" && order.payment.status=="Completed"){

                    const wallet = await Wallet.findOne({userId:order.userId});

                    if(!wallet){
                        return res.status(400).json({success:false,message:"wallet not found"})
                    }

                    wallet.balance+=refundAmount
                    wallet.transactions.push({
                        type:"Refund",
                        amount:refundAmount,
                        orderId:order.orderNumber,
                        description: `Refund for cancelled order item ${order.orderNumber}`,
                        status:"Completed"
                    });
                    await wallet.save()
                }

                // Reverse the quantity for each product
                const product = await Product.findById(orderItem.product._id);
                if (product) {
                    const variant = product.variants.find(v => 
                        v.color === orderItem.variant.color && 
                        v.size === orderItem.variant.size
                    );
                    
                    if (variant) {
                        variant.stock += orderItem.quantity;
                        await product.save();
                    }
                }

            
                orderItem.status.itemStatus = 'Cancelled';
                order.cancelReason = reason || message
                orderItem.status.return.reason = reason|| message;
                

                const allItemsCancelled = order.orderItems.every(item => item.status.itemStatus === 'Cancelled');

                if (allItemsCancelled) {
                    order.orderStatus = 'Cancelled';
                }
                await order.save()  

                res.json({ success: true, message: 'Order cancelled successfully' });
            } catch (error) {
                console.error('Error cancelling order:', error);
                res.status(500).json({ success: false, message: 'Failed to cancel order' });
            }
        };

        const cancelAllOrder = async(req,res)=>{
            try {
                const {orderId} = req.params;

                const ordered = await Order.findById(orderId).populate({
                    path:"orderItems.product",
                    select:"productName variants"
                })

                if(!ordered){
                    return res.status(400).json({success:false,message:"order not found"})
                }   

                if(ordered.orderStatus==="Cancelled" || ordered.orderStatus==="Delivered"){

                    return res.status(404).json({success:false,message:`Order cannot be cancelled as it is ${ordered.orderStatus.toLowerCase()}`})
                }

                let totalRefundAmount=0

                for(const orderitems of ordered.orderItems){
                    if(orderitems.status.itemStatus==="Cancelled"){
                        continue;
                    }   

                    totalRefundAmount += orderitems.price.discountedPrice * orderitems.quantity

                    const product = await Product.findById(orderitems.product._id);

                    if(!product){
                        return res.status(400).json({success:false,message:`Product not found: ${items.product._id}`})
                    }

                    const variant = product.variants.find(v=>
                        v.color === orderitems.variant.color &&
                        v.size === orderitems.variant.size
                    )

                    if(variant){
                        variant.stock += orderitems.quantity;
                        await product.save();
                    }

                    orderitems.status.itemStatus="Cancelled"
                }


                if(ordered.payment.method==="Razorpay" && ordered.payment.status==="Completed"){
                    const wallet = await Wallet.findOne({userId:ordered.userId});

                    
                  if(!wallet){
                  return res.status(400).json({success:false,message:"wallet not found"})
                  }

                  wallet.balance += totalRefundAmount

                  wallet.transactions.push({
                    type:"Refund",
                    amount:totalRefundAmount,
                    orderId:orderId,
                    description:`Refund for cancelled order ${ordered.orderNumber}`,
                    status:"Completed"
                  });

                  await wallet.save();

                }

                ordered.orderStatus="Cancelled"
                ordered.cancelReason = req.body.reason || "cancelled by user";
                await ordered.save();

                res.status(200).json({success:true,message:"order cancelled successfully"})


            } catch (error) {
                console.log("error in cancel all products ",error.message);
            }
        }



    module.exports={
        placeOrder,
        orderDetails,
        cancelOrder,
        cancelAllOrder,
        verifyPayment,
        applyCoupon,
        verifyPaymentFailure,
        retryPayment,
        retryPaymentVerification


        
    }