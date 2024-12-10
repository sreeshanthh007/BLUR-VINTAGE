
const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}));

router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:"/register"}),(req,res)=>{
    res.redirect('/user/home')
})


module.exports = router;