
import express from 'express';

const router = express.Router();


import adminController from "../controllers/admin/adminController.js";
import userManageController from "../controllers/admin/customerController.js";
import categoryController from '../controllers/admin/categoryController.js';
import productController from '../controllers/admin/productController.js';
import returnController from '../controllers/admin/orderReturnController.js';
import couponController from "../controllers/admin/couponController.js";
import OfferController from '../controllers/admin/offerController.js';

// Middlewares
import { memoryUpload } from '../middlewares/multer.js';  
import { adminAuth } from "../middlewares/auth.js";

// Admin Login
router.get('/login', adminController.loadlogin);
router.post('/login', adminController.login);

// Dashboard
router.get('/dashboard', adminAuth, adminController.dashboard);

// Admin Logout
router.get('/logout', adminAuth, adminController.logOut);

// User Management
router.get('/userManage', adminAuth, userManageController.userInfo);

// Block / Unblock User
router.patch('/blockUser', adminAuth, adminController.blockUser);
router.patch('/unblockUser', adminAuth, adminController.unblockUser);

// Category Management
router.get('/category', adminAuth, categoryController.categoryInfo);
router.post('/category', adminAuth, categoryController.addCategory);
router.post('/category/toggle/:categoryId', adminAuth, categoryController.toggler);
router.get('/editcategory/:editId', adminAuth, categoryController.loadeditCategory);
router.post('/editcategory/:categoryId', adminAuth, categoryController.editCategory);

// Product Management
router.get('/productpage', adminAuth, productController.loadproduct);
router.get('/addproduct', adminAuth, productController.loadAddCategory);
router.post('/addproduct', adminAuth, memoryUpload, productController.addProducts);

// Block / Unblock Product
router.get('/blockProduct', adminAuth, productController.blockProduct);
router.get('/unblockProduct', adminAuth, productController.unBlockProduct);

// Edit Product
router.get('/editproduct', adminAuth, productController.loadEditProduct);
router.post('/editproduct/:id', adminAuth, memoryUpload, productController.editProduct);

// Order Management
router.get("/order-list", adminAuth, adminController.orderList);
router.get("/order-details", adminAuth, adminController.orderDetails);
router.get("/update-order-status", adminAuth, adminController.updateOrderStatus);

// Return Requests
router.get('/manageOrder', adminAuth, returnController.getReturnRequests);
router.post('/return-order-item/:orderId/:itemId', adminAuth, returnController.initiateReturn);
router.put("/returns/:orderId/:itemId/approve", adminAuth, returnController.approvedReturn);

// Coupon Management
router.get('/coupons', adminAuth, couponController.couponPage);
router.post("/addcoupons", adminAuth, couponController.addCoupon);
router.get('/edit-coupon/:couponId', adminAuth, couponController.loadEditCoupon);
router.put('/edit-coupon/:couponId', adminAuth, couponController.editCoupon);
router.delete('/removeCoupon', adminAuth, couponController.deleteCoupon);
router.get('/available-coupons', adminAuth, couponController.availableCoupons);

// Offer Management
router.get("/addOffer", adminAuth, OfferController.loadOffer);
router.get("/offers/items", adminAuth, OfferController.getItemByType);
router.post("/offers/add", adminAuth, OfferController.addOffer);

// Sales & Analytics
router.get("/sales-report", adminAuth, adminController.getSalesReport);
router.get('/analytics-dashboard', adminAuth, adminController.getAnalyticsDashboard);


export default router;