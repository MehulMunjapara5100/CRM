const multer = require('multer');
const ApiError = require('../utils/ApiError');

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 8
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new ApiError(400, 'Only JPEG, PNG, and WEBP images are allowed'));
    }
    cb(null, true);
  }
});

module.exports = upload;
