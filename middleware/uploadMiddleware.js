const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// ✅ Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "profile_pictures", // Change folder name as needed
    format: async (req, file) => "png", // Auto-convert to PNG
    public_id: (req, file) => `${Date.now()}-${file.originalname}`, // Unique file name
  },
});

const upload = multer({ storage });

module.exports = upload;
