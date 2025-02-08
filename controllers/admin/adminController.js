
const user = require("../../models/userSchema");
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");
const moment = require('moment');
const pdfDocument = require('pdfkit')
const fs = require('fs');
const path = require('path');


const login = async (req,res)=>{
  try {
    const {email,password} = req.body;

    const admin = await user.findOne({email,isAdmin:true});
    console.log("adminnnnnn",admin)

    if(!admin){
        return res.status(500).json({success:false,message:"admin not found"});
    }
    const isMatch = await bcrypt.compare(password,admin.password);

    if(!isMatch){
        return res.json({success:false,message:"invalid mail or password"});
    }

    req.session.admin = {
        id:admin._id,
        role:"admin"
    }
    console.log("admin session",req.session.admin)

    return res.json({success:true,redirectUrl:"/admin/dashboard"}); 


  } catch (error) {
    console.log('error in admin login',error);
    
  }
}

const logOut = async (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.log("cant destroy session",err);
            res.status(500).json({success:false,message:"failed to log out"});
        }
        res.clearCookie("connect-sid");
        return res.status(200).json({success:true});
       
    })
}

const blockUser = async (req,res)=>{
    try {
        let {userId} = req.body
      await user.updateOne({_id:userId},{$set:{isBlocked:true}});

       res.json({success:true})

    } catch (error) {
        console.log("error in block user",error);
    }
}

const unblockUser = async (req,res)=>{
    try {
        let {userId} = req.body;
        
        await user.updateOne({_id:userId},{$set:{isBlocked:false}});
       
        res.json({success:true})

    } catch (error) {
        console.log("error in unblock user",error)
    }
}

const loadlogin =  (req,res)=>{
    try {
        if(req.session.admin){
            res.redirect("/admin/dashboard");
        }
        res.render('admin/adminlogin',{message:null});
    } catch (error) {
        console.log("error in admin loadlogin",error)
    }
}


const dashboard = (req,res)=>{
    try {
        if(req.session.admin){
            res.render("admin/adminDashboard");
        }
    } catch (error) {
        console.log("canoot go to dashboard")
    }
    
}
const userManage = (req,res)=>{
    res.render("admin/userManage");

}

const orderList = async(req,res)=>{

    try {
        const pages = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (pages-1)*limit;

        const totalOrders = await Order.countDocuments();   
        const totalPages = Math.ceil(totalOrders/limit);

        const orders = await Order.find()
        .populate("orderItems.product","name")
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit);

       
        
        const formattedOrders = orders.map(order => {
           
            const itemsDisplay = order.orderItems.map(item => {
                return `${item.variant.colorName} (${item.quantity})`;
            }).join(', ');

            // Calculate total quantity
            const totalQuantity = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);

            const finalAmount = order.pricing.finalAmount

            console.log("final amt",finalAmount)
            
            return {
                id: order.orderNumber,
                name: order.shippingAddress?.name || 'No name provided',
                address: order.shippingAddress ? 
                    `${order.shippingAddress.landMark}, ${order.shippingAddress.city}` : 
                    'No address provided',
                date: order.createdAt.toLocaleDateString('en-US', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                }),
                // Show all items with their quantities
                item: `${itemsDisplay} (Total: ${totalQuantity} items)`,
                status: order.orderStatus,

                amount:finalAmount
            };
        });


        const pagination = {
            currentPage: pages,
            totalPages: totalPages,
            hasNextPage: pages < totalPages,
            hasPrevPage: pages > 1,
            nextPage: pages + 1,
            prevPage: pages - 1,
            lastPage: totalPages
        };

        return res.render("admin/orderList",{
            orders:formattedOrders,
            pagination:pagination
        });

    } catch (error) {
        console.log("error in order list ",error.message);
    }


  
}


const orderDetails = async(req,res)=>{
    try {
        console.log("all",req.query);
        
        const orderNumber = req.query.id;
        console.log("number",orderNumber);
        
        if (!orderNumber) {
            return res.status(400).json({ message: "Order ID is required" });
        }

        const order = await Order.findOne({orderNumber:orderNumber})
            .populate({
                path: "orderItems.product",
                model: "Product"
            });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        console.log("product order",order)
        
        return res.render("admin/orderDetails",{order})
    } catch (error) {
        console.log("error in order details",error.message);
        
  } 
}

// for changing the order status of the item
const updateOrderStatus = async(req,res)=>{
    try {
        console.log("req.query",req.query);
        
        const {id,status}  = req.query;

        if (!id || !status) {
            return res.status(400).json({ message: "Order ID and status are required" });
        }
        const order = await Order.findOne({orderNumber:id})

        if(!order){
            return res.status(400).json({success:false,message:"order not found"})
        }

        if (status === 'Cancelled') {
            for (const orderItem of order.orderItems) {
                await Product.findOneAndUpdate(
                    { 
                        _id: orderItem.product,
                        'variants.color': orderItem.variant.color,
                        'variants.size': orderItem.variant.size
                    },
                    {
                        $inc: {
                            'variants.$.stock': orderItem.quantity
                        },
                        $set: {
                            'variants.$.status': 'Available'
                        }
                    }
                );
            }
        }

        order.orderStatus = status;

        if(status==="Delivered" && order.payment.method==="COD"){
            order.payment.status = "Completed"
            order.deliveryDate = new Date();
        }else if(status==="Delivered" && order.payment.method==="Razorpay"){
            order.deliveryDate = new Date();
        }


        
        await order.save()

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        return res.status(200).json({message:"updated successfully"})
       
    } catch (error) {
        console.log("error in update backend",error.message);
        
    }
}






const getSalesReport = async (req, res) => {
    try {
        const { dateRange, startDate, endDate } = req.query;
        
        // Calculate date range based on selection
        let startDateTime, endDateTime;
        
        switch(dateRange) {
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
                startDateTime = startDate ? moment(startDate).startOf('day') : moment().subtract(30, 'days').startOf('day');
                endDateTime = endDate ? moment(endDate).endOf('day') : moment().endOf('day');
                break;
            default:
                startDateTime = moment().subtract(30, 'days').startOf('day');
                endDateTime = moment().endOf('day');
        }

        
        const matchStage = {
            deliveryDate: {
                $gte: startDateTime.toDate(),
                $lte: endDateTime.toDate()
            },
            orderStatus: 'Delivered' 
        };

        const salesReport = await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    ordersCount: { $sum: 1 },
                    grossSales: { $sum: '$pricing.subtotal' },
                    couponDiscount: { $sum: '$pricing.coupon.discount' },
                    productOffers: { $sum: '$pricing.productOffersTotal' },
                    finalRevenue: { $sum: '$pricing.finalAmount' },
                    orders: {
                        $push: {
                            orderNumber: '$orderNumber',
                            orderDate: '$createdAt',
                            subtotal: '$pricing.subtotal',
                            couponDiscount: '$pricing.coupon.discount',
                            productOffers: '$pricing.productOffersTotal',
                            finalAmount: '$pricing.finalAmount',
                            paymentMethod: '$payment.method',
                            status: '$orderStatus'
                        }
                    }
                }
            },
            {
                $sort: { "_id.date": 1 }
            },
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
                    totalDiscount: {
                        $add: ['$totalCouponDiscount', '$totalProductOffers']
                    },
                    averageOrderValue: {
                        $divide: ['$totalFinalRevenue', '$totalOrders']
                    }
                }
            }
        ]);

        // Calculate additional metrics
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

        // Calculate percentages
        report.discountPercentage = (report.totalDiscount / report.totalGrossSales * 100) || 0;
        report.couponDiscountPercentage = (report.totalCouponDiscount / report.totalGrossSales * 100) || 0;
        report.productOffersPercentage = (report.totalProductOffers / report.totalGrossSales * 100) || 0;

        // Get payment method distribution - updated to only include delivered orders
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

        // Render the sales report page with all metrics
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
        res.status(500).render('error', {
            message: 'Error generating sales report',
            error
        });
    }
};




const getAnalyticsDashboard = async (req, res) => {
    try {
        const timeframe = req.query.timeframe || 'monthly';
        let startDate, endDate;
        switch (timeframe) {
            case 'weekly':
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0); // Start of day
                startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week (Sunday)
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6); // End of week (Saturday)
                endDate.setHours(23, 59, 59, 999); // End of day
                break;
                
            case 'monthly':
                startDate = new Date();
                startDate.setDate(1); // Start of current month
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0); 
                endDate.setHours(23, 59, 59, 999);
                break;
                
            case 'yearly':
                startDate = new Date();
                startDate.setMonth(0, 1); // January 1st of current year
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(startDate.getFullYear(), 11, 31); // December 31st
                endDate.setHours(23, 59, 59, 999);
                break;
                
            default:
                startDate = new Date();
                startDate.setMonth(startDate.getMonth() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date();
                endDate.setHours(23, 59, 59, 999);
        }

      
        const topProducts = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    orderStatus: { $nin: ['Cancelled', 'Failed'] }
                }
            },
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
                    totalRevenue: {
                        $sum: {
                            $multiply: ['$orderItems.quantity', '$orderItems.price.discountedPrice']
                        }
                    }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 }
        ]);

        
        const topCategories = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    orderStatus: { $nin: ['Cancelled', 'Failed'] }
                }
            },
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
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: '$categoryInfo._id',
                    categoryName: { $first: '$categoryInfo.name' },
                    totalQuantity: { $sum: '$orderItems.quantity' },
                    totalRevenue: {
                        $sum: {
                            $multiply: ['$orderItems.quantity', '$orderItems.price.discountedPrice']
                        }
                    }
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

module.exports = { getAnalyticsDashboard };






module.exports ={
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
}