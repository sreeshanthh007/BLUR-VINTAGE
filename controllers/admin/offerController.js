// controllers/admin/offerController.js

import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import Offer from "../../models/offerSchema.js";


const loadOffer = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 1;
        const skip = (page - 1) * limit;

        const today = new Date();
        today.setHours(0, 0, 0, 0);


        const query = { expiryDate: { $gte: today } };

        const offers = await Offer.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('productId', 'productName')
            .populate('categoryId', 'name');

        const totalOffers = await Offer.countDocuments(query);
        const totalPages = Math.ceil(totalOffers / limit);

        // For dropdowns in "Add Offer" form
        const products = await Product.find({}, "productName");
        const categories = await Category.find({}, "name");

        res.render("admin/offerAddPage", {
            offers,
            products,
            categories,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1,
            lastPage: totalPages
        });

    } catch (error) {
        console.error("Error loading offer page:", error.message);
        res.status(500).render('error', { message: "Failed to load offers" });
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



const deleteoffer = async(req,res)=>{

    try {
    const {offerId} = req.params
        

    if(!offerId){
        res.status(400).json({success:false,message:"offer id not found"});
        return
    }

    const offerExist = await Offer.findById(offerId)

    if(!offerExist){
        res.status(404).json({success:false,message:"offer not found"});
        return
    }

    await Offer.findByIdAndDelete(offerId)

    res.status(200).json({success:true,message:"offer deleted successfully"});
    return
    } catch (error) {
        console.log("error while removing offer",error)
    }
}


export default {
    loadOffer,
    getItemByType,
    addOffer,
    deleteoffer
};