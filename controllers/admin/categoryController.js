
const category = require("../../models/categorySchema");


const categoryInfo = async (req, res) => {
    console.log("category info page loaded")
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 4;
        const skip = (page - 1) * limit;

        // Fetch category data with pagination
        const categoryData = await category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        console.log("categoryData:", categoryData); 

        const totalCategories = await category.countDocuments();
        const totalpages = Math.ceil(totalCategories / limit);

        res.render('admin/categorymanage', {
            Category: categoryData, 
            currentPage: page,
            totalpages: totalpages,
            totalCategories: totalCategories
        });
    } catch (error) {
        console.error("Error in categoryInfo:", error);
        res.status(500).send("Internal Server Error");
    }
};


const addCategory = async(req,res)=>{
    try {
        console.log("add category body",req.body);
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
        return res.json({success:true,message:"category added successfully"});      
        

    } catch (error) {
        console.log('error in add category',error)
        return res.status(400).json({error:"internal server error"});       
    }

}

module.exports={
    addCategory,
    categoryInfo
}