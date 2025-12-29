// controllers/user/wishlistController.js

import Product from "../../models/productSchema.js";
import Wishlist from "../../models/wishlistSchema.js";
import Cart from "../../models/cartSchema.js";

const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const { productId } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login first" });
        }

        const product = await Product.findById(productId)
            .populate('productOffer')
            .populate({
                path: 'category',
                populate: { path: 'categoryOffer' }
            });

        if (!product || product.isBlocked) {
            return res.status(404).json({ success: false, message: "Product not found or unavailable" });
        }

        // Find first available variant
        const variant = product.variants.find(v => v.stock > 0);
        if (!variant) {
            return res.status(400).json({ success: false, message: "No available stock for this product" });
        }

        const now = new Date();
        let bestDiscount = 0;
        let finalPrice = variant.price;
        let offerName = "";

        if (product.productOffer &&
            now >= new Date(product.productOffer.startDate) &&
            now <= new Date(product.productOffer.expiryDate)) {
            bestDiscount = product.productOffer.discount;
            finalPrice = variant.price * (1 - bestDiscount / 100);
            offerName = product.productOffer.offerName;
        }

        if (product.category?.categoryOffer &&
            now >= new Date(product.category.categoryOffer.startDate) &&
            now <= new Date(product.category.categoryOffer.expiryDate)) {
            const categoryDiscount = product.category.categoryOffer.discount;
            if (categoryDiscount > bestDiscount) {
                bestDiscount = categoryDiscount;
                finalPrice = variant.price * (1 - categoryDiscount / 100);
                offerName = product.category.categoryOffer.offerName;
            }
        }

        finalPrice = Math.round(finalPrice);

        const existingItem = await Wishlist.findOne({ userId, product: productId });
        if (existingItem) {
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
                originalPrice: variant.price,
                price: finalPrice,
                discount: bestDiscount,
                offerName,
                productImage: variant.productImage,
                status: variant.status
            }
        });

        await wishlistItem.save();

        res.json({ success: true, message: "Added to wishlist successfully" });
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ success: false, message: "Failed to add to wishlist" });
    }
};

const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const search = req.query.search || "";

        if (!userId) {
            return res.redirect("/user/login");
        }

        const wishlistItems = await Wishlist.find({ userId })
            .populate({
                path: "product",
                select: "productName isBlocked"
            })
            .lean();

        res.render('user/wishlist', {
            wishlistItems,
            search,
            user: { _id: userId }
        });
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        res.status(500).send("Server error");
    }
};

const removeProduct = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const { productId } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const result = await Wishlist.findOneAndDelete({ userId, product: productId });

        if (!result) {
            return res.status(404).json({ success: false, message: "Item not found in wishlist" });
        }

        res.json({ success: true, message: "Removed from wishlist" });
    } catch (error) {
        console.error("Error removing from wishlist:", error);
        res.status(500).json({ success: false });
    }
};

const wishlistStatus = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        if (!userId) {
            return res.json({ wishlistProductIds: [] });
        }

        const wishlistItems = await Wishlist.find({ userId }).select('product');
        const wishlistProductIds = wishlistItems.map(item => item.product.toString());

        res.json({ wishlistProductIds });
    } catch (error) {
        console.error("Error checking wishlist status:", error);
        res.status(500).json({ wishlistProductIds: [] });
    }
};

const wishlistCounter = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        if (!userId) {
            return res.json({ wishlistCount: 0 });
        }

        const wishlistCount = await Wishlist.countDocuments({ userId });
        res.json({ wishlistCount });
    } catch (error) {
        console.error("Error counting wishlist items:", error);
        res.json({ wishlistCount: 0 });
    }
};

const getProductDetails = async (req, res) => {
    try {
        const { productId } = req.params;

        const product = await Product.findById(productId)
            .populate('productOffer')
            .populate({
                path: 'category',
                populate: { path: 'categoryOffer' }
            });

        if (!product || product.isBlocked) {
            return res.status(404).json({ success: false, message: "Product not available" });
        }

        const availableVariants = product.variants.filter(v => v.stock > 0);

        res.json({
            success: true,
            data: {
                _id: product._id,
                productName: product.productName,
                variants: availableVariants,
                productOffer: product.productOffer,
                categoryOffer: product.category?.categoryOffer
            }
        });
    } catch (error) {
        console.error("Error fetching product details:", error);
        res.status(500).json({ success: false });
    }
};

const wishlistToCart = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const { productId, color, colorName, size, quantity = 1 } = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, message: "Please login first" });
        }

        const product = await Product.findById(productId)
            .populate('productOffer')
            .populate({
                path: 'category',
                populate: { path: 'categoryOffer' }
            });

        if (!product || product.isBlocked) {
            return res.status(404).json({ success: false, message: "Product not available" });
        }

        const variant = product.variants.find(v =>
            v.color === color && v.size === size
        );

        if (!variant || variant.stock < quantity) {
            return res.status(400).json({ success: false, message: "Insufficient stock" });
        }

        const now = new Date();
        let discountedPrice = variant.price;
        let bestDiscount = 0;

        if (product.productOffer && now >= product.productOffer.startDate && now <= product.productOffer.expiryDate) {
            bestDiscount = product.productOffer.discount;
        }

        if (product.category?.categoryOffer && now >= product.category.categoryOffer.startDate && now <= product.category.categoryOffer.expiryDate) {
            const catDiscount = product.category.categoryOffer.discount;
            if (catDiscount > bestDiscount) bestDiscount = catDiscount;
        }

        if (bestDiscount > 0) {
            discountedPrice = variant.price * (1 - bestDiscount / 100);
        }
        discountedPrice = Math.round(discountedPrice);

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [], totalAmount: 0 });
        }

        const existingItem = cart.items.find(item =>
            item.product.toString() === productId &&
            item.color === color &&
            item.size === size
        );

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({
                product: productId,
                quantity,
                color,
                colorName,
                size,
                price: variant.price,
                discountedPrice,
                productImage: variant.productImage[0] || ""
            });
        }

        cart.totalAmount = cart.items.reduce((sum, item) =>
            sum + (item.discountedPrice || item.price) * item.quantity, 0
        );

        await cart.save();

        // Remove from wishlist after adding to cart
        await Wishlist.findOneAndDelete({ userId, product: productId });

        res.json({ success: true, message: "Moved to cart successfully" });
    } catch (error) {
        console.error("Error moving from wishlist to cart:", error);
        res.status(500).json({ success: false, message: "Failed to move to cart" });
    }
};

export default {
    getWishlist,
    addToWishlist,
    removeProduct,
    wishlistStatus,
    wishlistCounter,
    getProductDetails,
    wishlistToCart
};

