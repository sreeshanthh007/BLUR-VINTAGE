const User = require('../../models/userSchema');
const Order = require('../../models/orderSchema')
const Product = require("../../models/productSchema")
const Wallet = require("../../models/walletSchema");
const { wallet } = require('../user/userDetails');

const getReturnRequests = async(req,res)=>{
    try {
       const pendingReturns = await Order.find({
        'orderItems.status.return.requested':true,
        'orderItems.status.return.status':"Pending"
       }).populate({
        path:"orderItems.product",
        model:"Product",
        select:"productName"
       });

       const approvedReturns = await Order.find({
        'orderItems.status.return.requested':true,
        'orderItems.status.return.status':"Approved"
       }).populate({
        path:"orderItems.product",
        model:"Product",
        select:"productNamw"
       })

       res.render('admin/returnManagement',{
        pendingReturns,
        approvedReturns
       });
    } catch (error) {
        
    }
}


const initiateReturn = async(req,res)=>{
    try {
        const {itemId,orderId} = req.params;
        const {reason} = req.body
        console.log("reasons and item id and orderid",reason,itemId,orderId)
        const order= await Order.findById(orderId);

        if(!order){
            return res.status(404).json({success:false,message:"order not found"})
        }

        const orderItem = order.orderItems.id(itemId);

        if(!orderItem){
            return res.status(404).json({success:false,message:"order item not found"})
        }

        orderItem.status.return={
            reason:reason,
            requested:true,
            requestDate:Date.now(),
            status:"Pending"
        };

        // chek if all the orders have returned
        const aLLItemsReturned = order.orderItems.every(
            item => item.status.itemStatus==="Delivered" &&
            item.status.return.requested
        )

        
        if(aLLItemsReturned){
            order.orderStatus="Returned"
        }

        await order.save();

        return res.status(200).json({success:true,message:"return submitted successfully"});

    } catch(error) {
        console.log("error in initiate return ",error.message)
    }
}

const approvedReturn = async(req,res)=>{
    try {
        const {orderId,itemId} = req.params;
       
        const order = await Order.findById(orderId);

        console.log("ordesr id",order)

        if(!order){
            return res.status(404).json({success:false,message:"order not found"})
        }
        
        const orderItem = order.orderItems.id(itemId);

        console.log("order item id",orderItem)

        if(!orderItem){
            return res.status(404).json({success:false,message:"order item not found"})
        }

        const itemPrice = orderItem.price.discountedPrice * orderItem.quantity;
        const totalOrderAmount = order.pricing.finalAmount;

        // Calculate proportional refund amount
        const refundAmount = (itemPrice * (totalOrderAmount / order.orderItems.reduce((total, item) => 
            total + (item.price.discountedPrice * item.quantity), 0)
        ));
        

        const product = await Product.findById(orderItem.product);

        if(product){
            const variant = product.variants.find(
                item => item.color === orderItem.variant.color &&
                item.size === orderItem.variant.size
               );            
            if(variant){
                variant.stock += orderItem.quantity;
                await product.save();
            }
        }
        orderItem.status.return.status = "Approved";

        const allItemsApproved = order.orderItems.every(
            item => item.status.return.requested && item.status.return.status=="Approved"
        )

        if(allItemsApproved){
            order.orderStatus="Returned"
        }

        let wallet = await Wallet.findOne({userId:order.userId});

        if(!wallet){
           wallet = new Wallet({
            userId:order.userId,
            balance:refundAmount
           }); 
        }else{
            wallet.balance += refundAmount
        }
        wallet.transactions.push({
            type:'Refund',
            amount:refundAmount,
            orderId:orderId,
            status:'Completed',
            description:`Partial refund for order ${order.orderNumber} - Item: ${product.productName}`,
        });

        await wallet.save();
        await order.save();

        return res.status(200).json({
            success: true, 
            message: "Partial return request approved and wallet credited",
            refundAmount: refundAmount
        });
    } catch (error) {
        console.log("error in approvedreturns",error.message)
    }
}
module.exports={
    getReturnRequests,
    initiateReturn,
    approvedReturn,

}