const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { isAuthenticated, isEditor } = require('../middleware/auth');

// تطبيق middleware التحقق من الهوية على جميع مسارات الفواتير
router.use(isAuthenticated);

// عرض قائمة الفواتير
router.get('/', invoiceController.getInvoices);

// الحصول على رقم الفاتورة التالي
router.get('/next-number', isEditor, invoiceController.getNextInvoiceNumber);

// عرض نموذج إنشاء فاتورة جديدة
router.get('/create', isEditor, invoiceController.getCreateForm);

// إنشاء فاتورة جديدة
router.post('/create', isEditor, invoiceController.createInvoice);

// عرض فاتورة
router.get('/:id', invoiceController.getInvoice);

// طباعة فاتورة
router.get('/:id/print', invoiceController.printInvoice);

// حذف فاتورة
router.delete('/delete/:id', isEditor, invoiceController.deleteInvoice);

module.exports = router; 