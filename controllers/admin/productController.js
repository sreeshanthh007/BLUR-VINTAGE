

const Product = require('../../models/productSchema');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const User = require('../../models/userSchema');
const Category = require('../../models/categorySchema');


const getProductAddpage = async (req,res)=>{
    try {
        const category = await Category.find({isListed:true});
        res.render('admin/addproduct',{
            cat:category
        });
    } catch (error) {
        console.log("error in product controller");  
        
    }
}

const addProducts = async (req,res)=>{
    try {
        const products = req.body;
        const productExists = await Product.findOne({
            producttName:products.productName,

        });

        if(productExists){
            const images=[];

            if(req.files && req.files.length>0){
                for(let i=0;i<req.files.length;i++){
                    const originnalImagePath = req.files[i].path
                }
            }
        }
    } catch (error) {
        
    }
}



const loadproduct = (req,res)=>{
    res.render("admin/productpage")
}

const addproduct = (req,res)=>{
    res.render('admin/addproductpage')
}
module.exports = {
    loadproduct,
    addproduct
}