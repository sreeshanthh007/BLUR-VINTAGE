

const User = require("../models/userSchema");

const userAuth = async (req, res, next) => {
    try {
        if (req.session?.user || req.session?.passport?.user) {
            const userId = req.session?.user?.id || req.session?.passport?.user?.id;

            try {
                const user = await User.findById(userId);
                if (user && user.isBlocked) {
                    req.session.destroy((err) => {
                        if (err) {
                            console.error("Error while destroying session:", err.message);
                        }
                        res.clearCookie("connect.sid"); 
                        
                        return res.redirect("/user/login"); 
                    });
                } else {
                    return next();
                }
            } catch (error) {
                console.error("Error in userAuth while fetching user:", error.message);
                return res.status(500).send("Internal server error.");
            }
        } else {
            next(); // Proceed if no session exists
        }
    } catch (error) {
        console.error("Error in userAuth middleware:", error.message);
        return res.status(500).send("Internal server error.");
    }
};

const adminAuth = async (req, res, next) => {
    try {
        const isAdmin = req.session.admin;
        if (isAdmin && isAdmin.role=="admin") {
             next();
        } else {
            res.status(403).json({success:false,message:"unauthorized access"})
        }
    } catch (err) {
        console.error("Error in admin middleware:", err);
        res.status(500).send("Internal server error");
    }
};



module.exports = {
    userAuth,
    adminAuth
}