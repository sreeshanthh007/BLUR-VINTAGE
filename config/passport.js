const passport = require('passport');
const googleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema')
const env = require('dotenv').config();



passport.use(new googleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback',
    
},
async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if the user exists by Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
            return done(null, user); // User already exists, no need to create a new one
        }

        // Check if the email is already registered
       user = await User.findOne({ email: profile.emails[0].value });
        
        if (user) {
            return done(null, user); // Email already exists, log them in
        }

        // Create a new user if not found
        user = new User({
            firstName: profile.displayName, 
            email: profile.emails[0].value,
            googleId: profile.id,
        });

        await user.save(); // Save the new user
        return done(null, user); // Log in the newly created user


    } catch (error) {
        return done(error,null);

    }
}
));


 passport.serializeUser((user,done)=>{

    console.log("serialixe",user)
   return done(null,user.id);
})

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then((user) => done(null, user))
        .catch((err) => done(err, null));
});


module.exports = passport;
