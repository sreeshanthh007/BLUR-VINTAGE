

const bcrypt = require('bcrypt');
const saltRound = 10;
const node_mailer = require('nodemailer')
const Users = require('../../models/userSchema');
const env = require('dotenv').config();
const Category = require('../../models/categorySchema');
const Product = require('../../models/productSchema');
const product = require('../../models/productSchema');

// generating otp
function generateOTP(){
    return Math.floor(100000 + Math.random()*900000).toString();
}


// sending verification email
async function sendVerificationEmail(email, otp) {
    try {
      const transport = node_mailer.createTransport({
        service: "Gmail",
        requireTLS: true,
        auth: {
          user: process.env.NODE_MAILER_EMAIL,
          pass: process.env.NODE_MAILER_PASSWORD, 
        },
        logger: true,
        debug: true, 
      });
  
      const htmlContent = `
        <div style="font-family: Joan, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px; max-width: 600px; margin: auto;">
          <h2 style="text-align: center; color:rgb(76, 91, 175);">Welcome to BLUR VINTAGE ⭐</h2>
          <p>Hello,</p>
          <p>Thank you for joining BLUR VINTAGE ⭐. Use the OTP below to verify your account:</p>
          <div style="text-align: center; margin: 20px 0;">
            <span style="font-size: 24px; font-weight: bold; background-color: #f4f4f4; padding: 10px 20px; border-radius: 5px; color: #333;">${otp}</span>
          </div>
          <p>If you did not request this, please ignore this email.</p>
          <footer style="margin-top: 20px; text-align: center; color: #aaa; font-size: 12px;">
            © 2025 BLUR VINTAGE ⭐. All rights reserved.
          </footer>
        </div>
      `;
  
      const info = await transport.sendMail({
        from: `"BLUR VINTAGE ⭐" <${process.env.NODE_MAILER_EMAIL}>`,
        to: email,
        subject: "Verify Your Account",
        text: `Your OTP is ${otp}`, // Fallback for plain text email
        html: htmlContent, // HTML version of the email
      });
  
      console.log("Email sent successfully:", info);
      return info.accepted && info.accepted.length > 0;
    } catch (err) {
      console.error("Error occurred while sending OTP:", err.message);
      console.error("Stack trace:", err.stack);
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
        return res.json({success:false , message:"the email is already in use"})
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
          
          delete req.session.userOTP;

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
                return res.render('user/login',{message:"Email  not found ! new user ? Register"})
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
            res.render('user/login',{message:"email already in use ! "});
            
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
        const message=req.query.message;
         res.render('user/login',{message});
    
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

const loadShop = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1; 
        const user = req.session?.user || req.session?.passport?.user
        const productsPerPage = 8; // 4 products per row * 2 rows
        const sortOption = req.query.sort || "default"
        const query = req.query.search
        const baseQuery={
            isBlocked:false,
        }

        let sortConfig={};

        switch(sortOption) {
            case 'price-high-low':
                sortConfig = {'variants.0.price': -1};
                break;
            case 'price-low-high':
                sortConfig = {'variants.0.price': 1};
                break;
            case 'name-a-z':
                sortConfig = { productName: 1 };
                break;
            case 'name-z-a':
                sortConfig = { productName: -1 };
                break;
            case 'new-arrivals':
                sortConfig = {createdOn: -1};
                break;
            default:
                sortConfig = {createdOn: -1};
                break;
        }
        
        
        const totalProducts = await Product.countDocuments({});
        const totalPages = Math.ceil(totalProducts / productsPerPage);
        
       
        const products = await Product.find(baseQuery)
        .lean()
        .select("productName variants")
        .sort(sortConfig)
            .skip((page - 1) * productsPerPage)
            .limit(productsPerPage)
            console.log("proddd",products);
            
        return res.render('user/shop', {
            products,
            currentPage: page,
            user,
            currentSort:sortOption,
            totalPages,
            search:query,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        });
    } catch (error) {
        console.error('Error loading shop:', error);
        return res.status(500).render('error', { message: 'Failed to load shop' });
    }
};
//  user homepage

const loadHome = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        let userData = null;

        if (userId) {
            userData = await Users.findOne({ _id: userId });
            console.log("loadhome user", userData);

            if (userData && userData.isBlocked) {
                console.log("user is blocked");
                return res.redirect("/user/register");
            }
        }

        return res.render("user/userhome", {
            isNewUser: !userId, // This will be true for new users (no session)
        });

    } catch (err) {
        console.log("page not found", err.message);
        res.status(500).send("server error")
    }
}

// user men page

const loadmen = async (req,res)=>{
    try {
        const user = req.session.user || req.session?.passport?.user;
        const sortOption = req.query.sort || "default";
        const page = parseInt(req.query.page) || 1;
        const productsPerPage = 8; 
        const query = req.query.search;

        const menCategory = await Category.findOne({isListed:true, name:"men"});

        if(!menCategory){
            return res.render("user/men",{
                products: [],
                currentSort: sortOption
            });
        }

        const baseQuery = {
            isBlocked: false,
            category: menCategory._id
        };

        let sortConfig = {};
        switch(sortOption){
            case 'price-high-low':
                sortConfig = {'variants.0.price': -1};
                break;
            case 'price-low-high':
                sortConfig = {"variants.0.price": 1};
                break;
            case 'name-a-z':
                sortConfig = { productName: 1 };
                break;
            case 'name-z-a':
                sortConfig = { productName: -1 };
                break;
            case 'new-arrivals':
                sortConfig = {createdOn: -1};
                break;
            default:
                sortConfig = {createdOn: -1};
                break;
        }

       
        const totalProducts = await Product.countDocuments(baseQuery);
        const totalPages = Math.ceil(totalProducts / productsPerPage);

        // Get paginated products
        const productData = await Product.find(baseQuery)
            .populate("category")
            .lean()
            .select("productName category variants")
            .sort(sortConfig)
            .skip((page - 1) * productsPerPage)
            .limit(productsPerPage);

        const renderOptions = {
            products: productData,
            currentSort: sortOption,
            user,
            currentPage: page,
            totalPages,
            search:query,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1
        };

        if(!user){
            return res.render('user/userlandingpage',renderOptions)
        }else{
            return res.render('user/userlandingpage',renderOptions)
        }

    } catch (error) {
        console.log("error in loadmen", error.message);
        return res.status(500).render('error', { message: 'An error occurred while loading products' });
    }
}
// women page
const loadWomen = async (req, res) => {
    try {
        const user = req.session.user || req.session?.passport?.user;
        const sortOption = req.query.sort || 'default';
        const page = (req.query.page) || 1;
        const productsPerPage = 8;
        const query = req.query.search


        // Find the "women" category
        const womenCategory = await Category.findOne({ isListed: true, name: "women" });
        if (!womenCategory) {
            return res.render("user/women", { 
                products: [],
                currentSort: sortOption 
            });
        }

        // Base query
        const baseQuery = {
            isBlocked: false,
            category: womenCategory._id,
        };

        // Determine sort configuration
        let sortConfig = {};
        switch (sortOption) {
            case 'price-high-low':
                sortConfig = { 'variants.0.price': -1 };
                break;
            case 'price-low-high':
                sortConfig = { 'variants.0.price': 1 };
                break;
            case 'name-a-z':
                sortConfig = { productName: 1 };
                break;
            case 'name-z-a':
                sortConfig = { productName: -1 };
                break;
            case 'new-arrivals':
                sortConfig = { createdOn: -1 };
                break;
            default:
                sortConfig = { createdOn: -1 }; // Default sorting
        }

        const totalProducts = await Product.countDocuments(baseQuery);
        const totalPages = Math.ceil(totalProducts/productsPerPage);

        const productData = await Product.find(baseQuery)
            .populate("category")
            .select("productName variants category")
            .sort(sortConfig)
            .lean()
            .skip((page - 1)*productsPerPage)
            .limit(productsPerPage)
            

        // Render the page with products and current sort option
        const renderOptions = {
            products: productData,
            currentSort: sortOption,
            user,
            currentPage : page,
            totalPages,
            search:query,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            nextPage: page + 1,
            prevPage: page - 1

        };

        if (user) {
            res.render("user/women", renderOptions);
        } else {
            res.render('user/women', renderOptions);
        }

    } catch (error) {
        console.log("error in loadwomen", error.message, error.stack);
        res.status(500).render('error', { message: 'Internal server error' });
    }
};
// kids page
const loadKids =async (req,res)=>{
  try {
    const user = req.session.user || req.session?.passport?.user;
    const sortOption = req.query.sort || "default";
    const productsPerPage = 8;
    const page = (req.query.page) || 1;
    const query = req.query.search

    const kidsCategory = await Category.findOne({isListed:true,name:"kids"});

    if(!kidsCategory){
        return res.render("user/kids",{
            products:[],
            currentSort:sortOption
        });
    }

    const baseQuery={
        isBlocked:false,
        category:kidsCategory._id
    };
    let sortConfig={};
    switch(sortOption){
        case 'price-low-high':
            sortConfig = {'variants.0.price':1};
            break;
        case 'price-high-low':
            sortConfig={'variants.0.price': -1};
            break;
        case 'name-a-z':
            sortConfig={productName: 1};
            break;
        case 'name-z-a':
            sortConfig={productName: -1};
            break;
        case 'new arrivals':
            sortConfig={createdOn: -1};
            break;
        default:
            sortConfig={createdOn: -1};
            break;
    }

    const totalProducts = await Product.countDocuments(baseQuery);
    const totalPages = Math.ceil(totalProducts/productsPerPage)
     const productData = await product
    .find(baseQuery)
    .populate("category")
    .lean()
    .select("variants productName category")
    .sort(sortConfig)
    .skip((page-1)*productsPerPage)
    .limit(productsPerPage)
    
    const renderOptions={
        products: productData,
        currentSort: sortOption,
        currentPage : page,
        user,
        totalPages,
        search:query,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page + 1,
        prevPage: page - 1
    };

    if(user){
        return res.render('user/kids',renderOptions)
    }else{
        return res.render("user/kids",renderOptions)
    }


     
  } catch (error) {
    console.log("error in kids",error.message);
    
  }
}  

// user search
const userSearch = async (req, res) => {    
    try {
        const query = req.query.search;
        const sort = req.query.sort || 'default';
        const isSuggestion = req.query.suggest === 'true';
        const category = req.query.category;
        const page_context = req.query.page_context;
        const page = parseInt(req.query.page) || 1;
        const productsPerPage = 8;

        // Create base search criteria
        const searchCriteria = {
            isBlocked: false,
        };

        // Only add search criteria if there's a search query
        if (query) {
            searchCriteria.$or = [
                { productName: { $regex: query, $options: 'i' } },
                { 'variants.sku': { $regex: query, $options: 'i' } }
            ];
        }

        // Add category filter if specified
        if (category) {
            const categoryDoc = await Category.findOne({ 
                isListed: true, 
                name: category.toLowerCase() 
            });
            if (categoryDoc) {
                searchCriteria.category = categoryDoc._id;
            }
        }

        // Create sort options
        let sortOptions = {};
        switch (sort) {
            case 'price-high-low':
                sortOptions = { 'variants.0.price': -1 };
                break;
            case 'price-low-high':
                sortOptions = { 'variants.0.price': 1 };
                break;
            case 'name-a-z':
                sortOptions = { productName: 1 };
                break;
            case 'name-z-a':
                sortOptions = { productName: -1 };
                break;
            case 'new-arrivals':
                sortOptions = { createdAt: -1 };
                break;
            default:
                sortOptions = { createdAt: -1 };
        }

        // For suggestions
        if (isSuggestion) {
            const products = await Product.find(searchCriteria)
                .sort(sortOptions)
                .limit(5)
                .populate('category')
                .lean();
            return res.json({ products, category });
        }

        // For full search with pagination
        const totalProducts = await Product.countDocuments(searchCriteria);
        const totalPages = Math.ceil(totalProducts / productsPerPage);

        const products = await Product.find(searchCriteria)
            .sort(sortOptions)
            .skip((page - 1) * productsPerPage)
            .limit(productsPerPage)
            .populate('category')
            .lean();

        // Determine template based on context
        let template;
        if (page_context === 'shop') {
            template = 'user/shop';
        } else if (category) {
            switch (category.toLowerCase()) {
                case 'men':
                    template = 'user/userlandingpage';
                    break;
                case 'women':
                    template = 'user/women';
                    break;
                case 'kids':
                    template = 'user/kids';
                    break;
                default:
                    template = 'user/userlandingpage';
            }
        } else {
            template = 'user/userlandingpage';
        }

        res.render(template, {
            products,
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            currentSort: sort,
            searchQuery: query,
            currentCategory: category,
            nextPage: page + 1,
            prevPage: page - 1,
            search:query,
        });

    } catch (error) {
        console.error('Search API error:', error);
        res.status(500).render('error', { 
            message: 'An error occurred while searching products' 
        });
    }
};


otp_verification =  (req,res)=>{
    return res.render('user/otp-verification');

}

const thankYou = async(req,res)=>{
    return res.render("user/orderConfirmpage")
}

const orderDetails = async(req,res)=>{
    return res.render("user/orderDetails")
}

const managePassword = async(req,res)=>{
    return res.render('user/managePassword')
}

 const updatePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.session.user

        const user = await Users.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log("usr in update password via google",user)
        // Compare with user's current hashed password
        const isValidPassword = await bcrypt.compare(oldPassword, user.password);
        
        if (!isValidPassword) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;
        await user.save();

        req.session.destroy(err => {
            if (err) {
                console.error("Error destroying session:", err);
                return res.status(500).json({ message: "Internal server error" });
            }

            
            return res.status(200).json({ message: "Password updated successfully", redirectUrl: "/user/login" });
        });

    } catch (error) {
        console.log("Error in update password:", error.message);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const otpStore = {};

const otpForPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "Email is required" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);

    otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

    console.log("otp store",otpStore);
    
    try {
        const isMailSent = await sendVerificationEmail(email, otp);
        if (!isMailSent) {
            return res.status(500).json({ message: "Failed to send OTP" });
        }
        return res.status(200).json({ message: "OTP sent successfully" });
    } catch (err) {
        console.error("Error sending OTP:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const checkYourGmail = (req,res)=>{
    return res.render("user/checkYourGmail")
}

const verifyResetPasswordOtp = async (req, res) => {
    console.log("hello",req.body);
    
    const { email, otp } = req.body; 

    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
    }

    const storedOtpDetails = otpStore[email]; 

    if (!storedOtpDetails) {
        return res.status(400).json({ message: "Expired or invalid OTP" });
    }

    const { otp: storedOtp, expiresAt } = storedOtpDetails;

   
    if (storedOtp !== parseInt(otp)) {
        return res.status(400).json({ message: "OTP does not match" });
    }

   
    if (expiresAt < Date.now()) {
        delete otpStore[email]; // Cleanup expired OTP
        return res.status(400).json({ message: "OTP has expired" });
    }

    // Successful verification
    delete otpStore[email]; // Cleanup after successful verification
    return res.status(200).json({ok:true, message: "OTP verified successfully" });
};

const resetPassword = async (req,res) => {
    console.log(req.body);
        
    const {newPassword,email} = req.body;

    if(!newPassword || !email){
        return res.status(400).json({message:"password or email is required"})
    }
    
    const hashedPassword = await bcrypt.hash(newPassword,10);


    try {
        const user = await Users.findOne({email:email});
        console.log("usesr",user)
        
        if(!user){
            return res.status(400).json({message:"user not found"})
        }
        user.password = hashedPassword;
        await user.save();
        return res.status(200).json({ok:true,message:"password reset successfully"})
    } catch (error) {   
        console.log("error in reset password",error.message);
        
    }
}

   const emailverification = (req,res)=>{
    return res.render('user/resetPassword')
   }


   const setNewPassword = (req,res)=>{
    return res.render("user/resetForgotPassword")
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
    logOut,
    loadWomen,
    loadKids,
    userSearch,
    thankYou,
   orderDetails,
    managePassword,
    updatePassword,
    otpForPassword,
    emailverification,
    checkYourGmail,
    verifyResetPasswordOtp,
    setNewPassword,
    resetPassword,
    loadShop,

   


   
}