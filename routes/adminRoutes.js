
const express = require("express");
const router = express.Router();
const admincontroller = require("../controllers/admin/adminController");
const userManageController = require("../controllers/admin/customerController")
const categoryController = require('../controllers/admin/categoryController');
const productController = require('../controllers/admin/productController');
const returnController = require('../controllers/admin/orderReturnController');
const couponController = require("../controllers/admin/couponController");
const OfferController = require('../controllers/admin/offerController')
const multer = require('multer');
const upload = multer();
const {v4:uuidv4} = require('uuid');
const {userAuth,adminAuth} = require("../middlewares/auth");



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/product-images');
    },
    filename: function (req, file, cb) {
        const ext = file.originalname.split('.').pop(); // Extract file extension
        cb(null, `${uuidv4()}.${ext}`); // Unique filename
    }
});
const newUploads = multer({
    storage: multer.memoryStorage(), // stores the memory good gor processing with sharp
    fileFilter: function(req, file, cb) {
        // Accept images only
        if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)) {
            req.fileValidationError = 'Only image files are allowed!';
            return cb(null, false);
        }
        cb(null, true);
    }
}).any();

// admin login starts
router.get('/login',admincontroller.loadlogin);
router.post("/login",admincontroller.login);
// admin login ends

// dashboard starts
router.get('/dashboard',adminAuth,admincontroller.dashboard)
// dashboard ends

// admin logout
router.get("/logout",admincontroller.logOut)
// admin logout ends

// usermanage starts
router.get('/userManage',adminAuth,userManageController.userInfo);
// user manage ends

// blocking and unblocking user starts
router.get('/blockUser',adminAuth,admincontroller.blockUser )
router.get('/unblockUser',adminAuth,admincontroller.unblockUser);
// blocking and unblocking ends

// category starts
router.get('/category',adminAuth,categoryController.categoryInfo);

router.post('/category',adminAuth,upload.none(),categoryController.addCategory);

router.post('/category/toggle/:categoryId',adminAuth,categoryController.toggler)

router.get('/editcategory/:editId',categoryController.loadeditCategory)

router.post('/editcategory/:categoryId',categoryController.editCategory)     
// category ends

// loadingg the productpage 
router.get('/productpage',adminAuth,productController.loadproduct)
// adding the product
router.get('/addproduct',adminAuth,productController.loadAddCategory);
// also adding the product
router.post('/addproduct',adminAuth,newUploads,productController.addProducts)


// block and unblock product
router.get('/blockProduct',productController.blockProduct);

router.get('/unblockProduct',productController.unBlockProduct);
// block and unblock product ends

// edit product
router.get('/editproduct',productController.loadEditProduct);

router.post('/editproduct/:id',newUploads,productController.editProduct);

router.get("/order-list",adminAuth,admincontroller.orderList);

router.get("/order-details",adminAuth,admincontroller.orderDetails);

router.get("/update-order-status",adminAuth,admincontroller.updateOrderStatus)

router.get('/manageOrder',adminAuth,returnController.getReturnRequests);

router.get('/coupons',adminAuth,couponController.couponPage);

// for adding coupons
router.post("/addcoupons",couponController.addCoupon)
// for getting the return requests  with details
router.post('/return-order-item/:orderId/:itemId',returnController.initiateReturn);

router.delete('/removeCoupon',couponController.deleteCoupon);
router.get('/available-coupons',couponController.availableCoupons)


router.get("/addOffer",adminAuth,OfferController.loadOffer);
router.get("/offers/items",OfferController.getItemByType);

router.post("/offers/add",OfferController.addOffer)

// for approving the returned items
router.put("/returns/:orderId/:itemId/approve",returnController.approvedReturn);


router.get("/sales-report",adminAuth,admincontroller.getSalesReport)











module.exports = router