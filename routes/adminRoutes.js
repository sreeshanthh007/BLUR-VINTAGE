
const express = require("express");
const router = express.Router();
const admincontroller = require("../controllers/admin/adminController");;
const {userAuth,adminAuth} = require("../middlewares/auth");

router.get('/login',admincontroller.loadlogin);
router.post("/login",admincontroller.login);
router.get('/dashboard',adminAuth,admincontroller.dashboard)

router.get("/logout",admincontroller.logOut)

router.get('/userManage',adminAuth,admincontroller.userManage)










module.exports = router