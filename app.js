const express = require('express');
const app =express();
const session = require('express-session');
const nocache = require('nocache');
const path = require('path');
const env = require('dotenv').config();
const mongodb = require('./config/mongodb');
const userRouter = require('./routes/userRoutes')

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
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(nocache());

app.set("view engine","ejs");

app.set('views', [path.join(__dirname, 'views', 'user'), path.join(__dirname, 'views', 'admin')]);

app.use(express.static(path.join(__dirname,"public")));


app.use('/user',userRouter)

app.listen(process.env.PORT,()=>{
    console.log("server started")
});

module.exports = app;