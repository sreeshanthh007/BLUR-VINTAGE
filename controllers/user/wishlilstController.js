const Users = require('../../models/userSchema');
const Product = require("../../models/productSchema");
const Wishlist = require('../../models/wishlistSchema')


const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const { productId, variantColor, variantSize } = req.body;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "Please login first" 
            });
        }
    
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        
        const variant = product.variants.find(v => 
            v.stock>0 && product.variants[0]
        );

        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        
        const existingWishlistItem = await Wishlist.findOne({ 
            userId, 
            product: productId,
           
        });

        if (existingWishlistItem) {
            return res.status(400).json({ success: false, message: "Product already in wishlist" });
        }

       
        const wishlistItem = new Wishlist({
            userId,
            product: productId,
            variant: {
                color: variant.color,
                colorName: variant.colorName,
                size: variant.size,
                stock: variant.stock,
                price: variant.price,
                productImage: variant.productImage,
                status: variant.status
            }
        });

        await wishlistItem.save();

        res.status(200).json({ 
            success: true, 
            message: "Added to wishlist",
            wishlistItem 
        });
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ success: false, message: "Failed to add to wishlist" });
    }
};

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const search = req.query.search

        const wishlistItems = await Wishlist.find({userId})
        .populate({
            path:"product",
            select:"productName productImage"
        })
        res.render('user/wishlist', { 
            search,
            wishlistItems,
            user:userId
        });
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).send("Error fetching wishlist");
    }
};


// const removeProduct = async(req,res)=>{
//     try {
//         const {productId} = req.params;
//         const userId = req.session?.user || req.session?.passport?.user;

//         if(!userId){
//             return res.status(400).json({success:false,message:"user not found"})
//         }

//        await Wishlist.findOneAndDelete(
//         productId
//        )

//       return res.status(200).json({success:true,message:"product removed successfully"})
//     } catch (error) {
//         console.log("error in removing products from wishlist",error.message)
//     }
// }

    const wishlistStatus = async(req,res)=>{
        try {
            const userId = req.session?.user || req.session?.passport?.user

            if(!userId){
                return res.status(400).json({success:false,message:"user not found"})
            }

            const wishlistItems = await Wishlist.find({userId});

            const wishlistProductIds = wishlistItems.map(item => item.product.toString());

            return res.status(200).json({wishlistProductIds})
        } catch (error) {
            console.log("error in wishliststatus ",error.message)
        }
    }


    const wishlistCounter = async(req,res)=>{
        try {
            const userId = req.session?.user || req.session?.passport?.user;

            if(!userId){
                return res.status(400).json({success:false,message:"user not found"})
            }

            const wishlistCount = await Wishlist.countDocuments({userId});
            res.status(200).json({wishlistCount})
        } catch (error) {
            console.log("error in wishlist counter",error.message)
        }
    }

module.exports={
    getWishlist,
    addToWishlist,
    // removeProduct,
    wishlistStatus,
    wishlistCounter
}