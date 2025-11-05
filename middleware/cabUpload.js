const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// ✅ Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "cabs", // Cloudinary Folder
    format: async (req, file) => "png", // Auto-convert to PNG
    public_id: (req, file) => `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`, // Unique file name
  },
});

const upload = multer({ storage });

module.exports = upload;
