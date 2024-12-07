const express = require('express');
const app =express();
const path = require('path');
const env = require('dotenv').config();
const mongodb = require('./config/mongodb');
const userRouter = require('./routes/userRoutes')
mongodb();

app.use(express.json());
app.use(express.urlencoded({extended:true}))

app.set("view engine","ejs");

app.set("views",[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);

app.use(express.static(path.join(__dirname,"public")));


app.use('/user',userRouter)

app.listen(process.env.PORT,()=>{
    console.log("server started")
});

module.exports = app;