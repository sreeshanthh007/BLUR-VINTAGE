const passport = require('passport');
const googleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema')
const env = require('dotenv').config();



passport.use(new googleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:'/auth/google/callback',
},



async (accessToken,refreshToken,profile,done)=>{
    try {
        
        let user = await User.findOne({googleId:profile.id});

        if(user){
            return done(null,user);
        }else{

            user = new User({
            firstName:profile.displayName,
                email:profile.emails[0].value,
                googleId:profile.id,
            });
            await user.save();

            return (null,user)
        }

    } catch (error) {
        return done(null,error);

    }
}
));


 passport.serializeUser((user,done)=>{
    done(null,user.id);
})

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then((user) => done(null, user))
        .catch((err) => done(err, null));
});


module.exports = passport;
