const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signAccessToken } = require('../utils/jwt');

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt
  };
}

const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.validated.body;
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'CLIENT'
    }
  });

  const token = signAccessToken(user);

  res.status(201).json({
    success: true,
    token,
    user: sanitizeUser(user)
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.validated.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signAccessToken(user);

  res.json({
    success: true,
    token,
    user: sanitizeUser(user)
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

module.exports = {
  register,
  login,
  me,
  sanitizeUser
};
