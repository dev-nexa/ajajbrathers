const express = require('express');
const router = express.Router();
const { exportInventoryToExcel } = require('../controllers/exportController');
const { authMiddleware } = require('../middleware/auth');

// Apply authentication middleware to all export routes
router.use(authMiddleware);

// Route to export inventory to Excel
router.get('/inventory/excel', exportInventoryToExcel);

module.exports = router; 