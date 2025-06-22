const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated, isEditor } = require('../middleware/auth');

// عرض قائمة المستخدمين
router.get('/', isAuthenticated, isEditor, userController.getUsers);

// عرض نموذج إضافة مستخدم جديد
router.get('/create', isAuthenticated, isEditor, userController.getCreateForm);

// إضافة مستخدم جديد
router.post('/create', isAuthenticated, isEditor, userController.createUser);

// عرض نموذج تعديل مستخدم
router.get('/:id/edit', isAuthenticated, isEditor, userController.getEditForm);

// تحديث بيانات المستخدم
router.post('/:id/edit', isAuthenticated, isEditor, userController.updateUser);

// حذف مستخدم
router.post('/delete/:id', isAuthenticated, isEditor, userController.deleteUser);

module.exports = router; 