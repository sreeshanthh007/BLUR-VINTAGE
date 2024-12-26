
const express = require('express');
const router = express.Router();
const passport = require('passport');

router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Google authentication callback
router.get('/auth/google/callback', passport.authenticate('google', {
    failureRedirect: '/user/register', // If authentication fails, redirect to register page
}), (req, res) => {
    res.redirect('/user/home'); // On success, redirect to user home page
});


module.exports = router;