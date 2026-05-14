const express = require('express');
const userController = require('../controllers/userController');
const validate = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createUserSchema,
  updateUserSchema,
  listUsersSchema,
  userIdSchema
} = require('../validators/userSchemas');

const router = express.Router();

router.use(authenticate, authorize('ADMIN'));

router
  .route('/')
  .get(validate(listUsersSchema), userController.listUsers)
  .post(validate(createUserSchema), userController.createUser);

router
  .route('/:id')
  .get(validate(userIdSchema), userController.getUser)
  .patch(validate(updateUserSchema), userController.updateUser)
  .delete(validate(userIdSchema), userController.deleteUser);

module.exports = router;
