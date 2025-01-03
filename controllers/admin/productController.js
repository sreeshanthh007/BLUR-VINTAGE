

const Product = require('../../models/productSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');
const product = require('../../models/productSchema');





// for options in the add category

loadAddCategory = async(req,res)=>{
    try {
        const categories = await Category.find();
    res.render('admin/addproductpage',{
        cat:categories
    })
}catch(err){
    console.log("error in loadaddcategory");
    
}

}



// add product
const addProducts = async (req, res) => {
    try {
      const productData = req.body;
      console.log("product data",productData);
      
      const existingProduct = await Product.findOne({
        productName: productData.productName,
      });
      if (existingProduct) {
        return res.status(400).json("Product already exists, please try with another name");
      }
  
      const processedImages = [];
      if (req.files && req.files.length > 0) {
        const uploadDirectory = path.join("public", "uploads", "product-images");
  
        
        if (!fs.existsSync(uploadDirectory)) {
          fs.mkdirSync(uploadDirectory, { recursive: true });
        }
  
       
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;
          const fileExtension = path.extname(req.files[i].originalname);
          const uniqueFileName = `${Date.now()}-${i}${fileExtension}`;
          const resizedImagePath = path.join(uploadDirectory, uniqueFileName);
  
          await sharp(originalImagePath)
            .resize({ width: 440, height: 440, fit: sharp.fit.cover })
            .sharpen({ sigma: 1.5 })
            .jpeg({ quality: 95 })
            .toColourspace('srgb')
            .toFile(resizedImagePath);
  
          processedImages.push(`/uploads/product-images/${uniqueFileName}`);
        }
      }
  
     
      const category = await Category.findOne({ name: productData.category });
      if (!category) {
        return res.status(400).json("Invalid category name");
      }
  
     
      const newProduct = new Product({
        productName: productData.productName,
        description: productData.description,
        category: category._id, 
        Price: productData.Price,
        color:productData.color,
        colorName:productData.colorName,
        createdOn: new Date(),
        quantity: productData.quantity,
        productImage: processedImages,
        status: "Available", 
      });
  
      await newProduct.save();

    return res.status(200).json({success:true,message:"product added successfully"})
    } catch (error) {
      console.error("Error while adding product:", error);
    }
  };


  // edit product

  const editProduct = async (req, res) => {
    try {
      const id = req.params.id;
      console.log("productId",id) 
      const productData = req.body;
  
      // Find the product by ID
      let product = await Product.findById({_id:id});
      if (!product) {
        console.log("product not found")
        return res.status(404).json("Product not found");
      }
  
      // Check if the updated product name already exists (excluding the current product)
      const existingProduct = await Product.findOne({
        productName: productData.productName,
        _id: { $ne:id },
      });
      if (existingProduct) {
        return res.status(400).json("Product with this name already exists, please try with another name");
      }
  
      const processedImages = product.productImage || []; // Retain existing images if no new ones are uploaded
  
      if (req.files && req.files.length > 0) {
        const uploadDirectory = path.join("public", "uploads", "product-images");
  
        // Ensure the upload directory exists
        if (!fs.existsSync(uploadDirectory)) {
          fs.mkdirSync(uploadDirectory, { recursive: true });
        }
  
        // Process new images
        for (let i = 0; i < req.files.length; i++) {
          const originalImagePath = req.files[i].path;
          const fileExtension = path.extname(req.files[i].originalname);
          const uniqueFileName = `${Date.now()}-${i}${fileExtension}`;
          const resizedImagePath = path.join(uploadDirectory, uniqueFileName);
  
          await sharp(originalImagePath)
            .resize({ width: 440, height: 440, fit: sharp.fit.cover })
            .sharpen({ sigma: 1.5 })
            .jpeg({ quality: 95 })
            .toColourspace("srgb")
            .toFile(resizedImagePath);
  
          processedImages.push(`/uploads/product-images/${uniqueFileName}`);
        }
      }
  
      // Find the category (optional validation, based on your requirement)
      const category = await Category.findOne({ name: productData.category });
      if (!category) {
        return res.status(400).json("Invalid category name");
      }
  
      // Update product details
      product.productName = productData.productName;
      product.description = productData.description;
      product.category = category._id; // Save category ID
      product.regularPrice = productData.regularPrice;
      product.salePrice = productData.salePrice;
      product.quantity = productData.quantity;
      product.productImage = processedImages;
      product.status = "Available"; // Update status if required
  
      await product.save();
      res.redirect("/admin/productpage"); // Redirect back to the products page
    } catch (error) {
      console.error("Error while editing product:", error.message); 
    }
  };


  const loadEditProduct= async(req,res)=>{
    try {
      const listData = await product.find({});
      console.log("")
        res.render("admin/editproduct", {
            products: listData,
            cat:category ,
            currentPage:page,
            totalPages:totalPages
        });
    } catch (error) {
        console.error("Error loading products:", error);
        res.status(500).send("An error occurred while loading products.");
    }
  }
// listed product pagination
const loadproduct = async (req, res) => {
    try {
       
        
      const page = parseInt(req.query.page) || 1; 
      const pageSize = 4;  
      const totalProducts = await Product.countDocuments();  
      const totalPages = Math.ceil(totalProducts / pageSize);  
  
      // Fetch data for the current page in descending order (e.g., by creation date)
      const products = await Product.find()
          .sort({ createdAt: -1 })  
          .skip((page - 1) * pageSize)
          .limit(pageSize);


        const category=await Category.find({isListed:true});
        console.log("category",category);
        

    
        res.render("admin/productpage", {
            products: products,
            cat:category ,
            currentPage:page,
            totalPages:totalPages
        });
    } catch (error) {
        console.error("Error loading products:", error);
        res.status(500).send("An error occurred while loading products.");
    }
};

// blocking the product
const blockProduct =  async (req,res)=>{
   try {
    const id = req.query.id;
    console.log(id)
   const products =  await Product.updateOne({_id:id},{$set:{isBlocked:true}});
   console.log("blocked product",products);
   
    res.redirect('/admin/productpage')
   } catch (error) {
    console.log("error in blockproduct");
   }
}

// unblock the product
const unBlockProduct =  async (req,res)=>{
    try {
        const id  =  req.query.id;
       const products =  await Product.updateOne({_id:id},{$set:{isBlocked:false}})
       console.log("unblocked product",products);
       
        res.redirect('/admin/productpage')

    } catch (error) {
        console.log("error in unblock product");
        
    }
}

module.exports = {
    loadproduct,
    loadAddCategory,
    addProducts,
    blockProduct,
    unBlockProduct,
    loadEditProduct,
    editProduct
}