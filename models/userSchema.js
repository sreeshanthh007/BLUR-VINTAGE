const mongoose = require("mongoose");

const {schema} = mongoose;

const userSchema = mongoose.Schema({
   firstName:{
    type:String,
    required:true
   },

   lastName:{
    type:String,
    required:false
   },

   email:{
    type:String,
    required:true,
    unique:true,
    trim:true,
   },

   phoneNo:{
    type:String,
    required:false,
    unique:false,
    sparse:true,
    default:null
   },
   
   password:{
      type:String,
      required:false,
     },
   googleId:{
    type:String,
    unique:true ,
    required:false,
    sparse:true
   },
   referralCode: {
      type: String,
      unique: true,
      // required: true
     },
     referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: false
     },
     referralCount: {
      type: Number,
      default: 0
     },
   isBlocked:{
    type:Boolean,
    default:false
   },
   isAdmin:{
    type:Boolean,
    default:false
   },
});

const users = mongoose.model("Users",userSchema);

module.exports = users;