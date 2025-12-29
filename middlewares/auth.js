
import User from "../models/userSchema.js";

const userAuth = (req, res, next) => {
    const userId = req.session?.user || req.session?.passport?.user;

    if (userId) {
        User.findById(userId)
            .then((data) => {
                if (data && !data.isBlocked) {
                    next();
                } else {
                    // User is blocked or not found
                    req.session.destroy((err) => {
                        if (err) {
                            console.log("Error destroying session:", err);
                        }
                        res.clearCookie("connect.sid");
                        return res.redirect("/user/login?message=You are blocked by the admin");
                    });
                }
            })
            .catch((error) => {
                console.log("Error in user auth middleware:", error);
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
        const adminSession = req.session.admin;

        if (adminSession && adminSession.role === "admin") {
            next();
        } else {
            req.flash("error", "Unauthorized access. Please login as admin.");
            res.redirect("/admin/login");
        }
    } catch (err) {
        console.error("Error in admin middleware:", err);
        res.status(500).send("Internal server error");
    }
};

export { userAuth, adminAuth };

export default { userAuth, adminAuth };
