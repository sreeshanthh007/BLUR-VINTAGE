
const user = require("../../models/userSchema");
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");



const login = async (req,res)=>{
  try {
    const {email,password} = req.body;

    const admin = await user.findOne({email,isAdmin:true});
    console.log(admin)

    if(!admin){
        return res.status(500).json({success:false,message:"admin not found"});
    }
    const isMatch = await bcrypt.compare(password,admin.password);

    if(!isMatch){
        return res.json({success:false,message:"invalid mail or password"});
    }

    req.session.admin = admin._id;
    console.log("admin session",req.session.admin)

    return res.json({success:true,redirectUrl:"/admin/dashboard"}); 


  } catch (error) {
    console.log('error in admin login',error);
    
  }
}

const logOut = async (req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.log("cant destroy session",err);
            res.status(500).json({success:false,message:"failed to log out"});
        }
        res.clearCookie("connect-sid");
        return res.status(200).json({success:true});
       
    })
}

const blockUser = async (req,res)=>{
    try {
        let id = req.query.id;
        await user.updateOne({_id:id},{$set:{isBlocked:true}});

        res.redirect("/admin/userManage");
    } catch (error) {
        console.log("error in block user",error);
    }
}

const unblockUser = async (req,res)=>{
    try {
        let id = req.query.id;
        await user.updateOne({_id:id},{$set:{isBlocked:false}});
        res.redirect('/admin/userManage');

    } catch (error) {
        console.log("error in unblock user",error)
    }
}

const loadlogin =  (req,res)=>{
    try {
        if(req.session.admin){
            res.redirect("/admin/dashboard");
        }
        res.render('admin/adminlogin',{message:null});
    } catch (error) {
        console.log("error in admin loadlogin",error)
    }
}


const dashboard = (req,res)=>{
    try {
        if(req.session.admin){
            res.render("admin/adminDashboard");
        }
    } catch (error) {
        console.log("canoot go to dashboard")
    }
    
}
const userManage = (req,res)=>{
    res.render("admin/userManage");

}












module.exports ={
    loadlogin,
    dashboard,
    login,
    userManage,
    logOut,
    blockUser,
    unblockUser
}