const mongoose = require('mongoose');
const env = require('dotenv').config();

const mongodb = async()=>{
    try{
        await mongoose.connect(process.env.mongodb_url);
        console.log('connected');
    }catch(err){
        console.log('failed to connect mongodb',err.message);
        process.exit(1);
    }
}

module.exports = mongodb;