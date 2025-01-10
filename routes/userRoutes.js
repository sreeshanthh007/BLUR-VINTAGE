
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const productController = require('../controllers/user/productdetails');
const userDetailscController = require("../controllers/user/userDetails")
const cartDetailsController = require("../controllers/user/cartController");
const orderDetailsController = require("../controllers/user/placeOrderController")
const {userAuth,adminAuth} = require('../middlewares/auth');
const { route } = require('./adminRoutes');

router.get('/register',userController.loadRegister);

router.post('/register',userController.signUp);

router.get('/otp-verification',userController.otp_verification)

router.post("/otp-verification",userController.verifyOTP);  

router.post("/resend-otp",userController.resent_otp);

router.get('/login',userController.loadLogin)

router.post('/login',userController.login);

router.post('/logout',userController.logOut);

router.get('/home',userController.loadHome);


router.get('/men',userController.loadmen);

router.get('/women',userController.loadWomen);

router.get('/kids',userController.loadKids)

router.get("/buy",productController.productDetails);

router.get("/manage",userDetailscController.manage)

router.post("/manage",userDetailscController.updateDetails)

// cart page
router.get("/cart",cartDetailsController.getCart);
// add to cart
router.post('/cart/add',cartDetailsController.addtoCart)
// remove products from cart
router.delete('/cart/remove/:id/:itemId',cartDetailsController.removeProducts);
// update quantity 
router.put("/cart/update-quantity",cartDetailsController.updateQuantity);

// checkout page
router.get("/checkout",cartDetailsController.checkout)
// manage address page
router.get("/address",userDetailscController.getAddress);
// show existing address in the checkout page
router.get("/addresses",cartDetailsController.addresses);

router.post("/addresses",cartDetailsController.addNewAddress);

router.post("/update-address",cartDetailsController.updateAddress)

// edit address page
router.get("/editAddress/:id",userDetailscController.editAddress);

// add address page
router.get("/addAddress",userDetailscController.loadAddAddress);
router.post("/addAddress",userDetailscController.addAddress);

// delete address
router.get("/deleteAddress",userDetailscController.deleteAddress);

// update address
router.put("/editAddress/:id",userDetailscController.updateAddress)

// searching
router.get("/search",userController.userSearch);

// thankYou page
router.get("/thankYou",userController.thankYou)

router.post('/order/place',orderDetailsController.placeOrder);




router.get("/managepassword",userController.managePassword)
router.get("/email-verification",userController.emailverification)
// router.post("/update-password",userController.updatePassword)
router.post("/email-verification",userController.otpForPassword);

router.get("/check-email",userController.checkYourGmail);
router.post("/check-email",userController.verifyResetPasswordOtp);
router.get("/reset-password",userController.setNewPassword)
router.post("/reset-password",userController.resetPassword)

router.get("/order-details",orderDetailsController.orderDetails);

router.post("/cancel-order/:orderId",orderDetailsController.cancelOrder)
module.exports = router;