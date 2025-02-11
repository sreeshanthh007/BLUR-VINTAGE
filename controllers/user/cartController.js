const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const users = require('../../models/userSchema')
const Address = require("../../models/adressSchema");
const Coupon = require('../../models/couponSchema');
const Wallet = require('../../models/walletSchema')
const { availableCoupons } = require("../admin/couponController");
const product = require("../../models/productSchema");




const addtoCart = async(req,res,next) => { 
    try {
        const userId = req.session.user || req.session?.passport?.user;
        if(!userId) {
            return res.status(400).json({success: false, message: "user not authenticated"});
        }
        
        const {productId, quantity, color, colorName, size} = req.body;

        const product = await Product.findById(productId)
          .populate('productOffer')
            .populate({
           path: 'category',
             populate: {
            path: 'categoryOffer'
        }
      });


        if(!product) {
            return res.status(400).json({success: false, message: "product not found"});
        }

        if(product.isBlocked){
            return res.status(400).json({success:false,message:"product is blocked by admin"})
        }

        // Find the specific variant
        const variant = product.variants.find(v => 
            v.color === color && 
            v.colorName === colorName && 
            v.size === size
        );

        if(!variant) {
            return res.status(400).json({success: false, message: "variant not found"});
        }  

        // Check if enough stock is available
        if(variant.stock < quantity) {
            return res.status(400).json({
                success: false, 
                message: `Only ${variant.stock} items available in stock`
            });
        }

        let cart = await Cart.findOne({user: userId});

        if(!cart) {
            cart = new Cart({user: userId, items: [], totalAmount: 0});
        }

        // Check if product already exists in cart
        const existingItemIndex = cart.items.findIndex(item => 
            item.product.toString() === productId &&
            item.color === color &&
            item.size === size
        );

        let totalQuantity = quantity;
        if (existingItemIndex > -1) {
            totalQuantity += cart.items[existingItemIndex].quantity;
        }

        // Check if total quantity exceeds limits
        if (totalQuantity > 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot add more than 5 items of the same product' 
            });
        }

        
    

            // Calculate discounted price with offers
        const now = new Date();
        let bestDiscount = 0;
        let offerName = "";
        let discountedPrice = variant.price;
        let originalPrice = variant.price;

        // Check product offer
        if (product.productOffer && 
            now >= product.productOffer.startDate && 
            now <= product.productOffer.expiryDate) {
            bestDiscount = product.productOffer.discount;
            discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
            offerName = product.productOffer.offerName;
        }

        // Check category offer if no product offer or category offer is better
        if (product.category?.categoryOffer &&
            now >= product.category.categoryOffer.startDate &&
            now <= product.category.categoryOffer.expiryDate) {
            const categoryDiscount = product.category.categoryOffer.discount;
            if (categoryDiscount > bestDiscount) {
                bestDiscount = categoryDiscount;
                discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
                offerName = product.category.categoryOffer.offerName;
            }
        }

        // Update or add cart item
        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity = totalQuantity;
        } else {
            cart.items.push({
                product: productId,
                quantity,
                color,
                colorName,
                size,
                price: originalPrice,
                discountedPrice: Math.round(discountedPrice),
                productImage: variant.productImage[0]
            });
        }
        
        // Recalculate total amount
        cart.totalAmount = cart.items.reduce((total, item) => 
            total + (item.discountedPrice || item.price) * item.quantity, 0
        );

        // Save cart
        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Product added to cart",
            newStock: variant.stock,
            cartTotal: cart.totalAmount,
            appliedOffer: offerName ? {
                name: offerName,
                discount: bestDiscount
            } : null
        });

    } catch (error) {
        console.log("error in add to cart", error);
        next(error)
    }
};

const getCart = async (req, res) => {
    try {
        const userId = req.session?.user || req.session?.passport?.user;

        if (!userId) {
            return res.redirect("/user/login");
        }

        // Sync cart prices before displaying
        await syncCartPrices(userId);

        const cart = await Cart.findOne({ user: userId })
            .populate({
                path: 'items.product',
                model: 'Product'
            });
        
            if (!cart) {
                return res.render('user/addtoCart', { cart: { items: [], totalAmount: 0 } });
            }
    
            console.log('Cart Items:', JSON.stringify(cart.items, null, 2)); // Debug log
            res.render('user/addtoCart', { cart });

    } catch (error) {
        console.log("error in get cart", error.message);
    }
};

const updateCartCounter = async(req,res)=>{
    try {
        const userId = req.session?.user || req.session?.passport?.user
        if(!userId){
            return res.json({count:0})
        }
        const cart = await  Cart.findOne({user:userId});

        let  count = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
        console.log("count is",count)
        res.status(200).json({success:true,count});
    } catch (error) {
        console.log("error in updateCartCounter",error.message);
    }
}

const removeProducts = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const itemId = req.params.itemId;

        const cart = await Cart.findOneAndUpdate(
            { user: userId },
            { 
                $pull: { 
                    items: { 
                        _id: itemId
                    } 
                } 
            },
            { new: true }
        ).populate({
            path: 'items.product',
            select: 'productName price'
        });

        if (!cart) {
            return res.status(400).json({
                success: false,
                message: "Cart not found"
            });
        }

        // Calculate total amount
        let totalAmount = 0;
        if (cart.items && cart.items.length > 0) {
            totalAmount = cart.items.reduce((total, item) => {
                const price = item.discountedPrice || item.price;
                return total + (price * item.quantity);
            }, 0);
        }

        // Update cart with new total
        cart.totalAmount = totalAmount;
        await cart.save();
        return res.status(200).json({
            success: true,
            message: "Product removed successfully",
            cart: {
                totalAmount: totalAmount,
                itemCount: cart.items.length
            }
        });
    } catch (error) {
        console.error('Error removing product from cart:', error);
        return res.status(500).json({
            success: false,
            message: "Error removing product from cart"
        });
    }
};
const updateQuantity = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        const { itemId, quantity } = req.body;

        if (quantity > 5) {
            return res.status(400).json({
                success: false,
                message: "Cannot add more than 5 items"
            });
        }

        const cart = await Cart.findOne({ user: userId });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: "Cart not found"
            });
        }

        // Find the cart item
        const cartItem = cart.items.find(item => item._id.toString() === itemId);
        if (!cartItem) {
            return res.status(404).json({
                success: false,
                message: "Item not found in cart"
            });
        }

        
        const product = await Product.findById(cartItem.product)
            .populate('productOffer')
            .populate({
                path: 'category',
                populate: { path: 'categoryOffer' }
            });

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        // Find the matching variant
        const variant = product.variants.find(v => 
            v.color === cartItem.color && 
            v.colorName === cartItem.colorName && 
            v.size === cartItem.size
        );

        if (!variant) {
            return res.status(404).json({
                success: false,
                message: "Product variant not found"
            });
        }

        if (variant.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${variant.stock} items available in stock`
            });
        }

        
        const now = new Date();
        let bestDiscount = 0;
        let discountedPrice = variant.price;
        let originalPrice = variant.price;

       
        if (product.productOffer && 
            now >= product.productOffer.startDate && 
            now <= product.productOffer.expiryDate) {
            bestDiscount = product.productOffer.discount;
            discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
        }

        
        if (product.category?.categoryOffer &&
            now >= product.category.categoryOffer.startDate &&
            now <= product.category.categoryOffer.expiryDate) {
            const categoryDiscount = product.category.categoryOffer.discount;
            if (categoryDiscount > bestDiscount) {
                bestDiscount = categoryDiscount;
                discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
            }
        }

        // Ensure discountedPrice is a valid number
        discountedPrice = Number.isNaN(discountedPrice) ? originalPrice : discountedPrice;
        discountedPrice = Math.round(discountedPrice);

        // Update quantity and prices
        cartItem.quantity = quantity;
        cartItem.price = originalPrice;
        cartItem.discountedPrice = discountedPrice;

        
        cart.totalAmount = cart.items.reduce((total, item) => {
            const itemPrice = Number(item.discountedPrice) || Number(item.price);
            const itemQuantity = Number(item.quantity);
            return total + (itemPrice * itemQuantity);
        }, 0);

        
        cart.totalAmount = Number.isNaN(cart.totalAmount) ? 0 : Math.round(cart.totalAmount);

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Quantity updated uccessfully",
            newTotal: (discountedPrice || originalPrice) * quantity,
            cartTotal: cart.totalAmount,
            itemPrice: discountedPrice || originalPrice,
            quantity: quantity,
            originalPrice: originalPrice,
            discountedPrice: discountedPrice
        });

    } catch (error) {
        console.error("Error in update quantity:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating quantity",
            errorDetails: error.message
        });
    }
};

//  for new prices and discounts to save
const syncCartPrices = async (userId) => {
    try {
        const cart = await Cart.findOne({ user: userId });
        if (!cart) return;

        let updated = false;
        
        for (const item of cart.items) {
            const product = await Product.findById(item.product)
                .populate('productOffer')
                .populate({
                    path: 'category',
                    populate: { path: 'categoryOffer' }
                });
            
            if (!product) continue;

            const variant = product.variants.find(v => 
                v.color === item.color && 
                v.colorName === item.colorName && 
                v.size === item.size
            );

            if (variant) {
                const now = new Date();
                const originalPrice = variant.price;
                let discountedPrice = originalPrice;
                let bestDiscount = 0;

                
                if (product.productOffer && 
                    now >= product.productOffer.startDate && 
                    now <= product.productOffer.expiryDate) {
                    bestDiscount = product.productOffer.discount;
                    discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
                }

                
                if (product.category?.categoryOffer &&
                    now >= product.category.categoryOffer.startDate &&
                    now <= product.category.categoryOffer.expiryDate) {
                    const categoryDiscount = product.category.categoryOffer.discount;
                    if (categoryDiscount > bestDiscount) {
                        bestDiscount = categoryDiscount;
                        discountedPrice = originalPrice - (originalPrice * (bestDiscount / 100));
                    }
                }

                
                discountedPrice = Math.round(discountedPrice);

                if (item.price !== originalPrice || item.discountedPrice !== discountedPrice) {
                    item.price = originalPrice;
                    item.discountedPrice = discountedPrice;
                    updated = true;
                }
            }
        }

        if (updated) {
            cart.totalAmount = cart.items.reduce((total, item) => 
                total + (item.discountedPrice || item.price) * item.quantity, 0
            );
            await cart.save();
        }
    } catch (error) {
        console.error("Error syncing cart prices:", error);
    }
};


const addresses = async(req,res)=>{
    try {
        const addresses = await Address.find({userId:req.session?.user || req.session?.passport?.user});

        res.json(addresses)
    } catch (error) {
        console.log("error in fetching address",error.message);
        
    }
}

const addNewAddress = async(req,res)=>{
   try {
    const addressData={
        ...req.body,
        userId:req.session?.user || req.session?.passport?.user
    };

    const newAddress = new Address(addressData);
    await newAddress.save();
    res.status(201).json(newAddress)
   } catch (error) {
    console.log("error in add new address",error.message);
    
   }
}

const updateAddress = async(req,res)=>{
    try {
        const {addressId} = req.body;
       
        
        const address = await Address.findById(addressId);
        console.log("address update",address);
        
        if (!address) {
            return res.status(404).json({ error: 'Address not found' });
        }
        
        // Update session
        req.session.selectedAddressId = addressId;
        console.log("session address",req.session.selectedAddressId);
        req.session.save((err)=>{
            if(err){
                console.log("error while saving session",err.message);
                return res.status(400).json({error:"failed to save session"});
            }
            res.json({success:true})
        });
        
    } catch (error) {
        console.log("error in updating address",error.message);
        res.status(500).json({ error: 'Failed to update address' });
    }
}
const checkout = async (req,res,next)=>{
    
    try {
        const userId = req.session?.user || req.session?.passport?.user;
        const selectedAddressId = req.session?.selectedAddressId
        const wallet = await Wallet.findOne({userId});
        const appliedCouponData = req.session?.appliedCoupon;

        const walletBalance = wallet ? wallet.balance : 0;
        const cart = await Cart.findOne({user:userId})
        .populate({
        path:"items.product",
        select:"productName variants isBlocked category",
        populate: {
            path: "category",
            select: "name isListed"
        }
        });

        if(!cart || cart.items.length===0){
            return res.redirect("/user/cart");
        }

        

        const blockedItems = cart.items.filter(item => item.product.isBlocked || !item.product?.category?.isListed);

        console.log("blocked products",blockedItems)


        if(blockedItems.length > 0){
            const blockedItemDetails = blockedItems.map(item =>{
                const reason = item.product?.isBlocked ? "product is blocked" : "category is blocked";

                return `${item.product.productName} (${reason})`
            })

            if (req.xhr) {
                return res.status(400).json({
                    success: false,
                    message: `The following items are no longer available: ${blockedItemDetails.join(', ')}`

                });
            }
        }

       

    

        const address  = selectedAddressId?
        await Address.findById(selectedAddressId):
        await Address.findOne({userId:userId});
        
        const currentDate = new Date();

        const allCoupons = await Coupon.find({});

      console.log("All coupons in DB:", allCoupons);



        const coupon = await Coupon.find({
            isActive:true,
            startDate:{$lte:currentDate},
            endDate:{$gte:currentDate},
            minimumOrderAmount:{$lte:cart.totalAmount},
            $expr: { $lt: ["$currentUsageCount", "$usageLimit"] }
        });


        


        if (req.xhr) {
            return res.json({
                success: true,
                redirectUrl: '/user/checkout',
                coupons:coupon
            });
        }


        console.log("cooupoon find",coupon)
        console.log("cart amount",cart.totalAmount);
        
       
        res.render("user/checkOutPage",{
            cart,
           address,
           coupons:coupon,
            pageTitle:"checkout",
            walletBalance
        });
    } catch (error) {
        next(error)
        console.log("error in load checkout",error.message)
    }
}







module.exports = {
    getCart,
    addtoCart,
    removeProducts,
    updateQuantity,
    checkout,
    addresses,
    addNewAddress,
    updateAddress,
    updateCartCounter,




}