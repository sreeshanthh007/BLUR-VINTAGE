
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');
const productController = require('../controllers/user/productdetails')

const {userAuth,adminAuth} = require('../middlewares/auth')

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



router.get('/manage',userController.manage);









module.exports = router;