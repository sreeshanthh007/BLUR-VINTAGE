

const Product = require('../../models/productSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');






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
        console.log("files", req.files);
        const productData = req.body;
        console.log("data", productData);
        
        const variant = JSON.parse(productData.variants);
        console.log("body", variant);

           // Group files by variant
           const filesByVariant = {};
           if (req.files && req.files.length > 0) {
               req.files.forEach(file => {
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
   
           const existingProduct = await Product.findOne({
               productName: productData.productName,
           });
 
        if (existingProduct) {
            return res.status(400).json("Product already exists, please try with another name");
        }

        // Process images for each variant
        const processedImages = {};
        const uploadDirectory = path.join("public", "uploads", "product-images");

        if (!fs.existsSync(uploadDirectory)) {
            fs.mkdirSync(uploadDirectory, { recursive: true });
        }

        // Process images by variant
        for (const [variantIndex, files] of Object.entries(filesByVariant)) {
            processedImages[variantIndex] = [];
            for (let i = 0; i < files.length; i++) {
                try {
                    const file = files[i];
                    // Verify that we have valid image data
                    if (!file.buffer) {
                        throw new Error('No image buffer found');
                    }

                    const fileExtension = path.extname(file.originalname);
                    const uniqueFileName = `${Date.now()}-${variantIndex}-${i}${fileExtension}`;
                    const resizedImagePath = path.join(uploadDirectory, uniqueFileName);

                    // Add error handling and validation before processing
                    const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp'];
                    if (!supportedFormats.includes(fileExtension.toLowerCase())) {
                        throw new Error('Unsupported image format');
                    }

                    // Process the image with additional error handling
                    await sharp(file.buffer, { failOnError: true })
                        .resize({ width: 440, height: 440, fit: sharp.fit.cover })
                        .sharpen({ sigma: 1.5 })
                        .jpeg({ quality: 95 })
                        .toColourspace('srgb')
                        .toFile(resizedImagePath)
                        .catch(err => {
                            console.error('Sharp processing error:', err);
                            throw new Error('Image processing failed');
                        });

                    processedImages[variantIndex].push(`/uploads/product-images/${uniqueFileName}`);
                } catch (imageError) {
                    console.error("Error processing image:", imageError);
                    return res.status(500).json("Error processing image");
                }
            }
        }

        const category = await Category.findOne({ name: productData.category });
        console.log("category is", category);

        if (!category) {
            return res.status(400).json("Invalid category name");
        }

        // Map variants with their processed images
        const variantsWithImages = variant.map((variantData, index) => ({
            color: variantData.color,
            colorName: variantData.colorName,
            size: variantData.size,
            stock: parseInt(variantData.stock, 10),
            price: parseFloat(variantData.price),
            productImage: processedImages[index] || []
        }));

        const newProduct = new Product({
            productName: productData.productName,
            description: productData.description,
            category: category._id,
            productOffer: productData.productOffer || 0,
            variants: variantsWithImages,
            status: productData.status || "Available",
            createdOn: new Date(),
        });

        await newProduct.save();
        return res.status(200).json({success: true, message: "product added successfully"});

    } catch (error) {
        console.error("Error while adding product:", error.message, error.stack);
        return res.status(500).json("Error adding product");
    }
};
  

// edit product

  // const editProduct = async (req, res) => {
  //   try {
      
  //     const id = req.params.id;

  //     console.log("edit product id is",id)
      
  //     const productData = req.body;
  //     console.log("edit product controller",productData);
  
  //     // Find the product by ID
  //     const product = await Product.findById(id);

  //     if (!product) {
  //       console.log("product not found")
  //       return res.status(404).send({success:false,message:"product not found"});
  //     }
  //     console.log("product in edut ",product)
  //     // Check if the updated product name already exists (excluding the current product)
  //     const existingProduct = await Product.findOne({
  //       productName: productData.productName,
  //       _id: { $ne:id },
  //     });
  //     if (existingProduct) {
  //       return res.status(400).send({success:false,message:"Product with this name already exists, please try with another name"});
  //     }
  
  //     const processedImages = product.productImage || []; // Retain existing images if no new ones are uploaded

  
  //     if (req.files && req.files.length > 0) {
  //       const uploadDirectory = path.join("public", "uploads", "product-images");
  
  //       // Ensure the upload directory exists
  //       if (!fs.existsSync(uploadDirectory)) {
  //         fs.mkdirSync(uploadDirectory, { recursive: true });
  //       }
  
  //       // Process new images
  //       for (let i = 0; i < req.files.length; i++) {
  //         const originalImagePath = req.files[i].path;
  //         const fileExtension = path.extname(req.files[i].originalname);
  //         const uniqueFileName = `${Date.now()}-${i}${fileExtension}`;
  //         const resizedImagePath = path.join(uploadDirectory, uniqueFileName);
  
  //         await sharp(originalImagePath)
  //           .resize({ width: 440, height: 440, fit: sharp.fit.cover })
  //           .sharpen({ sigma: 1.5 })
  //           .jpeg({ quality: 95 })
  //           .toColourspace("srgb")
  //           .toFile(resizedImagePath);
  
  //         processedImages.push(`/uploads/product-images/${uniqueFileName}`);
  //       }
  //       console.log("procressed images",processedImages);
        
  //     }
  //     const category = await Category.findOne({ name: productData.category });
  //     if (!category) {
  //       return res.status(400).send({success:false,message:"invalid category"});
  //     }
  
  //     // Update product details
  //     product.productName = productData.productName;
  //     product.description = productData.description;
  //     product.category = category._id;
  //     product.Price =  productData.regularPrice;
  //     product.quantity = productData.quantity;
  //     product.productImage = processedImages;
  //     console.log("changed image",product.productImage);
  //     product.status = "Available";
      
      
  //     await product.save();

  //     return res.json({ success: true, redirectUrl: "/admin/productpage" });
  //   // Redirect back to the products page
  //   } catch (error) {
  //     console.error("Error while editing product:", error.message,error.stack); 
  //   }
  // };

// Controller modification
// Backend controller modification
const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const productData = req.body;
        const uploadedFiles = req.files || [];
        
        console.log('Received removedImages:', productData.removedImages);
                   // Parse removedImages
        const removedImages = JSON.parse(productData.removedImages || '[]');
        console.log('Parsed removedImages:', removedImages);
   

        // Parse variants data
        const variants = JSON.parse(productData.variants);

        // Process variants and their images
        const processedVariants = await Promise.all(variants.map(async (variantData, index) => {
            let variantImages = [];

            // Handle existing images
            if (Array.isArray(variantData.productImage)) {
                variantImages = variantData.productImage.filter(img => 
                    img && 
                    !removedImages.includes(img)  // Only filter if removedImages exists
                );
            }

            // Handle new uploaded files
            const variantFiles = uploadedFiles.filter(file => 
                file.fieldname === `productImage[${index}]`
            );

            // Process new images
            for (const file of variantFiles) {
                try {
                    const filename = `${uuidv4()}.jpg`;
                    const filepath = path.join('public/uploads/product-images', filename);
                    
                    fs.mkdir(path.dirname(filepath), { recursive: true });
                    
                    await sharp(file.buffer)
                        .resize(440, 440, { fit: 'cover' })
                        .jpeg({ quality: 95 })
                        .toFile(filepath);
                    
                    const imagePath = `/uploads/product-images/${filename}`;
                    variantImages.push(imagePath);
                } catch (error) {
                    console.error('Error saving image:', error);
                }
            }

            return {
               ...variantData,
               productImage : variantImages,
            };
        }));

          // Update the product with new variants array
          const updatedProduct = await Product.findByIdAndUpdate(
            id,
            {
                $set: {
                    productName: productData.productName,
                    description: productData.description,
                    category: productData.category,
                    variants: variants,
                    status: variants.some(v => v.stock > 0) ? "Available" : "out of stock"
                }
            },
            { new: true }
        );
          // Clean up removed images from storage
          for (const removedImage of removedImages) {
            try {
                const imagePath = path.join('public', removedImage);
                if (fs.existsSync(imagePath)) {
                    await fs.promises.unlink(imagePath);
                }
            } catch (error) {
                console.error('Error removing image file:', error);
            }
        }

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: "Failed to update product"
            });
        }

        return res.json({
            success: true,
            message: "Product updated successfully"
        });

    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}; 



const loadEditProduct = async (req, res) => {
    try {
      const productId = req.query.id;
      const productDetails = await Product.findOne({ _id: productId }).populate('category',);
      console.log("product details",productDetails);
      
      const category = await Category.find();
      console.log("category in load edt",category);
      
      res.render("admin/editproduct", {
          details: productDetails,
         cat: category  
      });
    } catch (error) {
        console.error("Error loading products:", error);
        res.status(500).send("An error occurred while loading products.");
    }
};

// listed product pagination
const loadproduct = async (req, res) => {
    try {
       
        
      const page = parseInt(req.query.page) || 1; 
      const pageSize = 4;  
      const totalProducts = await Product.countDocuments();  
      const totalPages = Math.ceil(totalProducts / pageSize);  
  
      // Fetch data for the current page in descending order (e.g., by creation date)
      const products = await Product.find()
          .populate('category','name')
          .sort({ createdAt: -1 })  
          .skip((page - 1) * pageSize)
          .limit(pageSize);
          
        console.log("products in page render",products);
        

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
    editProduct,
}