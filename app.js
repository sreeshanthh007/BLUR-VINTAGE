const express = require('express');
const app =express();
const session = require('express-session');
const nocache = require('nocache');
const flash = require("connect-flash")
const path = require('path');
const bodyparser = require('body-parser')
const passport = require('./config/passport.js')
const env = require('dotenv').config();
const override  = require("method-override")


const mongodb = require('./config/mongodb');
const userRouter = require('./routes/userRoutes')
const adminRouter = require("./routes/adminRoutes.js")
const authRoutes = require('./routes/authroutes.js');
const adminAccess = require("./middlewares/auth.js")

mongodb();


app.use(session({
    secret: process.env.session_secret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if you're using https
        httpOnly: true,
        maxAge: 3600000 // 1 hour in milliseconds
    },
    rolling: true,

}));


app.use(nocache());
app.use(passport.initialize())
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
    res.locals.messages = req.flash();  // This makes the flash messages available in templates
    next();
});
app.use(bodyparser.urlencoded({extended:true}))
app.use(override('_method'))

app.use(express.json({limit:'50mb'}));





app.set("view engine","ejs");



app.set('views',[path.join(__dirname,"views")]);

app.use(express.static(path.join(__dirname,"public")));



// for user needs
app.use('/user',userRouter)
// for admin
app.use("/admin",adminRouter)
// prevent users  accessing admin

app.use("/admin",adminAccess.adminAuth)
app.use("/user",adminAccess.userAuth)

// for google authenication
app.use('/',authRoutes)

// to handle the errors
app.use((err,req,res,next)=>{

    console.log("this is the error stack",err.stack);

    res.status(err.status || 500).render("error", { 
        message: err.message || "Internal Server Error"
    });

})

app.listen(process.env.PORT,()=>{
    console.log("server started")
});
module.exports = app;