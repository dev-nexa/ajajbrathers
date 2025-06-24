const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { isAuthenticated, isEditor } = require('../middleware/auth');


// المسارات العامة (بدون حماية) - يجب أن تكون في البداية
router.get('/print-pdf-raw', (req, res, next) => {
    next();
}, inventoryController.printInventoryRaw);

router.get('/export/pdf', (req, res, next) => {
    next();
}, inventoryController.exportInventoryPDF);

// المسارات المحمية (مع المصادقة)
router.get('/', isAuthenticated, inventoryController.getInventory);
router.get('/create', isAuthenticated, isEditor, inventoryController.getCreateForm);
router.get('/deleted', isAuthenticated, inventoryController.getDeletedItems);
router.get('/:id', isAuthenticated, inventoryController.getInventoryItem);
router.post('/create', isAuthenticated, isEditor, inventoryController.createInventory);
router.get('/:id/edit', isAuthenticated, isEditor, inventoryController.getEditForm);
router.post('/:id/edit', isAuthenticated, isEditor, inventoryController.updateInventory);
router.post('/delete/:id', isAuthenticated, isEditor, inventoryController.deleteInventory);
router.post('/bulk-delete', isAuthenticated, isEditor, inventoryController.bulkDeleteInventory);
router.post('/:id/toggle-reject', isAuthenticated, isEditor, inventoryController.toggleReject);

// مسارات سلة المحذوفات
router.post('/trash', isAuthenticated, isEditor, inventoryController.trashItems);
router.post('/trash/:id', isAuthenticated, isEditor, inventoryController.trashItem);
router.post('/:id/restore', isAuthenticated, isEditor, inventoryController.restoreItem);
router.post('/restore-multiple', isAuthenticated, isEditor, inventoryController.restoreMultipleItems);

// عرض صفحة الطباعة (بدون حماية - متاح للجميع)
router.get('/print', async (req, res) => {
    try {
        const inventory = await inventoryController.fetchInventoryData(req.query);
        res.render('inventory/print', { 
            inventory,
            layout: false // لا نستخدم layout للطباعة
        });
    } catch (error) {
        console.error('❌ Print Route Error:', error);
        res.status(500).send('حدث خطأ أثناء تحميل صفحة الطباعة');
    }
});

router.post('/empty-trash', isAuthenticated, isEditor, inventoryController.emptyTrash);

module.exports = router; 