import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Create the public/images directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../public/images');

if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure Multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
});

// Initialize Multer
const upload = multer({ storage: storage, limits: { fileSize: 5 * 1024 * 1024 } });

export default upload;
