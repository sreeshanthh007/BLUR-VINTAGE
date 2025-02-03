const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/product-images');
    },
    filename: function (req, file, cb) {
        const ext = file.originalname.split('.').pop();
        cb(null, `${uuidv4()}.${ext}`);
    }
});

// Configure storage for memory uploads (for image processing)
const memoryStorage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)) {
        req.fileValidationError = 'Only image files are allowed!';
        return cb(null, false);
    }
    cb(null, true);
};

const diskUpload = multer({ storage: storage });
const memoryUpload = multer({
    storage: memoryStorage,
    fileFilter: imageFileFilter
}).any();



module.exports={
    diskUpload,
    memoryUpload
}