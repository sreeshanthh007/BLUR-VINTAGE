const express = require('express');
const app =express();
const env = require('dotenv').config();
const mongodb = require('./config/mongodb');
mongodb();

app.listen(process.env.PORT,()=>{
    console.log("server started")
});

module.exports = app;