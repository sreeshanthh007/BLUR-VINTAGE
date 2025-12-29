// controllers/admin/categoryController.js

import Category from "../../models/categorySchema.js";

// Load category management page with pagination
const categoryInfo = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 4;
        const skip = (page - 1) * limit;

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

        res.render('admin/categorymanage', {
            Category: categoryData,
            currentPage: page,
            totalPages,
            totalCategories
        });
    } catch (error) {
        console.error("Error in categoryInfo:", error);
        res.status(500).send("Internal Server Error");
    }
};

// Add new category
const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name || !description) {
            return res.status(400).json({ success: false, message: "Name and description are required" });
        }

        const trimmedName = name.trim();

        const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${trimmedName}$`, 'i') } });

        if (existingCategory) {
            return res.status(400).json({ success: false, message: "Category already exists!" });
        }

        const newCategory = new Category({
            name: trimmedName,
            description
        });

        await newCategory.save();

        return res.json({ success: true, message: "Category added successfully" });
    } catch (error) {
        console.error("Error adding category:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

// Load edit category page
const loadeditCategory = async (req, res) => {
    try {
        const { editId } = req.params;

        const category = await Category.findById(editId);

        if (!category) {
            return res.status(404).render("error", { message: "Category not found" });
        }

        res.render("admin/editcategory", { category });
    } catch (error) {
        console.error("Error loading edit category:", error);
        res.status(500).send("Server error");
    }
};

// Update category
const editCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, description, isListed } = req.body;

        if (!name?.trim()) {
            req.flash("error", "Category name is required");
            return res.redirect(`/admin/editcategory/${categoryId}`);
        }

        if (!description?.trim()) {
            req.flash("error", "Description is required");
            return res.redirect(`/admin/editcategory/${categoryId}`);
        }

        const trimmedName = name.trim();

        // Check if another category with same name exists
        const existingCategory = await Category.findOne({
            name: { $regex: new RegExp(`^${trimmedName}$`, 'i') },
            _id: { $ne: categoryId }
        });

        if (existingCategory) {
            req.flash("error", "Category name already exists");
            return res.redirect(`/admin/editcategory/${categoryId}`);
        }

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            {
                name: trimmedName,
                description: description.trim(),
                isListed: isListed === "on"
            },
            { new: true }
        );

        if (!updatedCategory) {
            req.flash("error", "Category not found");
            return res.redirect("/admin/category");
        }

        req.flash("success", "Category updated successfully");
        res.redirect("/admin/category");
    } catch (error) {
        console.error("Error updating category:", error);
        req.flash("error", "Failed to update category");
        res.redirect("/admin/category");
    }
};

// Toggle category listing status
const toggler = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { isListed } = req.body;

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            { isListed: isListed === "true" || isListed === true },
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        res.json({
            success: true,
            message: "Category status updated",
            isListed: updatedCategory.isListed
        });
    } catch (error) {
        console.error("Error in toggler:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};



export default {
    categoryInfo,
    addCategory,
    loadeditCategory,
    editCategory,
    toggler
};