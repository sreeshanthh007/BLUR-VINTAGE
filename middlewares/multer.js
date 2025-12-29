
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/product-images');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname); // More reliable than split/pop
        cb(null, `${uuidv4()}${ext}`);
    }
});


const memoryStorage = multer.memoryStorage();


const imageFileFilter = (req, file, cb) => {
    const allowedTypes = /\.(jpg|jpeg|png|gif|webp)$/i;
    if (!allowedTypes.test(file.originalname)) {
        req.fileValidationError = 'Only image files (JPG, JPEG, PNG, GIF, WEBP) are allowed!';
        return cb(null, false); 
    }
    cb(null, true); 
};


const diskUpload = multer({ storage });


const memoryUpload = multer({
    storage: memoryStorage,
    fileFilter: imageFileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // Optional: limit to 10MB
    }
}).any(); 


export { diskUpload, memoryUpload };


export default {
    diskUpload,
    memoryUpload
};