const mongoose = require('mongoose');
const {Schema} = mongoose;


const productSchema = new Schema({
    productName:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true,

    },
    Price:{
        type:Number,
        required:true
    },
    productOffer:{
        type:Number,
        default:0,
    },
    quantity:{
        type:Number,
        default:true
    },
    color:{
        type:String,
        required:true
    },
    colorName:{
        type:String,
        required:true
    },
    productImage:{
        type:[String],
        required:true,
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    status:{
        type:String,
        enum:["Available","out of stock","discontinued"],
        required:true,
        default:"Available"
    },
    createdOn:{
        type:Date,
        date:Date.now(),
    }
},{timestamps:true});

const product = mongoose.model("Product",productSchema);

module.exports = product;

