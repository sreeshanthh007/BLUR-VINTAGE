

const bcrypt = require('bcrypt');
const saltRound = 10;
const node_mailer = require('nodemailer')
const Users = require('../../models/userSchema');
const env = require('dotenv').config();
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');


// generating otp
function generateOTP(){
    return Math.floor(100000 + Math.random()*900000).toString();
}


// sending verification email
async function sendVerificationEmail(email,otp){

    try{
        const transport = node_mailer.createTransport({
            service:"Gmail",
            requireTLS:true,
            auth:{
                user:process.env.NODE_MAILER_EMAIL,
                pass:process.env.NODE_MAILER_PASSWORD
                
            },
            logger:true,
            debug:true
           
            
        })
        const info = await transport.sendMail({
            from:"BLUR VINTAGE ★",
            to:email,
            subject:"verify your account",
            text:`YOUR OTP IS ${otp}`,
            html:`<b> your OTP is : ${otp} </b>` 
            
            
        })

        console.log("Email send response:", info);
        return info.accepted && info.accepted.length > 0;

    }catch(err){
        console.log('error occured while sending otp',err.message,err.stack);
        return false;
    }
}



// signup post
const signUp = async (req,res)=>{
   try {
    const { firstName,phoneNo,email,password,lastName} = req.body;
    

    const findUser = await Users.findOne({email});
    console.log("user",findUser)

    if(findUser){
        return res.json({success:false , message:"user with this email already exists"})
    }

    const otp = generateOTP();
    console.log('checking',otp);
   

    req.session.userOTP = otp;
    req.session.userData = {firstName,lastName,email,phoneNo,password};
    const emailsent = await sendVerificationEmail(email,otp);
    
    if(!emailsent){
       return res.send("email-error");
    }
    // const hashedpassword =  await bcrypt.hash(password,saltRound);


  
    console.log("OTP IS :",otp);    

    return res.status(200).json({success:true,redirectUrl:"/user/otp-verification"});



   } catch (error) {
    console.log("error occured in register",error.message);
    res.status(500).send("error occured");
   }
}




const securePassword = async (password)=>{
    try {
        const hashedPassword = await bcrypt.hash(password,saltRound);

        return hashedPassword;
    } catch (error) {
        console.log(error);
        
    }
}
// for verifying

const verifyOTP = async (req, res) => {
    try {
        console.log("key value otp",req.body);
        
    const ReceivedOTP = Object.values(req.body).join('');

      console.log("Received OTP:",ReceivedOTP);


      console.log('session-otp',req.session.userOTP)

      // Check if OTP matches the session's OTP
      if (ReceivedOTP == req.session.userOTP) {
        const User = req.session.userData;
      

        console.log("user",User)
        
        const passwordHash = await securePassword(User.password);
        
  
        // Save the user to the database
        const saveUser = new Users({
          firstName: User.firstName,
          lastName: User.lastName,
          email: User.email,
          phoneNo: User.phoneNo,
          password: passwordHash,
        });
       console.log("saved",saveUser)
        await saveUser.save();

          // Set the user ID in the session
          req.session.SavedUser = saveUser._id;
          console.log('session user',req.session.user) 

        res.json({success:true,redirectUrl:"/user/login"})
      
    } else {
        // OTP doesn't match
        return res.json({ success: false, message: "Invalid OTP" });
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
  
      // Send error response to the client
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  };


// resent otp

  const resent_otp = async(req,res)=>{
   try {
    const {email} = req.session.userData;
    if(!email){
        return res.status(400).json({success:false,message:"email not found in session"});
    }
    const resendOTP = generateOTP();
    req.session.userOTP = resendOTP;
    
    const emailsent = await sendVerificationEmail(email,resendOTP);

    if(emailsent){
        console.log("reseent otp",resendOTP)

        res.status(200).json({success:true,message:"otp resent successfully"});
    }else{
        res.status(400).json({success:false,message:"failed to send resent otp"});
    }
   } catch (error) {
    console.log("error while resent otp",error);
    res.status(400).json({success:false,message:"failed to resent otp"});
   }
  }


// user login







const login = async (req,res)=>{
    try {
        const {email,password} = req.body;

        const findUser = await Users.findOne({isAdmin:0,email:email});

        if(!findUser){
            return res.render('user/login',{message:"user not found"})
        }
        if(findUser.isBlocked){
            return res.render('user/login',{message:"user is blocked by admin"});
        }

        const passwordMatch =   await bcrypt.compare(password,findUser.password);

        if(!passwordMatch){
            return res.render('user/login',{message:"password didnt match"});
        }
        req.session.user = findUser._id
        console.log('login user',req.session.user)

        res.redirect("/user/home");

    }catch(error) {
        console.log("error while login",error);
        res.render('user/login',{message:"login failed please try again"});
        
    }

}
const logOut = async (req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log('session destruction error',err);
                return res.status(500).json({success:false,message:"failed to log out"}); 
            }
            res.clearCookie('connect.sid')
            res.json({success:true});
        });
    } catch (error) {
        console.log('logout error',error);
        res.redirect("/user/notFound");
        
    }
}

const loadLogin = async (req,res)=>{
   try{
         res.render('user/login');
    
   }catch(err){
    console.log(err);
    
   }
}
// user register 
loadRegister = async (req,res)=>{
    try{
        return res.render('user/register');
    }catch(err){
        console.log("register not found");
        res.status(500).redirect("/user/notFound");

    }
}

 
//  user homepage

const loadHome = async (req,res)=>{
    try{
        const userId = req.session.user || req.session?.passport?.user;
        let userData = null;
       

        if(userId){
            userData = await Users.findOne({_id:userId});
            console.log("loadhome user",userData);

            if(userData && userData.isBlocked){
                console.log("user is blocked");
                return res.redirect("/user/register");
            }
        }
        if(!userData){
            return res.render("user/userhome");
        }else{
            return res.render("user/userhome",)
        }

      
    }catch(err){
        console.log("page not found",err.message);

        res.status(500).send("server error")

    }
}

// user men page

const loadmen = async (req,res)=>{
 
    
    try {
        const user = req.session.user;

        // Find the "men" category
        const menCategory = await Category.findOne({ isListed: true, name: "men" });
        if (!menCategory) {
            // If the "men" category is not found, render an empty list
            return res.render("user/userlandingpage", { products: [] });
        }

        // Fetch products for the "men" category
        const productData = await Product.find({
            isBlocked: false,
            category: menCategory._id, // Filter by "men" category ID
            quantity: { $gt: 0 },      // Only include products with quantity > 0
        });
        // productData = productData.slice(0,4);
        if(user){
            const userData = await Users.findOne({_id:user._id});
            console.log("loadmen",userData);
            res.render('user/userlandingpage',{
                data:userData,
                products:productData,
    
            })
        }else{
            res.render('user/userlandingpage',{
                products:productData
            })
        }
    } catch (error) {
    console.log("error in loadmen",error.message)
  }
}
// women page
const loadWomen =  async (req,res)=>{

    try {
        const user = req.session.user;

        // Find the "women" category
        const womenCategory = await Category.findOne({ isListed: true, name: "women" });
        if (!womenCategory) {
            // If the "women" category is not found, render an empty list
            return res.render("user/women", { products: [] });
        }

        // Fetch products for the "women" category
        const productData = await Product.find({
            isBlocked: false,
            category: womenCategory._id, // Filter by "women" category ID
            quantity: { $gt: 0 },        // Only include products with quantity > 0
        });
    if(user){
        res.render("user/women",{
            products:productData
        })
    }else{
        res.render('user/women',{
            products:productData
        });
    }
   } catch (error) {
    console.log("error in loadwomen",error.message,error.stack);
    
   }
}
// kids page
const loadKids =async (req,res)=>{
  try {
    const user = req.session.user;
    const kidsCategory = await Category.findOne({isListed:true,name:"kids"});
    if(!kidsCategory){
        return res.render('user/kids',{products:[]});
    }
    const productData = await Product.find({
        isBlocked:false,
        category:kidsCategory._id,
        quantity:{$gt:0}
    });

    if(user){
        res.render('user/kids',{
            products:productData
        })
    }else{
        res.render("user/kids",{
            products:productData
        });
    }
  } catch (error) {
    
  }
}  

otp_verification =  (req,res)=>{
    return res.render('user/otp-verification');

}
manage= async (req,res)=>{
    try {
        const userId = req.session.user || req.session?.passport?.user;;
    console.log("user id",userId)
    const userData = await Users.findOne({_id:userId});
    console.log("this is user data",userData)
    if(userId){
        res.render('user/userManage',{user:userData});
    }else{
        res.render("user/userManage")
    }
    } catch (error) {
        console.log("errror in user manage",error.message)
    }
}



module.exports={
    loadRegister,
    loadLogin,
    loadHome,
    signUp,
    otp_verification,
    verifyOTP,
    loadmen,
    resent_otp,
    login,
    manage,
    logOut,
    loadWomen,
    loadKids,
   
   
}