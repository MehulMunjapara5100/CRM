const { Prisma } = require('@prisma/client');
const multer = require('multer');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

function errorHandler(error, req, res, next) {
  let statusCode = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let details = error.details || null;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      statusCode = 409;
      message = 'A record with this unique value already exists';
      details = { target: error.meta?.target };
    }

    if (error.code === 'P2025') {
      statusCode = 404;
      message = 'Record not found';
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    message = 'Database is unavailable. Make sure DATABASE_URL is correct and migrations have been run.';
  }

  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  }

  if (error instanceof multer.MulterError) {
    statusCode = 400;
    message = error.message;
  }

  const response = {
    success: false,
    message
  };

  if (details) response.details = details;
  if (env.NODE_ENV !== 'production') response.stack = error.stack;

  res.status(statusCode).json(response);
}

module.exports = {
  notFound,
  errorHandler
};
