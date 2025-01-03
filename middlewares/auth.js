
const user = require("../models/userSchema");

const userAuth = async (req,res,next)=>{
    try {
        if(req.session.user || req.session?.passport?.user){
            return next();
           }else{
            res.redirect("/user/login");
        }
    } catch (error) {
        console.log('error in user middleware',error)
        res.status(500).send("server error");   
    }
}
const adminAuth = async (req, res, next) => {
    try {
        const isAdmin = req.session.admin;
        if (isAdmin) {
             next();
        } else {
            res.redirect("/admin/login");
        }
    } catch (err) {
        console.error("Error in admin middleware:", err);
        res.status(500).send("Internal server error");
    }
};


module.exports = {
    userAuth,
    adminAuth
}