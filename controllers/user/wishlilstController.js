const Users = require('../../models/userSchema');
const Product = require("../../models/productSchema");
const Wishlist = require('../../models/wishlistSchema')
const Cart = require('../../models/cartSchema')


const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const { productId} = req.body;

        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "Please login first" 
            });
        }
    
        const product = await Product.findById(productId)
        .populate('productOffer')
        .populate({
            path: 'category',
            populate: {
                path: 'categoryOffer'
            }
        });
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        
        const variant = product.variants.find(v => 
            v.stock>0 && product.variants[0]
        );

        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        const now = new Date();
        let bestDiscount = 0;
        let finalPrice = variant.price;
        let offerName = "";

        // Check product offer
        if (product.productOffer && 
            now >= new Date(product.productOffer.startDate) && 
            now <= new Date(product.productOffer.expiryDate)) {
            const productDiscount = product.productOffer.discount;
            if (productDiscount > bestDiscount) {
                bestDiscount = productDiscount;
                finalPrice = variant.price - (variant.price * (productDiscount / 100));
                offerName = product.productOffer.offerName;
            }
        }

        // Check category offer
        if (product.category?.categoryOffer &&
            now >= new Date(product.category.categoryOffer.startDate) &&
            now <= new Date(product.category.categoryOffer.expiryDate)) {
            const categoryDiscount = product.category.categoryOffer.discount;
            if (categoryDiscount > bestDiscount) {
                bestDiscount = categoryDiscount;
                finalPrice = variant.price - (variant.price * (categoryDiscount / 100));
                offerName = product.category.categoryOffer.offerName;
            }
        }
        
        const existingWishlistItem = await Wishlist.findOne({ 
            userId, 
            product: productId,
        });

        if (existingWishlistItem) {
            return res.status(400).json({ success: false, message: "Product already in wishlist" });
        }

        // Create wishlist item with offer details
        const wishlistItem = new Wishlist({
            userId,
            product: productId,
            variant: {
                color: variant.color,
                colorName: variant.colorName,
                size: variant.size,
                stock: variant.stock,
                price: Math.round(finalPrice), 
                originalPrice: variant.price,  
                discount: bestDiscount,        // Save the applied discount
                offerName: offerName,         // Save the offer name
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


const getProductDetails = async(req,res,next)=>{
    try {
        const {productId} = req.params;

        const product = await Product.findById(productId)
        .populate("productOffer")
        .populate({
            path:"category",
            populate:{
                path:"categoryOffer"
            }
        });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        const availableVariants = product.variants.filter(v=>v.stock>0);

        res.status(200).json({
            success: true,
            data: {
                _id: product._id,
                productName: product.productName,
                variants: availableVariants,
                productOffer: product.productOffer,
                category: product.category
            }
        });

    } catch (error) {

        console.error('Error fetching product details:', error);
        next(error)
    }
}


const wishlistToCart = async(req,res,next)=>{
    try {

        const userId = req.session.user || req.session?.passport?.user;
        const { productId, color, colorName, size, quantity } = req.body;

        const product = await Product.findById(productId)
        .populate("productOffer")
        .populate({
            path:"category",
            populate:{
                path:"categoryOffer"
            }
        });

        if(!product){
            return res.status(400).json({success:false,message:"product not found"})
        }

        const variant = product.variants.find(v => 
            v.color === color && v.size === size
        );

        if (!variant || variant.stock < quantity) {
            return res.status(400).json({ 
                success: false, 
                message: "Selected variant unavailable or insufficient stock" 
            });
        }


        const now = new Date();
        let discountedPrice = variant.price;
        let bestDiscount = 0;

        // Product offer check
        if (product.productOffer && 
            now >= new Date(product.productOffer.startDate) && 
            now <= new Date(product.productOffer.expiryDate)) {
            bestDiscount = product.productOffer.discount;
        }

        // Category offer check (if better)
        if (product.category?.categoryOffer &&
            now >= new Date(product.category.categoryOffer.startDate) &&
            now <= new Date(product.category.categoryOffer.expiryDate)) {
            const categoryDiscount = product.category.categoryOffer.discount;
            if (categoryDiscount > bestDiscount) {
                bestDiscount = categoryDiscount;
            }
        }

        // Apply discount
        if (bestDiscount > 0) {
            discountedPrice = variant.price - (variant.price * (bestDiscount / 100));
        }



        let cart = await Cart.findOne({ user: userId });


        if (!cart) {
            cart = new Cart({ 
                user: userId, 
                items: [],
                totalAmount: 0 
            });
        }

        const existingItem = cart.items.find(
            item => item.product.toString() === productId && 
                    item.color === color && 
                    item.size === size
        );


        if (existingItem) {
            
            existingItem.quantity += quantity;
        } else {
            // Add new item
            cart.items.push({
                product: productId,
                quantity,
                color,
                colorName,
                size,
                price: variant.price,
                discountedPrice: Math.round(discountedPrice),
                productImage: variant.productImage[0]
            });
        }


        cart.totalAmount = cart.items.reduce((total, item) => 
            total + (item.discountedPrice * item.quantity), 0);


        await cart.save();



        res.status(200).json({ 
            success: true, 
            message: "Added to cart successfully" 
        });


        await Wishlist.updateOne(
            {userId:userId},
            {$pull:{items:{product:productId}}}
        );
        
    } catch (error) {
        next(error)
        console.log("error in add to cart from wishlist",error.message)
    }
}






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


const removeProduct = async(req,res)=>{
    try {
        const {productId} = req.params;
        const userId = req.session?.user || req.session?.passport?.user;

        if(!userId){
            return res.status(400).json({success:false,message:"user not found"})
        }

        const result = await Wishlist.findOneAndDelete({ 
            userId, 
            product: productId 
        });


        if (result) {
            res.status(200).json({ success: true, message: "Product removed from wishlist." });
        } else {
            res.status(404).json({ success: false, message: "Product not found in wishlist." });
        }

        
    } catch (error) {
        console.log("error in removing products from wishlist",error.message)
    }
}

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
    removeProduct,
    wishlistStatus,
    wishlistCounter,
    getProductDetails,
    wishlistToCart

    // addExternalProductToWishlist,
    // addProductsFromWishlist,

}