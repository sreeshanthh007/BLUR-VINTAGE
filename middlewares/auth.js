

const User = require("../models/userSchema");

const userAuth = (req, res, next) => {
    const userId = req.session?.user || req.session?.passport?.user
         if (userId) {
        User.findById(userId)
            .then(data => {
                if (data && !data.isBlocked) {
                    next();
                } else {
                   
                    req.session.destroy((err) => {
                        if (err) {
                            console.log("Error destroying session:", err);
                        }
                    
                        res.clearCookie("connect.sid");
                     
                        return res.redirect("/user/login?message=you are blocked by the admin");
                    });
                }
            })
            .catch(error => {
                console.log("error in user auth middleware", error);
                // Also destroy session on error
                req.session.destroy((err) => {
                    if (err) {
                        console.log("Error destroying session:", err);
                    }
                    res.clearCookie("connect.sid");
                    return res.status(500).send("Internal server error");
                });
            });
    } else {
        return res.redirect("/user/login");
    }
};



const adminAuth = async (req, res, next) => {
    try {
        const isAdmin = req.session.admin;
        if (isAdmin && isAdmin.role=="admin") {
             next();
        } else {
            req.flash('error', 'Unauthorized access. Please login as admin.');
            res.redirect('/admin/login')
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