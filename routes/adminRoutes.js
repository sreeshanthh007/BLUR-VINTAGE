
const express = require("express");
const router = express.Router();
const admincontroller = require("../controllers/admin/adminController");
const userManageController = require("../controllers/admin/customerController")
const categoryController = require('../controllers/admin/categoryController')
const {userAuth,adminAuth} = require("../middlewares/auth");

router.get('/login',admincontroller.loadlogin);
router.post("/login",admincontroller.login);
router.get('/dashboard',adminAuth,admincontroller.dashboard)

router.get("/logout",admincontroller.logOut)

router.get('/userManage',adminAuth,userManageController.userInfo);

router.get('/blockUser',adminAuth,admincontroller.blockUser )
router.get('/unblockUser',adminAuth,admincontroller.unblockUser);

router.get('/category',adminAuth,categoryController.loadCategory);

router.get('/addcategory',adminAuth,categoryController.addCategory);











module.exports = router