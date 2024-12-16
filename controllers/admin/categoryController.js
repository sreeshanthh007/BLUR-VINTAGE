
const category = require("../../models/categorySchema");


const categoryInfo = async (req,res)=>{
    try {
        const page = req.query.page || 1;
        const limit =4;
        const skip = (page-1)*limit;
        
        const categoryData = await category.find({})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(limit)

        const totalCategories = await category.countDocuments();
        const totalpages = Math.ceil(totalCategories/limit);

        res.render('admin/category',{
            cat:categoryData,
            currentPage : page,
            totalpages:totalpages,
            totalCategories:totalCategories
        })
    } catch (error) {
        console.log("error in category info",error);

    }

}

const addCategory = async(req,res)=>{
    try {
        const {name,description} = req.body;

        const existingCategory = await category.findOne({name});

        if(existingCategory){
            return res.status(400).json({success:false,message:"the category already exist !"})
        }
        const newCategory = new category({
            name,
            description
        });
        await newCategory.save();
        return res.json({message:"category added successfully"});

    } catch (error) {
        console.log('error in add category',error)
        return res.status(400).json({error:"internal server error"});       
    }

}
const loadCategory = (req,res)=>{
    res.render('admin/categorymanage');
}


module.exports={
    loadCategory,
    addCategory
}