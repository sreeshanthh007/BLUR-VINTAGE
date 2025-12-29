
import User from "../../models/userSchema.js";
import Address from "../../models/addressSchema.js";
import Wallet from '../../models/walletSchema.js';

const manage = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;

        if (!userId) {
            return res.render("user/userManage", { user: null });
        }

        const userData = await User.findById(userId);

        res.render('user/userManage', { user: userData || null });
    } catch (error) {
        console.error("Error in manage profile:", error);
        res.status(500).render('error', { message: "Failed to load profile" });
    }
};

const updateDetails = async (req, res) => {
    try {
        const { firstName, lastName, phoneNo, email } = req.body;

        if (!firstName || !phoneNo || !email) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const updatedUser = await User.findOneAndUpdate(
            { email: email.trim() },
            {
                firstName: firstName.trim(),
                lastName: lastName?.trim() || "",
                phoneNo: phoneNo.trim()
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            redirectUrl: "/user/manage"
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ success: false, message: "Failed to update profile" });
    }
};

const getAddress = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        if (!userId) {
            return res.redirect("/user/login");
        }

        const addresses = await Address.find({ userId }).sort({ createdAt: -1 });

        res.render('user/addressManage', { addresses });
    } catch (error) {
        console.error("Error fetching addresses:", error);
        res.status(500).render('error', { message: "Failed to load addresses" });
    }
};

const loadAddAddress = async (req, res) => {
    const userId = req.session.user || req.session?.passport?.user;
    if (!userId) {
        return res.redirect("/user/login");
    }
    res.render("user/addAddress");
};

const addAddress = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const { name, phone, landMark, city, state, pincode, country } = req.body;

        if (!name || !phone || !landMark || !city || !state || !pincode || !country) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        const newAddress = new Address({
            userId,
            name: name.trim(),
            phone: phone.trim(),
            landMark: landMark.trim(),
            city: city.trim(),
            state: state.trim(),
            pincode: pincode.trim(),
            country: country.trim()
        });

        await newAddress.save();

        res.json({
            success: true,
            message: "Address added successfully",
            redirectUrl: "/user/address"
        });
    } catch (error) {
        console.error("Error adding address:", error);
        res.status(500).json({ success: false, message: "Failed to add address" });
    }
};

const editAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user || req.session?.passport?.user;

        if (!userId) {
            return res.redirect("/user/login");
        }

        const addressData = await Address.findOne({ _id: id, userId });
        if (!addressData) {
            return res.redirect("/user/address");
        }

        res.render("user/editAddress", { addressData });
    } catch (error) {
        console.error("Error loading edit address:", error);
        res.redirect("/user/address");
    }
};

const updateAddress = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.session.user || req.session?.passport?.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const updateData = req.body;

        const updatedAddress = await Address.findOneAndUpdate(
            { _id: id, userId },
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedAddress) {
            return res.status(404).json({ success: false, message: "Address not found" });
        }

        res.json({
            success: true,
            message: "Address updated successfully",
            redirectUrl: "/user/address"
        });
    } catch (error) {
        console.error("Error updating address:", error);
        res.status(500).json({ success: false, message: "Failed to update address" });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { id } = req.query;
        const userId = req.session.user || req.session?.passport?.user;

        if (!userId) {
            return res.redirect("/user/login");
        }

        const result = await Address.findOneAndDelete({ _id: id, userId });

        if (!result) {
            return res.status(404).send("Address not found");
        }

        res.redirect("/user/address");
    } catch (error) {
        console.error("Error deleting address:", error);
        res.redirect("/user/address");
    }
};

const wallet = async (req, res) => {
    try {
        const userId = req.session.user || req.session?.passport?.user;
        if (!userId) {
            return res.redirect('/user/login');
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({
                userId,
                balance: 0,
                transactions: []
            });
            await wallet.save();
        }

        // Sort transactions newest first
        wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.render('user/wallet', { wallet });
    } catch (error) {
        console.error("Error loading wallet:", error);
        res.status(500).render('error', { message: "Failed to load wallet" });
    }
};

const addMoney = async (req, res) => {
    try {
        const { amount } = req.body;
        const userId = req.session.user || req.session?.passport?.user;

        if (!userId) {
            return res.status(401).json({ success: false, message: "User not authenticated" });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount < 1 || parsedAmount > 10000) {
            return res.status(400).json({
                success: false,
                message: "Amount must be between ₹1 and ₹10,000"
            });
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0, transactions: [] });
        }

        wallet.balance += parsedAmount;
        wallet.transactions.unshift({
            type: 'Deposit',
            amount: parsedAmount,
            description: 'Wallet top-up',
            status: 'Completed',
            date: new Date()
        });

        await wallet.save();

        res.json({
            success: true,
            message: 'Money added successfully',
            newBalance: wallet.balance
        });
    } catch (error) {
        console.error("Error adding money to wallet:", error);
        res.status(500).json({ success: false, message: "Failed to add money" });
    }
};

export default {
    manage,
    updateDetails,
    getAddress,
    editAddress,
    addAddress,
    loadAddAddress,
    deleteAddress,
    updateAddress,
    wallet,
    addMoney
};

