const express = require('express');
const router = express.Router();
const certificatesController = require('../controllers/certificatesController');
const { isAuthenticated, isEditor } = require('../middleware/auth');
const { validateCertificate, validate } = require('../middleware/validators');
const { connectDb } = require('../middleware/database');

// عرض الشهادة للعامة برقم public_id
router.get('/public/:public_id', connectDb, certificatesController.showPublic);

// مسارات سلة المحذوفات - يجب أن تكون قبل المسارات الأخرى
router.post('/trash-multiple', isAuthenticated, isEditor, certificatesController.trashMultiple);
router.get('/deleted', isAuthenticated, isEditor, certificatesController.getDeletedCertificates);
router.post('/restore-multiple', isAuthenticated, isEditor, certificatesController.restoreMultiple);
router.post('/empty-trash', isAuthenticated, isEditor, certificatesController.emptyTrash);
router.delete('/delete-multiple', isAuthenticated, isEditor, certificatesController.deleteMultiple);

// قائمة الشهادات (لحسابات داخلية فقط)
router.get('/', isAuthenticated, certificatesController.index);

// مسارات إنشاء الشهادات - يجب أن تكون قبل المسارات التي تحتوي على معرف
router.get('/create-type', isAuthenticated, isEditor, certificatesController.createType);
router.get('/create/internal', isAuthenticated, isEditor, certificatesController.createInternal);
router.get('/create/external', isAuthenticated, isEditor, certificatesController.createExternal);

// مسار إنشاء الشهادة
router.post('/',
    isAuthenticated, 
    isEditor,
    express.json(),
    validateCertificate,
    validate,
    certificatesController.store
);

// مسارات حفظ وتحديث الشهادات
router.post('/:id/status', isAuthenticated, isEditor, async (req, res) => {
    try {
        const { status } = req.body;
        await req.db.execute(
            'UPDATE certificates SET status = ? WHERE id = ?',
            [status, req.params.id]
        );
        req.flash('success', 'تم تحديث حالة الشهادة بنجاح');
        res.redirect(`/certificates/${req.params.id}`);
    } catch (error) {
        console.error('Error updating certificate status:', error);
        req.flash('error', 'حدث خطأ أثناء تحديث حالة الشهادة');
        res.redirect(`/certificates/${req.params.id}`);
    }
});

// مسارات عرض وحذف الشهادات - يجب أن تكون في النهاية
router.get('/:id', isAuthenticated, certificatesController.show);
router.get('/:id/print', isAuthenticated, certificatesController.show);
router.get('/:id/pdf', certificatesController.exportCertificatePDF);
router.get('/:id/print-pdf-raw', certificatesController.printCertificate);
router.post('/:id/restore', isAuthenticated, isEditor, certificatesController.restore);
router.delete('/:id', isAuthenticated, isEditor, certificatesController.delete);

module.exports = router;
