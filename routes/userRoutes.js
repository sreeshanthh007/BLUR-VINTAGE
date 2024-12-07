
const express = require('express');
const router = express.Router();
const userController = require('../controllers/user/userController')

router.get('/register',userController.loadRegister);
router.get('/login',userController.loadLogin)

router.get('/home',userController.loadHome);

router.get('/pagenotFound',userController.pagenotFound);






module.exports = router;