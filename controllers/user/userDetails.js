const users = require("../../models/userSchema");



// user profile
const manage= async (req,res)=>{
    try {
        const userId = req.session.user || req.session?.passport?.user;;
    if(!userId){
        return res.render("user/userManage",{user:null})
    }
    const userData = await users.findOne({_id:userId});
    console.log("this is user data",userData)
    if(userData){
        res.render('user/userManage',{user:userData});
    }else{
        res.render("user/userManage")
    }
    } catch (error) {
        console.log("errror in user manage",error.message)
    }
}

// profile update controller
const updateDetails = async(req,res)=>{
   try {
    console.log("body in update details",req.body);
    
    const {firstName,lastName,phoneNo,email} = req.body;

     const updateUserDetails = await users.findOneAndUpdate(
      { email: email },  // Search by email
      { 
        firstName:firstName,
        lastName: lastName,       // Fields to update
        phoneNo: phoneNo 
      },
      { new: true }               // Option to return the updated document
    );

    if(updateUserDetails){
        res.status(200).json({success:true,message:"details updated successfully"});
    }else{
        res.status(404).json({success:false,message:"user not found"})
    }
   } catch (error) {
    console.log("error in update user details",error);
    
   }

}

// manage address
const getAddress = async (req,res)=>{
    return res.render("user/addressManage");
}

// edit address
const editAddress = async(req,res)=>{
    return res.render('user/editAddress');
}

// add address

const addAddress = async(req,res)=>{
    return res.render("user/addAddress");
}

module.exports={
    manage,
    updateDetails,
    getAddress,
    editAddress,
    addAddress,
}




