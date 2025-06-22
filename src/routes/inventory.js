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
router.get('/:id', isAuthenticated, inventoryController.getInventoryItem);
router.post('/create', isAuthenticated, isEditor, inventoryController.createInventory);
router.get('/:id/edit', isAuthenticated, isEditor, inventoryController.getEditForm);
router.post('/:id/edit', isAuthenticated, isEditor, inventoryController.updateInventory);
router.post('/delete/:id', isAuthenticated, isEditor, inventoryController.deleteInventory);
router.post('/bulk-delete', isAuthenticated, isEditor, inventoryController.bulkDeleteInventory);
router.post('/:id/toggle-reject', isAuthenticated, isEditor, inventoryController.toggleReject);

// عرض صفحة الطباعة (محمي)
router.get('/print', isAuthenticated, async (req, res) => {
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

module.exports = router; 