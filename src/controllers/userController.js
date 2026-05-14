const bcrypt = require('bcrypt');
const prisma = require('../config/prisma');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { sanitizeUser } = require('./authController');

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, role, search } = req.validated.query;
  const where = {
    ...(role ? { role } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } }
          ]
        }
      : {})
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit
    }),
    prisma.user.count({ where })
  ]);

  res.json({
    success: true,
    data: users.map(sanitizeUser),
    meta: { page, limit, total, pages: Math.ceil(total / limit) }
  });
});

const getUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.validated.params.id }
  });

  res.json({
    success: true,
    data: sanitizeUser(user)
  });
});

const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, isActive } = req.validated.body;
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      isActive
    }
  });

  res.status(201).json({
    success: true,
    data: sanitizeUser(user)
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const { password, ...fields } = req.validated.body;

  if (req.validated.params.id === req.user.id && fields.isActive === false) {
    throw new ApiError(400, 'You cannot deactivate your own account while logged in');
  }

  const data = { ...fields };
  if (password) {
    data.passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);
  }

  const user = await prisma.user.update({
    where: { id: req.validated.params.id },
    data
  });

  res.json({
    success: true,
    data: sanitizeUser(user)
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  await prisma.user.delete({
    where: { id: req.validated.params.id }
  });

  res.status(204).send();
});

module.exports = {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser
};
