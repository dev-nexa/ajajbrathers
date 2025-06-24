const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { isAuthenticated, isEditor } = require('../middleware/auth');
const { validateInvoice, validate, validateInventoryAvailability } = require('../middleware/validators');

// عرض قائمة الفواتير
router.get('/', isAuthenticated, invoiceController.getInvoices);

// API لجلب المخزون
router.get('/api/inventory', isAuthenticated, invoiceController.getInventoryAPI);

// عرض نموذج إنشاء فاتورة جديدة
router.get('/create', isAuthenticated, isEditor, invoiceController.getCreateForm);

// إنشاء فاتورة جديدة
router.post('/create', isAuthenticated, isEditor, validateInvoice, validateInventoryAvailability, validate, invoiceController.createInvoice);

// مسارات سلة المحذوفات والحذف الجماعي (يجب أن تكون قبل /:id)
router.post('/trash-multiple', isAuthenticated, isEditor, invoiceController.trashMultiple);
router.get('/deleted', isAuthenticated, isEditor, invoiceController.getDeletedInvoices);
router.post('/restore-multiple', isAuthenticated, isEditor, invoiceController.restoreMultiple);
router.post('/empty-trash', isAuthenticated, isEditor, invoiceController.emptyTrash);
router.delete('/delete-multiple', isAuthenticated, isEditor, invoiceController.deleteMultiple);

// طباعة فاتورة
router.get('/:id/print', isAuthenticated, invoiceController.printInvoice);

// طباعة فاتورة بدون حماية الجلسة (مخصص لتوليد PDF)
router.get('/:id/print-pdf-raw', invoiceController.printInvoice);

// حذف فاتورة
router.delete('/:id', isAuthenticated, isEditor, invoiceController.deleteInvoice);

// عرض نموذج تعديل الفاتورة
router.get('/:id/edit', isAuthenticated, isEditor, invoiceController.getEditForm);

// تحديث الفاتورة
router.put('/:id', isAuthenticated, isEditor, validateInvoice, validateInventoryAvailability, validate, invoiceController.updateInvoice);

// استعادة فاتورة واحدة
router.post('/:id/restore', isAuthenticated, isEditor, invoiceController.restoreInvoice);

// تصدير الفاتورة كـ PDF
router.get('/:id/pdf', isAuthenticated, invoiceController.exportInvoicePDF);

// عرض فاتورة - يجب أن يكون آخر مسار
router.get('/:id', isAuthenticated, invoiceController.getInvoice);

module.exports = router; 