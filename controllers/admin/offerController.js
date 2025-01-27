

    const Product = require("../../models/productSchema")
    const Category = require("../../models/categorySchema");
    const product = require("../../models/productSchema");
    const Offer = require('../../models/offerSchema')




            const loadOffer = async(req,res)=>{
                try {
                    const proudcts = await Product.find({},"productName");
                    const categories = await Category.find({},"name");

                    return res.render('admin/offerAddPage',{
                        products:proudcts,
                        categories:categories
                    })
                } catch (error) {
                    console.log("error",error.message);
                    
                }
            }


            const getItemByType = async(req,res)=>{
                try {
                    const {type} = req.query;
                    if(type=="product"){
                        const proudcts = await product.find({
                            isBlocked:false, 
                        })
                    res.json(proudcts)
                    }else if(type === "category"){
                        const categories = await Category.find({
                            isListed:true,
                        });
                        res.json(categories)
                    }else{
                        res.status(400).json({message:"not valid type"})
                    }
                } catch (error) {
                    console.log("error",error.message);
                    
                }
            }


            const addOffer = async(req,res)=>{
                try {
                const { offerName, discount, type, itemId, startDate, expiryDate } = req.body;


                console.log("heyllo addoffer",itemId,type   )

                if(offerName=="" || discount=="" || type=="" || startDate=="" || expiryDate==""){
                    return res.status(400).json({success:false,message:"all fields are required"});
                }

                const newOffer = new Offer({
                    offerName,
                    discount,
                    type,
                    startDate,
                    expiryDate
                });

                if(type === "product"){
                    newOffer.productId = itemId;
                } else if (type === "category") {
                    newOffer.categoryId = itemId;
                }

                const savedOffer = await newOffer.save();

                if(type==="product"){
                    const product = await Product.findById(itemId);

                    if(product){
                        product.productOffer = savedOffer._id;
                    
                        await product.save();
                    }
                } else if (type === 'category') {
                    const category = await Category.findById(itemId);
                    if (category) {
                        category.categoryOffer = savedOffer._id;
                        await category.save();
                    }
                }

                res.json({ success: true, message: 'Offer added successfully!' });

                } catch (error) {
                    console.log("error in adding offer",error.message)
                }
            }
            module.exports={
                loadOffer,
                getItemByType,
                addOffer,
            }