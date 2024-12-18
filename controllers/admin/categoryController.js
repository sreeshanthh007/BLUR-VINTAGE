
const Category = require("../../models/categorySchema");

const categoryInfo = async (req, res) => {
    console.log("category info page loaded")
    try {
        const page = parseInt(req.query.page) || 1; 
        const limit = 4;
        const skip = (page - 1) * limit;

        // Fetch category data with pagination
        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        console.log("categoryData:", categoryData); 

        const totalCategories = await Category.countDocuments();
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

        const existingCategory = await Category.findOne({name});

        if(existingCategory){
            return res.status(400).json({success:false,message:"the category already exist !"})
        }
        const newCategory = new Category({
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

const loadeditCategory = async (req,res)=>{
    try {
       console.log("djflskdjfsjf")
        const {editId} = req.params
        console.log("edit id",editId)

        const category = await Category.findById(editId)   // in find by id, it should give in () because the findbyid is a method that will deafult find the id. we dont give that in {()}
        console.log("load category",category)
        if(!category){
            console.log("cannot find load edit category ")
        }
        res.render("admin/editcategory",{category:category})
    } catch (error) {
        console.log("error in backend edit category");
        res.status(400);
        
    }
}
const editCategory = async (req,res)=>{
    try {
        const {categoryId} = req.params;
        console.log("edit category ",categoryId);
        const{name,description,isListed}=req.body

        console.log("name description,islisted",req.body)

        const updatedCategory = await Category.findByIdAndUpdate(
            categoryId,
            {name,description,isListed:isListed==="on"},
            {new:true}
        );

        if(!updatedCategory){
            console.log("updated category not found");
        }
        res.redirect('/admin/category')
    
    } catch (error) {
        console.log("error in updating category");
        res.status(400);
        
    }
}


toggler = async (req,res)=>{
    try {
        
        const {categoryId} = req.params;
        const {isListed} = req.body;
        console.log("islisted body",isListed)

       const upadteCategory =  await Category.findByIdAndUpdate(categoryId,{isListed:isListed},{new:true});
       if(!upadteCategory){
        res.status(400).json({success:false,message:"category not found"})
       }
        res.status(200).json({message:"changed !",
            success:true,
            upadteCategory
        });
    } catch (error) {
        console.log("error in backend toggler");
        res.status(400).json({message:"server error"});
        
    }
}




module.exports={
    addCategory,
    categoryInfo,
    toggler,
    loadeditCategory,
    editCategory
}