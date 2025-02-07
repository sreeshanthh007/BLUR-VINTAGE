// addressSchema.js
const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    landMark: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    country:{
        type:String,
        required:true
    }
});

const Address = mongoose.model('Address', addressSchema);
module.exports = Address;