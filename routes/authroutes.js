// routes/authroutes.js

import express from 'express';
import passport from 'passport';
import User from "../models/userSchema.js";

const router = express.Router();


router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


router.get('/auth/google/callback', 
    passport.authenticate('google', {
        failureRedirect: '/user/register'
    }),
    async (req, res) => {
        try {
            const user = await User.findOne({ googleId: req.user.googleId });

            if (user && user.isBlocked) {
                return res.status(403).render('user/login', { 
                    message: "Your account has been blocked by the admin. Please contact support." 
                });
            }

            res.redirect('/user/home');
        } catch (error) {
            console.error("Error in Google callback:", error);
            res.status(500).send("Authentication error");
        }
    }
);

export default router;