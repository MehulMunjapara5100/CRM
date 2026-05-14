const { Readable } = require('stream');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const env = require('../config/env');
const { cloudinary, isCloudinaryConfigured } = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');

const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'products');

const extensionByMimeType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

function uploadBuffer(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: env.CLOUDINARY_FOLDER,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    Readable.from(file.buffer).pipe(stream);
  });
}

async function saveLocalImage(file) {
  await fs.mkdir(uploadDir, { recursive: true });

  const extension = extensionByMimeType[file.mimetype] || path.extname(file.originalname) || '.jpg';
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  await fs.writeFile(path.join(uploadDir, filename), file.buffer);

  return {
    url: `/uploads/products/${filename}`,
    publicId: `local:${filename}`
  };
}

async function uploadImages(files = []) {
  if (files.length && env.NODE_ENV === 'production' && !isCloudinaryConfigured) {
    throw new ApiError(
      503,
      'Image uploads need Cloudinary on Vercel. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in Vercel environment variables.'
    );
  }

  const upload = isCloudinaryConfigured ? uploadBuffer : saveLocalImage;
  return Promise.all(files.map(upload));
}

module.exports = {
  uploadImages
};
