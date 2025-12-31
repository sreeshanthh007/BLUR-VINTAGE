
import express from 'express';
import session from 'express-session';
import nocache from 'nocache';
import flash from 'connect-flash';
import path from 'path';
import { fileURLToPath } from 'url';
import bodyParser from 'body-parser';
import passport from './config/passport.js';
import dotenv from 'dotenv';
import methodOverride from 'method-override';
import './config/mongodb.js'; 

dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();




import userRouter from './routes/userRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import authRoutes from './routes/authroutes.js';


import adminAccess from './middlewares/auth.js';
import connectDB from './config/mongodb.js';


connectDB()

app.use(session({
    secret: process.env.SESSION_SECRET || process.env.session_secret, // Use consistent naming
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true,
        maxAge: 3600000 // 1 hour
    },
    rolling: true,
}));

app.use(nocache());
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
});


app.use(express.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true  , limit:"20mb"}));
app.use(methodOverride('_method'));


// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/user', userRouter);
app.use('/admin', adminRouter);
app.use('/', authRoutes);

// Authentication middlewares (order matters!)
app.use('/admin', adminAccess.adminAuth); // Protect admin routes
app.use('/user', adminAccess.userAuth);   // Protect user routes

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error stack:', err.stack);
    res.status(err.status || 500).render('error', {
        message: err.message || 'Internal Server Error'
    });
});

// Start server
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server started on http://localhost:${PORT}`);
});


export default app;