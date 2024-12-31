const users = require("../../models/userSchema");
const Address = require('../../models/adressSchema');


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




const getAddresses = async (req, res) => {
    try {
        const addresses = await Address.find({ userId: req.user._id });
        res.render('user/address', { addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const addAddress = async (req, res) => {
    try {
        const { name, street, city, state, pincode, phone } = req.body;
        const newAddress = new Address({
            userId: req.user._id,
            name,
            street,
            city,
            state,
            pincode,
            phone
        });
        await newAddress.save();
        res.redirect('/user/address');
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAddressById = async (req, res) => {
    try {
        const address = await Address.findOne({
            _id: req.params.id,
            userId: req.user._id
        });
        if (!address) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
        res.render('editAddress', { address });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateAddress = async (req, res) => {
    try {
        const { name, street, city, state, pincode, phone } = req.body;
        const updatedAddress = await Address.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { name, street, city, state, pincode, phone },
            { new: true }
        );
        if (!updatedAddress) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
        res.redirect('/user/address');
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const deletedAddress = await Address.findOneAndDelete({
            _id: req.params.id,
            userId: req.user._id
        });
        if (!deletedAddress) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};



module.exports={
    manage,
    updateDetails,
    getAddresses,
    addAddress,
    getAddressById,
    updateAddress,
    deleteAddress
}



