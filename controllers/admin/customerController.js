import User from "../../models/userSchema.js";

const userInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search.trim();
        }

        let page = parseInt(req.query.page) || 1;
        const limit = 5;

        const regex = new RegExp(search, "i");

        const userData = await User.find({
            isAdmin: false,
            $or: [
                { firstName: { $regex: regex } },
                { lastName: { $regex: regex } },
                { email: { $regex: regex } }
            ]
        })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { firstName: { $regex: regex } },
                { lastName: { $regex: regex } },
                { email: { $regex: regex } }
            ]
        });

        const totalPages = Math.ceil(count / limit);

        res.render("admin/userManage", {
            users: userData,
            currentPage: page,
            totalPages,
            search,
            limit
        });
    } catch (error) {
        console.log("Error in userInfo:", error);
        res.status(500).send("Server error");
    }
};

export default {
    userInfo
};

