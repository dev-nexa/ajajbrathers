const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { isAuthenticated, isEditor } = require('../middleware/auth');
const { validateInvoice, validate } = require('../middleware/validators');

// عرض قائمة الفواتير
router.get('/', isAuthenticated, invoiceController.getInvoices);

// عرض نموذج إنشاء فاتورة جديدة
router.get('/create', isAuthenticated, isEditor, invoiceController.getCreateForm);

// إنشاء فاتورة جديدة
router.post('/create', isAuthenticated, isEditor, validateInvoice, validate, invoiceController.createInvoice);

// طباعة فاتورة
router.get('/:id/print', isAuthenticated, invoiceController.printInvoice);

// طباعة فاتورة بدون حماية الجلسة (مخصص لتوليد PDF)
router.get('/:id/print-pdf-raw', invoiceController.printInvoice);

// حذف فاتورة
router.delete('/:id', isAuthenticated, isEditor, invoiceController.deleteInvoice);

// عرض فاتورة - يجب أن يكون آخر مسار
router.get('/:id', isAuthenticated, invoiceController.getInvoice);

// تصدير الفاتورة كـ PDF
router.get('/:id/pdf', isAuthenticated, invoiceController.exportInvoicePDF);

module.exports = router; 