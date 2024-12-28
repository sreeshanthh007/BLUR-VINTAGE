
const express = require('express');
const router = express.Router();
const passport = require('passport');
const users = require("../models/userSchema")

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google authentication callback
router.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/user/register', // If authentication fails, redirect to register page
}), async (req, res) => {
    const user = await users.findOne({googleId:req.user.googleId});
    if(user.isBlocked){
        return res.status(400).send("your account is blocked");
    }
    res.redirect('/user/home'); // On success, redirect to user home page
});


module.exports = router; 