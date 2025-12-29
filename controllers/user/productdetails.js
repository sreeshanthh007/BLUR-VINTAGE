// controllers/user/productdetails.js

import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import User from '../../models/userSchema.js';

const productDetails = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;

        let userData = null;
        if (userId) {
            userData = await User.findById(userId);
        } else {
            return res.redirect("/user/login");
        }

        const productId = req.query.id;
        if (!productId) {
            return res.status(400).send("Product ID is required");
        }

        const productData = await Product.findById(productId)
            .populate('category')
            .populate('productOffer')
            .populate({
                path: 'category',
                populate: { path: 'categoryOffer' }
            });

        if (!productData || productData.isBlocked) {
            return res.status(404).render('error', { message: "Product not found or unavailable" });
        }

        const now = new Date();
        let bestDiscount = 0;
        let offerName = "";
        let originalPrice = 0;
        let finalPrice = 0;

        if (productData.variants && productData.variants.length > 0) {
            originalPrice = productData.variants[0].price;
            finalPrice = originalPrice;

            // Product Offer
            if (productData.productOffer &&
                now >= new Date(productData.productOffer.startDate) &&
                now <= new Date(productData.productOffer.expiryDate)) {
                const productDiscount = productData.productOffer.discount;
                if (productDiscount > bestDiscount) {
                    bestDiscount = productDiscount;
                    finalPrice = originalPrice * (1 - productDiscount / 100);
                    offerName = productData.productOffer.offerName;
                }
            }

            // Category Offer (takes priority if better)
            if (productData.category?.categoryOffer &&
                now >= new Date(productData.category.categoryOffer.startDate) &&
                now <= new Date(productData.category.categoryOffer.expiryDate)) {
                const categoryDiscount = productData.category.categoryOffer.discount;
                if (categoryDiscount > bestDiscount) {
                    bestDiscount = categoryDiscount;
                    finalPrice = originalPrice * (1 - categoryDiscount / 100);
                    offerName = productData.category.categoryOffer.offerName;
                }
            }
        }

        finalPrice = Math.round(finalPrice);

        const productWithOffer = {
            ...productData.toObject(),
            originalPrice,
            finalPrice,
            discount: bestDiscount,
            offerName
        };

        // Related Products (same category, not blocked, in stock)
        const relatedProducts = await Product.find({
            category: productData.category._id,
            _id: { $ne: productId },
            isBlocked: false,
            'variants.stock': { $gt: 0 }
        })
        .populate('productOffer')
        .populate({
            path: 'category',
            populate: { path: 'categoryOffer' }
        })
        .limit(5)
        .lean();

        const relatedProductsWithOffers = relatedProducts.map(product => {
            let relOriginalPrice = product.variants[0]?.price || 0;
            let relFinalPrice = relOriginalPrice;
            let relBestDiscount = 0;
            let relOfferName = "";

            if (product.productOffer &&
                now >= new Date(product.productOffer.startDate) &&
                now <= new Date(product.productOffer.expiryDate)) {
                const pd = product.productOffer.discount;
                if (pd > relBestDiscount) {
                    relBestDiscount = pd;
                    relFinalPrice = relOriginalPrice * (1 - pd / 100);
                    relOfferName = product.productOffer.offerName;
                }
            }

            if (product.category?.categoryOffer &&
                now >= new Date(product.category.categoryOffer.startDate) &&
                now <= new Date(product.category.categoryOffer.expiryDate)) {
                const cd = product.category.categoryOffer.discount;
                if (cd > relBestDiscount) {
                    relBestDiscount = cd;
                    relFinalPrice = relOriginalPrice * (1 - cd / 100);
                    relOfferName = product.category.categoryOffer.offerName;
                }
            }

            return {
                ...product,
                originalPrice: relOriginalPrice,
                finalPrice: Math.round(relFinalPrice),
                discount: relBestDiscount,
                offerName: relOfferName
            };
        });

        res.render('user/buyingInterface', {
            user: userData,
            product: productWithOffer,
            images: productData.variants[0]?.productImage || [],
            relatedProducts: relatedProductsWithOffers
        });

    } catch (error) {
        console.error("Error in product details:", error);
        res.status(500).render('error', { message: "Failed to load product details" });
    }
};

export default { productDetails };

