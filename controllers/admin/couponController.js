const Coupon = require("../../models/couponSchema");
const Cart = require("../../models/cartSchema")

const couponPage = async(req,res)=>{
    try {
        
        const coupons = await Coupon.find({});
        
        return res.render('admin/couponAddPage',{
            coupons,
        })
    } catch (error) {
        
    }
}

    const addCoupon = async(req,res)=>{
        try {

        const { code, limit, amount, description, startDate, endDate, minOrder} = req.body;

        if(code=="" || limit=="" || amount=="" || description=="" || startDate=="" || endDate=="" || minOrder==""){
            return res.status(400).json({success:false,message:"all fields are required"})
        }

        const existingCoupon = await Coupon.findOne({code:code});

        if(existingCoupon){
            return res.status(400).json({success:false,message:"this coupon already exist"})
        }

        const newCoupon = new Coupon({
            code:code,
            usageLimit:limit,
            description:description,
            startDate:new Date(startDate),
            endDate:new Date(endDate),
            discountType:"Flat",
            minimumOrderAmount:minOrder,
            discountValue:amount,
            isActive:true
        });
        await newCoupon.save();

        return res.status(200).json({success:true,message:"coupon added successfully"})

        } catch (error) {
            console.log("error ion adding coupon controller",error.message)
        }
    }


    const deleteCoupon = async(req,res)=>{
        try {
            const {couponId} = req.query;

          const coupon = await Coupon.findByIdAndDelete(couponId)

           if(!coupon){
            return res.status(400).json({success:false,message:"coupon not found"})
           }
           
           return res.status(200).json({success:true,message:"coupon deleted successfully"});

        } catch (error) {
            console.log("error in coupon deletion",error.message)
        }
    }


    const availableCoupons = async(req,res)=>{
        try {
            const now = new Date();

            const availableCoupons = await Coupon.find({
                isActive: true,
                startDate: { $lte: now },
                endDate: { $gte: now },
                currentUsageCount: { $lt: '$usageLimit' }
            });

            res.json(availableCoupons)
        } catch (error) {
            console.log("availabel coupons error  in cupon controller",error)
        }
    }
    
module.exports={
    couponPage,
    addCoupon,
    deleteCoupon,
    availableCoupons,
}