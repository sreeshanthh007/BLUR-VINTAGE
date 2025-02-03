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

        const existingCoupon = await Coupon.findOne({code:code});

        if(existingCoupon){
            return res.status(400).json({success:false,message:"this coupon already exist"})
        }

            const parsedStartdate = new Date(startDate);

            parsedStartdate.setUTCHours(0,0,0,0)

            const parsedenddate = new Date(endDate)

            parsedenddate.setUTCHours(23,59,59,999);
            

        const newCoupon = new Coupon({
            code:code,
            usageLimit:limit,
            description:description,
            startDate:parsedStartdate,
            endDate:parsedenddate,
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


    const loadEditCoupon = async(req,res,next)=>{
        try {

            const couponId = req.params.couponId;

            const coupon =  await Coupon.findById(couponId)

            if(!coupon){
                return res.status(400).json({success:false,message:"coupon not found"})
            }

            const formattedStartDate = coupon.startDate.toISOString().split('T')[0];
        const formattedEndDate = coupon.endDate.toISOString().split('T')[0];

            return res.render('admin/editCoupon',{
                coupon:{
                    _id:coupon._id,
                    code:coupon.code,
                    usageLimit:coupon.usageLimit,
                    discountValue:coupon.discountValue,
                    minimumOrderAmount:coupon.minimumOrderAmount,
                    description:coupon.description,
                    startDate:formattedStartDate,
                    endDate:formattedEndDate,
                }
            });
        } catch (error) {
            next(error);
            console.log("error in edit coupon controller",error.message)
        }
    }


    const editCoupon = async(req,res,next)=>{
        try {
            const couponId = req.params.couponId;

            const coupon = await Coupon.findById(couponId);

            if(!coupon){
                return res.status(400).json({success:false,message:"coupon not found"})
            }

            const { usageLimit, discountValue, minOrder, description, startDate, endDate } = req.body;

            const parsedStartDate = new Date(startDate);
            parsedStartDate.setUTCHours(0,0,0,0);
    
            const parsedEndDate = new Date(endDate);
            parsedEndDate.setUTCHours(23,59,59,999);
    
            // Validate dates
            if (parsedStartDate > parsedEndDate) {
                return res.status(400).json({
                    success: false,
                    message: "End date must be after start date"
                });
            }



            const updatedCoupon = await Coupon.findByIdAndUpdate(
                couponId,
                {
                    usageLimit: usageLimit,
                    discountValue: discountValue,
                    minimumOrderAmount: minOrder,
                    description: description,
                    startDate: parsedStartDate,
                    endDate: parsedEndDate
                },
                { new: true }
            );


            if (!updatedCoupon) {
                return res.status(404).json({
                    success: false,
                    message: "Coupon not found"
                });
            }


            return res.status(200).json({
                success: true,
                message: "Coupon updated successfully",
                redirectUrl: '/admin/coupons'
            });


        } catch (error) {
            next(error);
            console.log("edit coupon error",error.message)
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


    const availableCoupons = async(req,res,next)=>{
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
            next(error)
            console.log("availabel coupons error  in cupon controller",error)
        }
    }
    
module.exports={
    couponPage,
    addCoupon,
    deleteCoupon,
    availableCoupons,
    loadEditCoupon,
    editCoupon,

}