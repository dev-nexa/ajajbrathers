const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middleware/auth');

// عرض صفحة تسجيل الدخول
router.get('/login', authController.getLogin);

// معالجة تسجيل الدخول
router.post('/login', authController.postLogin);

// تسجيل الخروج
router.get('/logout', isAuthenticated, authController.logout);

// عرض صفحة تغيير كلمة المرور
router.get('/change-password', isAuthenticated, authController.getChangePassword);

// معالجة تغيير كلمة المرور
router.post('/change-password', isAuthenticated, authController.postChangePassword);

module.exports = router; 