const Users = require('../../models/userSchema');
const Product = require("../../models/productSchema");
const Wishlist = require("../../models/wishlistSchema");


const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const { productId, variantColor, variantSize } = req.body;

        
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Find the specific variant
        const variant = product.variants.find(v => 
            v.color === variantColor && v.size === variantSize
        );

        if (!variant) {
            return res.status(404).json({ success: false, message: "Variant not found" });
        }

        
        const existingWishlistItem = await Wishlist.findOne({ 
            userId, 
            product: productId,
            'variant.color': variantColor,
            'variant.size': variantSize
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

        res.render('user/wishlist', { 
            search:"hellloo"
        });
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).send("Error fetching wishlist");
    }
};


module.exports={
    getWishlist,
    addToWishlist,
}