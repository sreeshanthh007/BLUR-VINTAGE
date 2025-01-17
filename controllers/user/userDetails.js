const users = require("../../models/userSchema");
const address = require("../../models/adressSchema");


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
    if(firstName==""|| phoneNo=="" || email==""){
        return res.status(400).json({success:false,message:"all fields are required to be filled"});
    }

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
        res.status(200).json({success:true,message:"details updated successfully",redirectUrl:"/user/manage"});
    }else{
        res.status(404).json({success:false,message:"user not found"})
    }
   } catch (error) {
    console.log("error in update user details",error);
    
   }

}

// manage address
const getAddress = async (req,res)=>{
    try {
        const addresses = await address.find({userId:req.session.user || req.session?.passport?.user});

        return res.render('user/addressManage',{addresses})
    } catch (error) {
        
    }
}


// add address

const addAddress = async(req,res)=>{
    
    try {
        console.log("user id in add address",req.session.user || req.session.passport.user);

        const userID = req.session?.user || req.session?.passport?.user
        
        console.log("addrsss",req.body);
        
        const {name,phone,landMark,city,state,pincode,country}=req.body;

        console.log("extracted",{name,phone,landMark,city,state,pincode});
        
        if(!name || !phone || !landMark ||  !city || !pincode || !country){
            return res.status(400).json({success:false,message:"all fields are required"})
        }

        if (!userID) {
            return res.status(401).json({
              success: false,
              message: "User not authenticated"
            });
          }

        const addressSAVE = new address({
            userId: userID,
            name,
            phone,
            landMark,
            city,
            state,
            pincode,
            country

        });
        await addressSAVE.save();
        return res.status(200).json({success:true,message:"address added successfully",redirectUrl:"/user/address"});

    } catch (error) {
        console.log("error in  add address",error.message);
    }

  
}
    // passing data to edit address
   const editAddress = async(req,res)=>{
  try {
    const editAddressId = req.params.id;
console.log("editaddressid",editAddressId);

    if(!editAddressId){
        return res.redirect("/user/address");
    }
    const addressData = await address.findById(editAddressId);
    if(!addressData){
        return res.redirect("/user/address")
    }
    return res.render("user/editAddress",{addressData})
  } catch (error) {
    console.log("error in edit address",error.message);
  }
}

// updating address
const updateAddress = async (req,res)=>{
  try {
    const id = req.params.id;
    console.log("update address id",id);
    const updateData = req.body;
    console.log("update address data",updateData);
    

    const updateAddress = await address.findByIdAndUpdate(
        id,
        updateData,
        {new:true}
    );

    if(!updateAddress){
        return res.status(400).json({success:false,message:"address not found"});
    }
    return res.status(200).json({success:true,message:"address updated successfully",redirectUrl:"/user/address"});
  } catch (error) {
     console.log("error in update address",error.message);
  }
}

const loadAddAddress = async(req,res)=>{
    if(req.session?.user || req.session?.passport?.user){
        return res.render("user/addAddress");
    }else{
        return res.redirect("/user/login")
    }
   
}


// delete address

const deleteAddress = async(req,res)=>{
    try {
        const addressId = req.query.id;
        console.log("addressid",addressId);
        
     await address.findByIdAndDelete(addressId);

     return res.redirect("/user/address")

    } catch (error) {
        console.log("error while deleteing address",error.message);
    }

}
module.exports={
    manage,
    updateDetails,
    getAddress,
    editAddress,
    addAddress,
    loadAddAddress,
    deleteAddress,
    updateAddress,

}




