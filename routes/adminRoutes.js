
const express = require("express");
const router = express.Router();
const admincontroller = require("../controllers/admin/adminController");
const userManageController = require("../controllers/admin/customerController")
const categoryController = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController')
const multer = require('multer');
const upload = multer();
const {userAuth,adminAuth} = require("../middlewares/auth");

router.get('/login',admincontroller.loadlogin);
router.post("/login",admincontroller.login);
router.get('/dashboard',adminAuth,admincontroller.dashboard)

router.get("/logout",admincontroller.logOut)

router.get('/userManage',adminAuth,userManageController.userInfo);

router.get('/blockUser',adminAuth,admincontroller.blockUser )
router.get('/unblockUser',adminAuth,admincontroller.unblockUser);

router.get('/category',adminAuth,categoryController.categoryInfo);

router.post('/category',adminAuth,upload.none(),categoryController.addCategory);

router.post('/category/toggle/:categoryId',adminAuth,categoryController.toggler)
router.get('/editcategory/:editId',categoryController.loadeditCategory)
router.post('/editcategory/:categoryId',categoryController.editCategory)     


router.get('/productpage',productController.loadproduct)
router.get('/addproduct',productController.addproduct)









module.exports = router