const express = require('express');
const app =express();
const session = require('express-session');
const nocache = require('nocache');
const path = require('path');
const bodyparser = require('body-parser')
const passport = require('./config/passport.js')
const env = require('dotenv').config();
const mongodb = require('./config/mongodb');
const userRouter = require('./routes/userRoutes')
const adminRouter = require("./routes/adminRoutes.js")
const authRoutes = require('./routes/authroutes.js');

mongodb();


app.use(session({
    secret:'yourSecretKey',
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge: 20 * 60 * 1000
    }

}));

app.use(passport.initialize())
app.use(passport.session());

app.use(bodyparser.urlencoded({extended:true}))
app.use(express.json());
app.use(nocache());


app.set("view engine","ejs");

// app.set('views', [path.join(__dirname, 'views', 'user'), path.join(__dirname, 'views', 'admin')]);

app.set('views',[path.join(__dirname,"views")]);

app.use(express.static(path.join(__dirname,"public")));

// for user needs
app.use('/user',userRouter)
// for admin
app.use("/admin",adminRouter)
// for google authenication
app.use('/',authRoutes)

app.listen(process.env.PORT,()=>{
    console.log("server started")
});
module.exports = app;