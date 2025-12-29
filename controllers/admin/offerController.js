// controllers/admin/offerController.js

import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Offer from "../../models/offerSchema.js";


const loadOffer = async (req, res) => {
    try {
        const products = await Product.find({}, "productName");
        const categories = await Category.find({}, "name");

        return res.render("admin/offerAddPage", {
            products,
            categories
        });
    } catch (error) {
        console.error("Error loading offer page:", error.message);
        res.status(500).send("Internal Server Error");
    }
};


const getItemByType = async (req, res) => {
    try {
        const { type } = req.query;

        if (type === "product") {
            const products = await Product.find({ isBlocked: false });
            return res.json(products);
        } else if (type === "category") {
            const categories = await Category.find({ isListed: true });
            return res.json(categories);
        } else {
            return res.status(400).json({ message: "Invalid type" });
        }
    } catch (error) {
        console.error("Error fetching items by type:", error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Add a new offer
const addOffer = async (req, res) => {
    try {
        const { offerName, discount, type, itemId, startDate, expiryDate } = req.body;

        const newOffer = new Offer({
            offerName,
            discount,
            type,
            startDate,
            expiryDate
        });

        if (type === "product") {
            newOffer.productId = itemId;
        } else if (type === "category") {
            newOffer.categoryId = itemId;
        }

        const savedOffer = await newOffer.save();

        // Associate offer with product or category
        if (type === "product") {
            const product = await Product.findById(itemId);
            if (product) {
                product.productOffer = savedOffer._id;
                await product.save();
            }
        } else if (type === "category") {
            const category = await Category.findById(itemId);
            if (category) {
                category.categoryOffer = savedOffer._id;
                await category.save();
            }
        }

        res.json({ success: true, message: "Offer added successfully!" });
    } catch (error) {
        console.error("Error adding offer:", error.message);
        res.status(500).json({ success: false, message: "Failed to add offer" });
    }
};



export default {
    loadOffer,
    getItemByType,
    addOffer
};