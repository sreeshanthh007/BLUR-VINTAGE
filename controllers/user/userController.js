

const bcrypt = require('bcrypt');
const saltRound = 10;
const node_mailer = require('nodemailer')
const user = require('../../models/userSchema');
const env = require('dotenv').config();


// generating otp
function generateOTP(){
    return Math.floor(1000 + Math.random()*900000).toString();
}


// sending verification email
async function sendVerificationEmail(email,otp){

    try{
        const transport = node_mailer.createTransport({
            service:"Gmail",
            port:587,
            requireTLS:true,
            secure:false,
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

        return info.accepted.length>0

    }catch(err){
        console.log('error occured while sending otp',err);
        return false;
    }
}



// signup post
const signUp = async (req,res)=>{
   try {
    const { firstName,lastName,phoneNo,email,password,confirm_password} = req.body;
    console.log("body",req.body)

    if(password!==confirm_password){

        return res.render('register',{message:"passwords do not match"})

    }
    const findUser = await user.findOne({email});
    console.log("user",findUser)

    if(findUser){
        return res.render('register',{message:"user with this email already exists"});
    }
  
    const otp = generateOTP();
    console.log('checking',otp);
   

    req.session.userOTP = otp;
    req.session.userData = {firstName,lastName,email,phoneNo,password};
    const emailsent = await sendVerificationEmail(email,otp);
    
    if(!emailsent){
       return  res.send("email-error");
    }
    // const hashedpassword =  await bcrypt.hash(password,saltRound);


    res.redirect('/user/otp-verification');

    console.log("OTP IS :",otp);


   } catch (error) {
    console.log("error occured in register");
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
      const {verifyotp}  = req.body;

      console.log(verifyotp)
      console.log('session-otp',req.session.userOTP)

      // Check if OTP matches the session's OTP
      if (verifyotp == req.session.userOTP) {
        const User = req.session.userData;
        const passwordHash = await securePassword(User.password);

        
  
        // Save the user to the database
        const saveUser = new User({
          firstName: User.firstName,
          lastName: User.lastName,
          email: User.email,
          phoneNo: User.phoneNo,
          password: passwordHash,
        });
       
        await saveUser.save();

          // Set the user ID in the session
          req.session.user = saveUser._id;
          console.log('session user',req.session.user) 
  
       
  
        // Send success response with redirect URL
        return res.json({ success: true, redirectUrl: "/user/userhome" });
      } else {
        // OTP doesn't match
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
  
      // Send error response to the client
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  };
// user login

loadLogin = async (req,res)=>{
    try{
        return res.render('login')
    }catch(err){
        console.log('login page not found');
        res.status(500).send("server error")
    }
}
// user register 
loadRegister = async (req,res)=>{
    try{
        return res.render('register');
    }catch(err){
        console.log("register not found");
        res.status(500).send("server error");
    }
}

 
//  user homepage

loadHome = async (req,res)=>{
    try{
        return res.render('userhome');
    }catch(err){
        console.log("page not found");
        res.status(500).send("server error")
    }
}
// page not found

pagenotFound = (req,res)=>{
    try{
        return res.render("notFound")
    }catch(err){
        console.log("page not found");
        res.redirect('/pagenotFound')
    }
}
otp_verification =  (req,res)=>{
    return res.render('otp-verification');

}



module.exports={
    loadRegister,
    loadLogin,
    loadHome,
    pagenotFound,
    signUp,
    otp_verification,
    verifyOTP,
   
}