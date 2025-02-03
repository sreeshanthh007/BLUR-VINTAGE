                const mongoose = require('mongoose');
                const { Schema } = mongoose;

                const offerSchema = new Schema({
                    offerName: {
                        type: String,
                        required: true,
                    },
                    type: {
                        type: String,
                        enum: ['product', 'category'],
                        required: true
                    },
                    discount: {
                        type: Number,
                        required: true,
                        min: 0,
                        max: 100
                    },
                    productId: {
                        type: Schema.Types.ObjectId,
                        ref: 'Product',
                        default: null
                    },
                    categoryId: {
                        type: Schema.Types.ObjectId,
                        ref: 'Category',
                        default: null
                    },
                    startDate: {
                        type: Date,
                        required: true
                    },
                    expiryDate: {
                        type: Date,
                        required: true
                    },
                }, { timestamps: true });

                const Offer = mongoose.model('Offer', offerSchema);

                module.exports = Offer;