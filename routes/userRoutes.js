
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');


router.get('/register',userController.loadRegister);
router.post('/register',userController.signUp);
router.get('/otp-verification',userController.otp_verification)
router.post("/otp-verification",userController.verifyOTP);  
router.post("/resend-otp",userController.resent_otp);
router.get('/login',userController.loadLogin)
router.post('/login',userController.login);
router.post('/logout',userController.logOut);

router.get('/home',userController.loadHome);    
router.get('/pagenotFound',userController.pagenotFound);

router.get('/men',userController.loadmen);

router.get('/manage',userController.manage);








module.exports = router;