
const express = require('express');
const  router = express.Router();
const invoiceController = require('../controllers/user/invoiceController')
const userController = require('../controllers/user/userController');
const productController = require('../controllers/user/productdetails');
const userDetailscController = require("../controllers/user/userDetails")
const cartDetailsController = require("../controllers/user/cartController");
const orderDetailsController = require("../controllers/user/placeOrderController");
const wishlistController = require('../controllers/user/wishlilstController')
const {userAuth,adminAuth} = require('../middlewares/auth');

router.get('/register',userController.loadRegister);

router.post('/register',userController.signUp);

router.get('/otp-verification',userController.otp_verification)

router.post("/otp-verification",userController.verifyOTP);  

router.post("/resend-otp",userController.resent_otp);

router.get('/login',userController.loadLogin)

router.post('/login',userController.login);

router.post('/logout',userController.logOut);

router.get('/shop',userController.loadShop)

router.get('/home',userController.loadHome);


router.get('/men',userController.loadmen);

router.get('/women',userController.loadWomen);

router.get('/kids',userController.loadKids)

router.get("/buy",userAuth,productController.productDetails);

router.get("/manage",userAuth,userDetailscController.manage)

router.post("/manage",userDetailscController.updateDetails)

// cart page
router.get("/cart",userAuth,cartDetailsController.getCart);

router.get("/cart/count",userAuth,cartDetailsController.updateCartCounter)
// add to cart
router.post('/cart/add',cartDetailsController.addtoCart)
// remove products from cart
router.delete('/cart/remove/:id/:itemId',cartDetailsController.removeProducts);
// update quantity 
router.put("/cart/update-quantity",cartDetailsController.updateQuantity);

router.get('/wishlist',userAuth,wishlistController.getWishlist);

router.post('/wishlist/add',wishlistController.addToWishlist);
// for checking the wishlist status
router.get("/wishlist/check-status",wishlistController.wishlistStatus)

// for counting items in the wishlist
router.get('/wishlist/count',wishlistController.wishlistCounter)
// removing product from wishlist
router.delete("/wishlist/remove-product/:productId",wishlistController.removeProduct);

router.get('/wishlist-products/:productId',userAuth,wishlistController.getProductDetails);

router.post('/wishlist-to-cart',wishlistController.wishlistToCart)
// checkout page
router.get("/checkout",userAuth,cartDetailsController.checkout)
// manage address page
router.get("/address",userAuth,userDetailscController.getAddress);
// show existing address in the checkout page
router.get("/addresses",userAuth,cartDetailsController.addresses);

router.post("/addresses",cartDetailsController.addNewAddress);

router.post("/update-address",cartDetailsController.updateAddress)

// edit address page
router.get("/editAddress/:id",userDetailscController.editAddress);

// add address page
router.get("/addAddress",userDetailscController.loadAddAddress);

router.post("/addAddress",userDetailscController.addAddress);

// wallet details
router.get('/wallet',userDetailscController.wallet);

    router.post("/wallet/add",userDetailscController.addMoney)
// delete address
router.get("/deleteAddress",userDetailscController.deleteAddress);

// update address
router.put("/editAddress/:id",userDetailscController.updateAddress)

// searching
router.get("/search",userController.userSearch);

// thankYou page
router.get("/thankYou",userAuth,userController.thankYou);


// retry payment;
router.post('/retry-payment/:orderId',orderDetailsController.retryPayment);
router.post('/retry-payment-verification',orderDetailsController.retryPaymentVerification)

router.post('/order/place',orderDetailsController.placeOrder);
router.post('/applyCoupon',orderDetailsController.applyCoupon);

router.post("/order/verify-payment",orderDetailsController.verifyPayment)
router.post('/order/payment-failed',orderDetailsController.verifyPaymentFailure)




router.get("/managepassword",userController.managePassword)
router.get("/email-verification",userController.emailverification)
router.patch("/update-password",userController.updatePassword)
router.post("/email-verification",userController.otpForPassword);

router.get("/check-email",userController.checkYourGmail);
router.post("/check-email",userController.verifyResetPasswordOtp);
router.get("/reset-password",userController.setNewPassword)
router.post("/reset-password",userController.resetPassword)

router.get("/order-details",orderDetailsController.orderDetails);

router.post("/cancel-order-item/:orderId/:itemId",orderDetailsController.cancelOrder);
router.post("/cancel-all/:orderId",orderDetailsController.cancelAllOrder);



// invoice

router.get('/download-invoice/:orderId',userAuth,invoiceController.downloadInvoice)


module.exports = router;