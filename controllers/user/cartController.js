// controllers/user/cartController.js

import Cart from "../../models/cartSchema.js";
import Product from "../../models/productSchema.js";
import Address from "../../models/addressSchema.js";  // Fixed typo: adressSchema → addressSchema
import Coupon from '../../models/couponSchema.js';
import Wallet from '../../models/walletSchema.js';

const addtoCart = async (req, res, next) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const { productId, quantity, color, colorName, size } = req.body;

        const product = await Product.findById(productId)
            .populate('productOffer')
            .populate({
                path: 'category',
                populate: { path: 'categoryOffer' }
            });

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        if (product.isBlocked) {
            return res.status(400).json({ success: false, message: "Product is blocked by admin" });
        }

        const variant = product.variants.find(v =>
            v.color === color &&
            v.colorName === colorName &&
            v.size === size
        );

        if (!variant) {
            return res.status(400).json({ success: false, message: "Variant not found" });
        }

        if (variant.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${variant.stock} items available in stock`
            });
        }

        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({ user: userId, items: [], totalAmount: 0 });
        }

        const existingItemIndex = cart.items.findIndex(item =>
            item.product.toString() === productId &&
            item.color === color &&
            item.size === size
        );

        let totalQuantity = quantity;
        if (existingItemIndex > -1) {
            totalQuantity += cart.items[existingItemIndex].quantity;
        }


        if(totalQuantity > variant.stock){
            return res.status(400).json({
            success: false,
            message: `Only ${variant.stock} items available in stock (you already have ${cart.items[existingItemIndex]?.quantity || 0} in cart)`
        });


        }
        if (totalQuantity > 5) {
            return res.status(400).json({
                success: false,
                message: 'Cannot add more than 5 items of the same product'
            });
        }

        const now = new Date();
        let discountedPrice = variant.price;
        let bestDiscount = 0;
        let offerName = "";

        if (product.productOffer &&
            now >= product.productOffer.startDate &&
            now <= product.productOffer.expiryDate) {
            bestDiscount = product.productOffer.discount;
            discountedPrice = variant.price * (1 - bestDiscount / 100);
            offerName = product.productOffer.offerName;
        }

        if (product.category?.categoryOffer &&
            now >= product.category.categoryOffer.startDate &&
            now <= product.category.categoryOffer.expiryDate) {
            const categoryDiscount = product.category.categoryOffer.discount;
            if (categoryDiscount > bestDiscount) {
                bestDiscount = categoryDiscount;
                discountedPrice = variant.price * (1 - categoryDiscount / 100);
                offerName = product.category.categoryOffer.offerName;
            }
        }

        discountedPrice = Math.round(discountedPrice);

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity = totalQuantity;
            cart.items[existingItemIndex].discountedPrice = discountedPrice;
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

        cart.totalAmount = cart.items.reduce((total, item) =>
            total + (item.discountedPrice || item.price) * item.quantity, 0
        );

        await cart.save();

        return res.json({
            success: true,
            message: "Product added to cart",
            newStock: variant.stock,
            cartTotal: cart.totalAmount,
            appliedOffer: offerName ? { name: offerName, discount: bestDiscount } : null
        });

    } catch (error) {
        console.error("Error in add to cart:", error);
        next(error);
    }
};

const getCart = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        if (!userId) {
            return res.redirect("/user/login");
        }

        await syncCartPrices(userId);

        const cart = await Cart.findOne({ user: userId })
            .populate({
                path: 'items.product',
                select: 'productName variants isBlocked category',
                populate: { path: 'category', select: 'name isListed' }
            });

        if (!cart || cart.items.length === 0) {
            return res.render('user/addtoCart', { cart: { items: [], totalAmount: 0 } });
        }

        res.render('user/addtoCart', { cart });
    } catch (error) {
        console.error("Error in get cart:", error);
        res.status(500).send("Server error");
    }
};

const updateCartCounter = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        if (!userId) {
            return res.json({ count: 0 });
        }

        const cart = await Cart.findOne({ user: userId });
        const count = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;

        res.json({ success: true, count });
    } catch (error) {
        console.error("Error in updateCartCounter:", error);
        res.status(500).json({ count: 0 });
    }
};

const removeProducts = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const itemId = req.params.itemId;

        const cart = await Cart.findOneAndUpdate(
            { user: userId },
            { $pull: { items: { _id: itemId } } },
            { new: true }
        );

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        cart.totalAmount = cart.items.reduce((total, item) =>
            total + (item.discountedPrice || item.price) * item.quantity, 0
        );

        await cart.save();

        res.json({
            success: true,
            message: "Product removed successfully",
            cart: {
                totalAmount: cart.totalAmount,
                itemCount: cart.items.length
            }
        });
    } catch (error) {
        console.error("Error removing product:", error);
        res.status(500).json({ success: false, message: "Error removing product" });
    }
};

const updateQuantity = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const { itemId, quantity } = req.body;

        if (quantity > 5) {
            return res.status(400).json({ success: false, message: "Cannot add more than 5 items" });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const cartItem = cart.items.find(item => item._id.toString() === itemId);
        if (!cartItem) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        const product = await Product.findById(cartItem.product)
            .populate('productOffer')
            .populate({ path: 'category', populate: { path: 'categoryOffer' } });

        const variant = product.variants.find(v =>
            v.color === cartItem.color &&
            v.colorName === cartItem.colorName &&
            v.size === cartItem.size
        );

        if (variant.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${variant.stock} items available`
            });
        }

        let discountedPrice = variant.price;
        const now = new Date();
        let bestDiscount = 0;

        if (product.productOffer && now >= product.productOffer.startDate && now <= product.productOffer.expiryDate) {
            bestDiscount = product.productOffer.discount;
            discountedPrice = variant.price * (1 - bestDiscount / 100);
        }

        if (product.category?.categoryOffer && now >= product.category.categoryOffer.startDate && now <= product.category.categoryOffer.expiryDate) {
            const catDiscount = product.category.categoryOffer.discount;
            if (catDiscount > bestDiscount) {
                discountedPrice = variant.price * (1 - catDiscount / 100);
            }
        }

        discountedPrice = Math.round(discountedPrice);

        cartItem.quantity = quantity;
        cartItem.discountedPrice = discountedPrice;

        cart.totalAmount = cart.items.reduce((total, item) =>
            total + (item.discountedPrice || item.price) * item.quantity, 0
        );

        await cart.save();

        res.json({
            success: true,
            newTotal: discountedPrice * quantity,
            cartTotal: cart.totalAmount,
            itemPrice: discountedPrice,
            quantity
        });
    } catch (error) {
        console.error("Error updating quantity:", error);
        res.status(500).json({ success: false, message: "Error updating quantity" });
    }
};

const syncCartPrices = async (userId) => {
    try {
        const cart = await Cart.findOne({ user: userId });
        if (!cart || cart.items.length === 0) return;

        let updated = false;

        for (const item of cart.items) {
            const product = await Product.findById(item.product)
                .populate('productOffer')
                .populate({ path: 'category', populate: { path: 'categoryOffer' } });

            if (!product) continue;

            const variant = product.variants.find(v =>
                v.color === item.color &&
                v.colorName === item.colorName &&
                v.size === item.size
            );

            if (!variant) continue;

            let discountedPrice = variant.price;
            const now = new Date();
            let bestDiscount = 0;

            if (product.productOffer && now >= product.productOffer.startDate && now <= product.productOffer.expiryDate) {
                bestDiscount = product.productOffer.discount;
                discountedPrice = variant.price * (1 - bestDiscount / 100);
            }

            if (product.category?.categoryOffer && now >= product.category.categoryOffer.startDate && now <= product.category.categoryOffer.expiryDate) {
                const catDiscount = product.category.categoryOffer.discount;
                if (catDiscount > bestDiscount) {
                    discountedPrice = variant.price * (1 - catDiscount / 100);
                }
            }

            discountedPrice = Math.round(discountedPrice);

            if (item.price !== variant.price || item.discountedPrice !== discountedPrice) {
                item.price = variant.price;
                item.discountedPrice = discountedPrice;
                updated = true;
            }
        }

        if (updated) {
            cart.totalAmount = cart.items.reduce((total, item) =>
                total + (item.discountedPrice || item.price) * item.quantity, 0
            );
            await cart.save();
        }
    } catch (error) {
        console.error("Error syncing cart prices:", error);
    }
};

const addresses = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const addresses = await Address.find({ userId });
        res.json(addresses);
    } catch (error) {
        console.error("Error fetching addresses:", error);
        res.status(500).json({ error: "Failed to fetch addresses" });
    }
};

const addNewAddress = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const addressData = { ...req.body, userId };
        const newAddress = new Address(addressData);
        await newAddress.save();
        res.status(201).json(newAddress);
    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).json({ error: "Failed to add address" });
    }
};

const updateAddress = async (req, res) => {
    try {
        const { addressId } = req.body;
        const userId = req.session.user || req.session?.passport?.user;

        const address = await Address.findOne({ _id: addressId, userId });
        if (!address) {
            return res.status(404).json({ error: "Address not found" });
        }

        req.session.selectedAddressId = addressId;
        req.session.save(err => {
            if (err) {
                console.error("Session save error:", err);
                return res.status(500).json({ error: "Failed to save session" });
            }
            res.json({ success: true });
        });
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ error: "Failed to update address" });
    }
};

const checkout = async (req, res, next) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const selectedAddressId = req.session.selectedAddressId;

        const wallet = await Wallet.findOne({ userId });
        const walletBalance = wallet?.balance || 0;

        const cart = await Cart.findOne({ user: userId })
            .populate({
                path: "items.product",
                select: "productName variants isBlocked category",
                populate: { path: "category", select: "name isListed" }
            });

        if (!cart || cart.items.length === 0) {
            return res.redirect("/user/cart");
        }

        const blockedItems = cart.items.filter(item =>
            item.product?.isBlocked || !item.product?.category?.isListed
        );

        if (blockedItems.length > 0) {
            const blockedNames = blockedItems.map(item =>
                `${item.product.productName} (${item.product?.isBlocked ? "blocked" : "category unlisted"})`
            );

            if (req.xhr) {
                return res.status(400).json({
                    success: false,
                    message: `Unavailable items: ${blockedNames.join(', ')}`
                });
            }
            return res.redirect("/user/cart");
        }

        const address = selectedAddressId
            ? await Address.findById(selectedAddressId)
            : await Address.findOne({ userId });

        const currentDate = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            startDate: { $lte: currentDate },
            endDate: { $gte: currentDate },
            minimumOrderAmount: { $lte: cart.totalAmount },
            $expr: { $lt: ["$currentUsageCount", "$usageLimit"] }
        });

        if (req.xhr) {
            return res.json({ success: true, coupons });
        }

        res.render("user/checkOutPage", {
            cart,
            address,
            coupons,
            pageTitle: "Checkout",
            walletBalance
        });
    } catch (error) {
        console.error("Error in checkout:", error);
        next(error);
    }
};

export default {
    getCart,
    addtoCart,
    removeProducts,
    updateQuantity,
    checkout,
    addresses,
    addNewAddress,
    updateAddress,
    updateCartCounter
};
