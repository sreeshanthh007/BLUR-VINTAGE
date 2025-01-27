const Product=require('../../models/productSchema');
const Category = require("../../models/categorySchema")
const User=require('../../models/userSchema');
const Offer = require('../../models/offerSchema')




const productDetails=async (req,res)=>{
    try{
        const userId=req.session.user || req.session?.passport?.user;
        if(!userId){
            res.redirect("/user/login");
        }  
        const userData=await User.findById(userId);
        const productId=req.query.id;
        
        
        
        const productData = await Product.findById(productId)
        .populate('category')
        .populate('productOffer')
        .populate({
            path: 'category',
            populate: {
                path: 'categoryOffer'
            }
        });
        const now = new Date();
        let bestDiscount =0;
        let offerName="";
        let originalPrice=0;
        let finalPrice=0;

        if(productData.variants && productData.variants.length>0){
            originalPrice = productData.variants[0].price;
            finalPrice = originalPrice;


            // checking product offer
            if (productData.productOffer && 
                now >= new Date(productData.productOffer.startDate) && 
                now <= new Date(productData.productOffer.expiryDate)) {
                const productDiscount = productData.productOffer.discount;
                if (productDiscount > bestDiscount) {
                    bestDiscount = productDiscount;
                    finalPrice = originalPrice - (originalPrice * (productDiscount / 100));
                    offerName = productData.productOffer.offerName;
                }
            }

            // checking category offer
            if(productData.category?.categoryOffer &&
                now >= new Date(productData.category?.categoryOffer.startDate) &&
                now <= new Date(productData.category?.categoryOffer.expiryDate)){
                    const categoryDiscount = productData.category?.categoryOffer.discount;

                    if(categoryDiscount > bestDiscount){
                        bestDiscount = categoryDiscount
                        finalPrice = originalPrice - (originalPrice*(categoryDiscount/100));
                        offerName = productData.category?.categoryOffer?.offerName
                    }
                }
            }

            const productWithOffer = {
                ...productData.toObject(),
                originalPrice,
                finalPrice:Math.round(finalPrice),
                discount:bestDiscount,
                offerName
            };


          const relatedProducts = await Product.find({
            'category': productData.category._id,
            '_id': { $ne: productId },
            'isBlocked': false,
            'variants.stock': { $gt: 0 }
        })
        .populate('productOffer')
        .populate({
            path: 'category',
            populate: {
                path: 'categoryOffer'
            }
        })
        .limit(5)
        .lean();


        const relatedProductsOffer = relatedProducts.map( product =>{
            let bestDiscount=0;
            let originalPrice=0;
            let offerName="";
            let finalPrice=0;

            if(product.variants && product.variants.length>0){
                originalPrice = product.variants[0].price;
                finalPrice = originalPrice


                if(product.productOffer && 
                    now >= new Date(product.productOffer.startDate)&&
                    now <= new Date(product.productOffer.expiryDate)){
                        const productDiscount = product.productOffer.discount;

                        if(productDiscount>bestDiscount){
                            bestDiscount = productDiscount;
                            finalPrice = originalPrice - (originalPrice * (productDiscount/100))
                            offerName = product.productOffer.offerName
                        }
                    }

                if(product.category?.categoryOffer &&
                    now >= new Date(product.category?.categoryOffer.startDate)&&
                    now <= new Date(product.category?.categoryOffer.expiryDate)){
                        const categoryDiscount =  product.category?.categoryOffer.discount;

                        if(categoryDiscount>bestDiscount){
                            bestDiscount = categoryDiscount ;
                            finalPrice = originalPrice - (originalPrice * (categoryDiscount/100))
                            offerName = product.category?.categoryOffer?.offerName
                        }
                    }
               }  

               return {
                ...product,
                originalPrice,
                finalPrice:Math.round(finalPrice),
                discount:bestDiscount,
                offerName
               }
          });

          console.log('Product with offer:', {
            originalPrice: productWithOffer.originalPrice,
            finalPrice: productWithOffer.finalPrice,
            discount: productWithOffer.discount,
            offerName: productWithOffer.offerName
        });

        res.render('user/buyingInterface',{
            user:userData,
            product:productWithOffer,
            images:productData.variants[0].productImage,
            relatedProducts: relatedProductsOffer,
          
        })
    }
    catch(error){
        console.log("product detail page render error",error);
    }
}


module.exports={
    productDetails
}