const user = require("../../models/userSchema");



const userInfo = async (req,res)=>{
    try {
        let search="";
        if(req.query.search){
            search = req.query.search;
        }
        let page = 1;
       
        const limit =5;
        const userData = await user.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}}
            ],
        })

        .limit(limit*1)
        .skip((page-1)*limit)
        .exec();

        const count = await user.find({
            isAdmin:false,
            $or:[
                {name:{$regex:".*"+search+".*"}},
                {email:{$regex:".*"+search+".*"}}
            ],

        }).countDocuments();

        const totalPages = Math.ceil(count / limit);

        res.render("admin/userManage",{
            userData,
            currentPage:page,
            totalPages,
            search,
        });
    } catch (error) {
        console.log('error in userinfo',error);
        
    }
}


module.exports = {
    userInfo,
   

}