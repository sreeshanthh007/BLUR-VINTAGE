const Cart = require("../../models/cartSchema");
const users = require("../../models/userSchema");
const Product = require("../../models/productSchema");



const  addtoCart = async(req,res)=>{
    try {
        const userId = req.session.user || req.session?.passport?.user;;
        if(!userId){
            return res.status(400).json({success:false,message:"user not authenicated"})
        }
        const {productId,quantity,color,colorName,size} = req.body;

        const product = await Product.findById(productId);
        
        if(!product){
            return res.status(400).json({success:false,message:"product not found"});
        }


          // Find the specific variant
          const variant = product.variants.find(v => 
            v.color === color && 
            v.colorName === colorName && 
            v.size === size
        );

        if(!variant){
            return res.status(400).json({success:false,message:"variant not found"});
        }

        if(variant.stock<quantity){
            return res.status(400).json({message:"not enough stock available",success:false});
        }

        let cart = await Cart.findOne({user:userId});

        if(!cart){
            cart = new Cart({user:userId,items:[],totalAmount:0});
        }

         // Check if product already exists in cart
         const existingItemIndex = cart.items.findIndex(item => 
            item.product.toString() === productId &&
            item.color === color &&
            item.size === size
        );

        if (existingItemIndex > -1) {
            // Check if adding more would exceed 5 items
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;
            if (newQuantity > 5) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Cannot add more than 5 items of the same product' 
                });
            }
            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            if (quantity > 5) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Cannot add more than 5 items of the same product' 
                });
            }
            // Add new item
            cart.items.push({
                product: productId,
                quantity,
                color,
                colorName,
                size,
                price: variant.price,
                discountedPrice: variant.price * (1 - (product.productOffer || 0) / 100),
                productImage: variant.productImage[0] // Using first image of the variant
            });
        }
        
        // calculate total amount
        cart.totalAmount = cart.items.reduce((total, item) => 
            total + (item.discountedPrice || item.price) * item.quantity, 0
        );
        await cart.save();
        return res.status(200).json({success:true,message:"product added to cart"})

    } catch (error) {
     console.log("error in add to cart",error.message);
        
    }
}

const getCart = async(req,res)=>{
        try {
            const userId = req.session?.user || req.session?.passport?.user;

            if(!userId){
                return res.redirect("/user/login");
            }
            const cart = await Cart.findOne({user:userId})
            .populate("items.product");
            
            res.render("user/addtoCart",{
                cart:cart || {items:[],totalAmount:0},
                deliveryCharge:148
            });

        } catch (error) {
         console.log("error in get cart",error.message);
            
        }
}

const removeProducts = async(req,res)=>{
    const userId = req.session.user || req.session?.passport?.user;
    const productId = req.params.id;

    const cart = await Cart.findOneAndUpdate(
        {user:userId},
        { $pull: { items: { product: productId } } },
        {new:true}
    )

    
    if (!cart) {
        return res.status(400).json({success: false, message: "Cart not found"});
    }
    return res.status(200).json({success:true,message:"product removed successfully"});
}

module.exports = {
    getCart,
    addtoCart,
    removeProducts,


}