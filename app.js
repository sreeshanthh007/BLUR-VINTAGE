const express = require('express');
const app =express();
const session = require('express-session');
const nocache = require('nocache');
const path = require('path');
const passport = require('./config/passport.js')
const env = require('dotenv').config();
const mongodb = require('./config/mongodb');
const userRouter = require('./routes/userRoutes')
const authRoutes = require('./routes/authroutes.js')

mongodb();


app.use(session({
    secret:'yourSecretKey',
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge: 10 * 60 * 1000
    }

}));

app.use(passport.initialize())
app.use(passport.session());


app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(nocache());


app.set("view engine","ejs");

app.set('views', [path.join(__dirname, 'views', 'user'), path.join(__dirname, 'views', 'admin')]);

app.use(express.static(path.join(__dirname,"public")));

// for user needs
app.use('/user',userRouter)
// for google authenication
app.use('/',authRoutes)

app.listen(process.env.PORT,()=>{
    console.log("server started")
});

module.exports = app;