const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { getHome } = require('../controllers/homeController');

// الصفحة الرئيسية - يجب تسجيل الدخول للوصول إليها
router.get('/', isAuthenticated, getHome);

module.exports = router; 