// config/passport.js

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/userSchema.js';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/auth/google/callback'
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
                // Try to find user by Google ID
                let user = await User.findOne({ googleId: profile.id });

                if (user) {
                    return done(null, user);
                }

                // If not found by Google ID, check by email
                const email = profile.emails?.[0]?.value;
                if (email) {
                    user = await User.findOne({ email });
                    if (user) {
                        // Link Google account to existing user
                        user.googleId = profile.id;
                        await user.save();
                        return done(null, user);
                    }
                }

                // Create new user if neither Google ID nor email exists
                const newUser = new User({
                    firstName: profile.displayName || 'Google User',
                    email: email || null,
                    googleId: profile.id,
                    // You can optionally set a default lastName or leave it empty
                });

                user = await newUser.save();
                return done(null, user);
            } catch (error) {
                console.error("Error in Google Strategy:", error);
                return done(error, null);
            }
        }
    )
);

// Serialize user into session
passport.serializeUser((user, done) => {
    done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (error) {
        console.error("Error deserializing user:", error);
        done(error, null);
    }
});

export default passport;