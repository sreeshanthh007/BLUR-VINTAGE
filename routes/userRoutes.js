
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController');


router.get('/register',userController.loadRegister);
router.post('/register',userController.signUp);
router.get('/login',userController.loadLogin)

router.get('/home',userController.loadHome);

router.get('/otp-verification',userController.otp_verification)
router.post("/otp-verification",userController.verifyOTP);
router.get('/pagenotFound',userController.pagenotFound);








module.exports = router;