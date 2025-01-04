const Product=require('../../models/productSchema');
const Category = require("../../models/categorySchema")
const User=require('../../models/userSchema');

const productDetails=async (req,res)=>{
    try{
        const userId=req.session.user || req.session?.passport?.user;
        if(!userId){
            res.redirect("/user/login");
        }  
        const userData=await User.findById(userId);
        const productId=req.query.id;
        
        
        
        const productData=await Product.findById(productId).populate({
            path:"category",
        });
        res.render('user/buyingInterface',{
            user:userData,
            product:productData,
            images:productData.productImage,

        })
    }
    catch(error){
        console.log("product detail page render error",error);
    }
}
module.exports={
    productDetails
}