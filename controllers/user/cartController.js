const Cart = require("../../models/cartSchema");
const Product = require("../../models/productSchema");
const users = require('../../models/userSchema')
const Address = require("../../models/adressSchema")

const addtoCart = async(req,res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        if(!userId) {
            return res.status(400).json({success: false, message: "user not authenticated"});
        }
        
        const {productId, quantity, color, colorName, size} = req.body;

        const product = await Product.findById(productId);
        if(!product) {
            return res.status(400).json({success: false, message: "product not found"});
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

        
    

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity = totalQuantity;
        } else {
            cart.items.push({
                product: productId,
                quantity,
                color,
                colorName,
                size,
                price: variant.price,
                discountedPrice: variant.price * (1 - (product.productOffer || 0) / 100),
                productImage: variant.productImage[0]
            });
        }

       
        
        // Calculate total amount
        cart.totalAmount = cart.items.reduce((total, item) => 
            total + (item.discountedPrice || item.price) * item.quantity, 0
        );

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Product added to cart",
            newStock: variant.stock,
            cartTotal: cart.totalAmount
        });

    } catch (error) {
        console.log("error in add to cart", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to add product to cart",
            error: error.message
        });
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
            .populate("items.product");
        
        res.render("user/addtoCart", {
            cart: cart || { items: [], totalAmount: 0 },
            deliveryCharge: 148
        });

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

        if (quantity > 6) {
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

        // Fetch the current product data to get updated price
        const product = await Product.findById(cartItem.product);
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

        if(variant.stock < quantity) {
            return res.status(400).json({
                success: false,
                message: `Only ${variant.stock} items available in stock`
            });
        }
        // Update quantity and prices
        cartItem.quantity = quantity;
        cartItem.price = variant.price;
        cartItem.discountedPrice = variant.price * (1 - (product.productOffer || 0) / 100);

        // Recalculate total amount with updated prices
        cart.totalAmount = cart.items.reduce((total, item) => 
            total + (item.discountedPrice || item.price) * item.quantity, 0
        );

        await cart.save();

        return res.status(200).json({
            success: true,
            message: "Quantity and price updated successfully",
            newTotal: (cartItem.discountedPrice || cartItem.price) * quantity,
            cartTotal: cart.totalAmount,
            itemPrice: cartItem.discountedPrice || cartItem.price,
            quantity: quantity
        });

    } catch (error) {
        console.error("Error in update quantity:", error);
        return res.status(500).json({
            success: false,
            message: "Error updating quantity"
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
            const product = await Product.findById(item.product);
            if (!product) continue;

            const variant = product.variants.find(v => 
                v.color === item.color && 
                v.colorName === item.colorName && 
                v.size === item.size
            );

            if (variant) {
                const newPrice = variant.price;
                const newDiscountedPrice = newPrice * (1 - (product.productOffer || 0) / 100);

                if (item.price !== newPrice || item.discountedPrice !== newDiscountedPrice) {
                    item.price = newPrice;
                    item.discountedPrice = newDiscountedPrice;
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
        console.log("addrses id",addressId);
        
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
        
        // Send back the address details
        // res.json({
        //     success: true,
        //     address: address
        // });
    } catch (error) {
        console.log("error in updating address",error.message);
        res.status(500).json({ error: 'Failed to update address' });
    }
}
const checkout = async (req,res)=>{
    
    try {
        const userId = req.session?.user || req.session?.passport?.user;
        const selectedAddressId = req.session.req.session?.selectedAddressId
        const cart = await Cart.findOne({user:userId})
        .populate({
        path:"items.product",
        select:"productName variants"
        });
        if(!cart || cart.items.length===0){
            return res.redirect("/user/cart");
        }

        const address  = selectedAddressId?
        await Address.findById(selectedAddressId):
        await Address.findOne({userId:userId});

        

        const deliveryCharge=148;
        res.render("user/checkOutPage",{
            cart,
            deliveryCharge,
           address,
            pageTitle:"checkout"
        });
    } catch (error) {
        console.log("error in checkout page",error.message);
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