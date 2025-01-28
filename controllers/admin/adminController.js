
const user = require("../../models/userSchema");
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const Coupon = require("../../models/couponSchema");
const moment = require('moment')


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
        let id = req.query.id;
      await user.updateOne({_id:id},{$set:{isBlocked:true}});

        res.redirect("/admin/userManage");
    } catch (error) {
        console.log("error in block user",error);
    }
}

const unblockUser = async (req,res)=>{
    try {
        let id = req.query.id;
        await user.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect('/admin/userManage');

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
            // Format multiple items
            const itemsDisplay = order.orderItems.map(item => {
                return `${item.variant.colorName} (${item.quantity})`;
            }).join(', ');

            // Calculate total quantity
            const totalQuantity = order.orderItems.reduce((sum, item) => sum + item.quantity, 0);
            
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
                // Include total amount for reference
                amount: order.pricing.finalAmount
            };
        });

        console.log("formatted",formattedOrders)

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

// controllers/adminController.js




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

        // Updated match stage to only include delivered orders
        const matchStage = {
            createdAt: {
                $gte: startDateTime.toDate(),
                $lte: endDateTime.toDate()
            },
            orderStatus: 'Delivered' // Only count delivered orders
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
    getSalesReport
}