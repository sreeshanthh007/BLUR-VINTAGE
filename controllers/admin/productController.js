import Product from '../../models/productSchema.js';
import Category from '../../models/categorySchema.js';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import mongoose from 'mongoose';

const loadAddCategory = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render('admin/addproductpage', { cat: categories });
    } catch (err) {
        console.log("error in loadaddcategory",err);
        res.status(500).send("Server error");
    }
};

const addProducts = async (req, res) => {
    try {
        const productData = req.body;
        const variant = JSON.parse(productData.variants);

        const filesByVariant = {};
        if (req.files && req.files.length > 0) {
            req.files.forEach((file) => {
                const matches = file.fieldname.match(/^productImages\[(\d+)\]/);
                if (matches) {
                    const variantIndex = matches[1];
                    if (!filesByVariant[variantIndex]) {
                        filesByVariant[variantIndex] = [];
                    }
                    filesByVariant[variantIndex].push(file);
                }
            });
        }

        const existingProduct = await Product.findOne({ productName: productData.productName });
        if (existingProduct) {
            return res.status(400).json("Product already exists, please try with another name");
        }

        const processedImages = {};
        const uploadDirectory = path.join("public", "uploads", "product-images");
        await fs.promises.mkdir(uploadDirectory, { recursive: true });

        for (const [variantIndex, files] of Object.entries(filesByVariant)) {
            processedImages[variantIndex] = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExtension = path.extname(file.originalname);
                const supportedFormats = [".jpg", ".jpeg", ".png", ".webp"];
                if (!supportedFormats.includes(fileExtension.toLowerCase())) {
                    return res.status(400).json("Unsupported image format");
                }
                const uniqueFileName = `${Date.now()}-${variantIndex}-${i}${fileExtension}`;
                const resizedImagePath = path.join(uploadDirectory, uniqueFileName);

                await sharp(file.buffer)
                    .resize({ width: 440, height: 440, fit: sharp.fit.cover })
                    .sharpen({ sigma: 1.5 })
                    .jpeg({ quality: 95 })
                    .toColourspace("srgb")
                    .toFile(resizedImagePath);

                processedImages[variantIndex].push(`/uploads/product-images/${uniqueFileName}`);
            }
        }

        const category = await Category.findOne({ name: productData.category });
        if (!category) {
            return res.status(400).json("Invalid category name");
        }

        let productOffer = null;
        if (productData.productOffer && mongoose.Types.ObjectId.isValid(productData.productOffer)) {
            productOffer = productData.productOffer;
        }

        const variantsWithImages = variant.map((variantData, index) => ({
            color: variantData.color,
            colorName: variantData.colorName,
            size: variantData.size,
            stock: parseInt(variantData.stock, 10),
            price: parseFloat(variantData.price),
            productImage: processedImages[index] || [],
        }));

        const newProduct = new Product({
            productName: productData.productName,
            description: productData.description,
            category: category._id,
            productOffer,
            variants: variantsWithImages,
            status: productData.status || "Available",
            createdOn: new Date(),
        });

        await newProduct.save();
        return res.status(200).json({ success: true, message: "Product added successfully" });
    } catch (error) {
        console.error("Error while adding product:", error);
        return res.status(500).json("Error adding product");
    }
};

const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const productData = req.body;
        const files = req.files || [];

        const variants = JSON.parse(productData.variants);
        const removedImages = JSON.parse(productData.removedImages || '[]');

        const processedVariants = await Promise.all(variants.map(async (variant, variantIndex) => {
            let variantImages = variant.productImage.filter(img => !removedImages.includes(img));

            const variantFiles = files.filter(file => file.fieldname === `productImage_${variantIndex}`);

            for (const file of variantFiles) {
                const filename = `${Date.now()}-${variantIndex}-${Math.random().toString(36).substring(7)}.jpg`;
                const uploadPath = path.join('public', 'uploads', 'product-images', filename);
                await fs.promises.mkdir(path.dirname(uploadPath), { recursive: true });

                await sharp(file.buffer)
                    .resize(440, 440, { fit: 'cover' })
                    .jpeg({ quality: 95 })
                    .toFile(uploadPath);

                variantImages.push(`/uploads/product-images/${filename}`);
            }

            return { ...variant, productImage: variantImages };
        }));

        await Product.findByIdAndUpdate(
            id,
            {
                $set: {
                    productName: productData.productName,
                    description: productData.description,
                    category: productData.category,
                    variants: processedVariants,
                    status: processedVariants.some(v => v.stock > 0) ? "Available" : "out of stock"
                }
            },
            { new: true }
        );

        for (const imagePath of removedImages) {
            const fullPath = path.join('public', imagePath);
            if (fs.existsSync(fullPath)) {
                await fs.promises.unlink(fullPath);
            }
        }

        return res.status(200).json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        return res.status(500).json({ success: false, message: error.message || 'Error updating product' });
    }
};

const loadEditProduct = async (req, res) => {
    try {
        const productId = req.query.id;
        const productDetails = await Product.findOne({ _id: productId }).populate('category');
        const category = await Category.find();
        res.render("admin/editproduct", { details: productDetails, cat: category });
    } catch (error) {
        console.error("Error loading edit product:", error);
        res.status(500).send("Server error");
    }
};

const loadproduct = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const pageSize = 4;
        const totalProducts = await Product.countDocuments();
        const totalPages = Math.ceil(totalProducts / pageSize);

        const products = await Product.find()
            .populate('category', 'name')
            .sort({ createdAt: -1 })
            .skip((page - 1) * pageSize)
            .limit(pageSize);

        const category = await Category.find({ isListed: true });

        res.render("admin/productpage", {
            products,
            cat: category,
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error("Error loading products:", error);
        res.status(500).send("Server error");
    }
};

const blockProduct = async (req, res) => {
    try {
        const id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect('/admin/productpage');
    } catch (error) {
        console.log("error in blockproduct",error);
        res.status(500).send("Server error");
    }
};

const unBlockProduct = async (req, res) => {
    try {
        const id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect('/admin/productpage');
    } catch (error) {
        console.log("error in unblock product",error);
        res.status(500).send("Server error");
    }
};

export default {
    loadproduct,
    loadAddCategory,
    addProducts,
    blockProduct,
    unBlockProduct,
    loadEditProduct,
    editProduct,
};

