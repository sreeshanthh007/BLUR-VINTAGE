// routes/userRoutes.js

import express from 'express';
import userController from '../controllers/user/userController.js';
import productController from '../controllers/user/productdetails.js';
import userDetailsController from "../controllers/user/userDetails.js";
import cartDetailsController from "../controllers/user/cartController.js";
import orderDetailsController from "../controllers/user/placeOrderController.js";
import wishlistController from '../controllers/user/wishlilstController.js';
import invoiceController from '../controllers/user/invoiceController.js';
import { userAuth } from '../middlewares/auth.js';

const router = express.Router();

// ==================== Public Routes ====================
router.get("/aboutUs", userController.loadAboutUs);
router.get('/shop', userController.loadShop);
router.get('/home', userController.loadHome);
router.get('/men', userController.loadmen);
router.get('/women', userController.loadWomen);
router.get('/kids', userController.loadKids);
router.get("/search", userController.userSearch);

router.route('/register')
.get(userController.loadRegister)
.post(userController.signUp);

router.route('/otp-verification')
.get(userController.otp_verification)
.post(userController.verifyOTP);

router.post("/resend-otp", userController.resent_otp);


router.route('/login')
.get(userController.loadLogin)
.post(userController.login);

router.post('/logout', userController.logOut);

// ==================== Protected Routes (userAuth required) ====================

router.get("/buy", userAuth, productController.productDetails);

router.route("/manage")
  .get(userAuth, userDetailsController.manage)
  .post(userAuth, userDetailsController.updateDetails);

// Cart Routes
router.get("/cart", userAuth, cartDetailsController.getCart);
router.get("/cart/count", userAuth, cartDetailsController.updateCartCounter);
router.post('/cart/add', userAuth, cartDetailsController.addtoCart);
router.delete('/cart/remove/:id/:itemId', userAuth, cartDetailsController.removeProducts);
router.put("/cart/update-quantity", userAuth, cartDetailsController.updateQuantity);

// Wishlist Routes
router.get('/wishlist', userAuth, wishlistController.getWishlist);
router.post('/wishlist/add', userAuth, wishlistController.addToWishlist);
router.get("/wishlist/check-status", userAuth, wishlistController.wishlistStatus);
router.get('/wishlist/count', userAuth, wishlistController.wishlistCounter);
router.delete("/wishlist/remove-product/:productId", userAuth, wishlistController.removeProduct);
router.get('/wishlist-products/:productId', userAuth, wishlistController.getProductDetails);
router.post('/wishlist-to-cart', userAuth, wishlistController.wishlistToCart);

// Checkout & Address Routes
router.get("/checkout", userAuth, cartDetailsController.checkout);

router.route("/addresses")
  .get(userAuth, cartDetailsController.addresses)
  .post(userAuth, cartDetailsController.addNewAddress);

router.post("/update-address", userAuth, cartDetailsController.updateAddress);
router.get("/address", userAuth, userDetailsController.getAddress);
router.get("/editAddress/:id", userAuth, userDetailsController.editAddress);

router.route("/addAddress")
  .get(userAuth, userDetailsController.loadAddAddress)
  .post(userAuth, userDetailsController.addAddress);

router.get("/deleteAddress", userAuth, userDetailsController.deleteAddress);
router.put("/editAddress/:id", userAuth, userDetailsController.updateAddress);

// Wallet
router.route('/wallet')
  .get(userAuth, userDetailsController.wallet)
  .post(userAuth, userDetailsController.addMoney);

// Order & Payment Routes
router.get("/thankYou", userAuth, userController.thankYou);
router.post('/order/place', userAuth, orderDetailsController.placeOrder);
router.post('/applyCoupon', userAuth, orderDetailsController.applyCoupon);
router.post("/order/verify-payment", userAuth, orderDetailsController.verifyPayment);
router.post('/order/payment-failed', userAuth, orderDetailsController.verifyPaymentFailure);
router.post('/retry-payment/:orderId', userAuth, orderDetailsController.retryPayment);
router.post('/retry-payment-verification', userAuth, orderDetailsController.retryPaymentVerification);
router.get("/order-details", userAuth, orderDetailsController.orderDetails);
router.post("/cancel-order-item/:orderId/:itemId", userAuth, orderDetailsController.cancelOrder);
router.post("/cancel-all/:orderId", userAuth, orderDetailsController.cancelAllOrder);

// Password Management
router.get("/managepassword", userAuth, userController.managePassword);
router.get("/email-verification", userController.emailverification);
router.patch("/update-password", userAuth, userController.updatePassword);
router.post("/email-verification", userController.otpForPassword);

router.route("/check-email")
  .get(userController.checkYourGmail)
  .post(userController.verifyResetPasswordOtp);

router.route("/reset-password")
  .get(userController.setNewPassword)
  .post(userController.resetPassword);

// Invoice
router.get('/download-invoice/:orderId', userAuth, invoiceController.downloadInvoice);

export default router;