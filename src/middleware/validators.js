const { body, validationResult } = require('express-validator');
const moment = require('moment');

// التحقق من صحة بيانات الشهادة
exports.validateCertificate = [
    body('type')
        .notEmpty().withMessage('نوع الشهادة مطلوب')
        .isIn(['internal', 'external']).withMessage('نوع الشهادة غير صالح'),
    
    body('customer_name')
        .optional({ nullable: true, checkFalsy: true })
        .trim(),
    
    body('customer_phone')
        .optional({ nullable: true, checkFalsy: true })
        .trim(),
    
    body('customer_address')
        .optional({ nullable: true, checkFalsy: true })
        .trim(),
    
    body('analyst')
        .optional({ nullable: true, checkFalsy: true })
        .trim(),
    
    body('notes')
        .optional({ nullable: true, checkFalsy: true })
        .trim(),

    body('items')
        .optional({ nullable: true, checkFalsy: true })
        .isArray().withMessage('العينات يجب أن تكون مصفوفة'),

    body('items.*.quantity')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('items.*.quantity').exists())
        .isFloat({ min: 0 }).withMessage('الكمية يجب أن تكون رقماً موجباً'),

    body('items.*.packaging_unit')
        .optional({ nullable: true, checkFalsy: true })
        .trim(),

    body('items.*.packaging_weight')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('items.*.packaging_weight').exists())
        .isFloat({ min: 0 }).withMessage('وزن التعبئة يجب أن يكون رقماً موجباً'),

    body('items.*.total_weight')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('items.*.total_weight').exists())
        .isFloat({ min: 0 }).withMessage('الوزن الإجمالي يجب أن يكون رقماً موجباً'),

    body('items.*.ph')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('items.*.ph').exists())
        .isFloat().withMessage('درجة الحموضة يجب أن تكون رقماً'),

    body('items.*.peroxide')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('items.*.peroxide').exists())
        .isFloat({ min: 0 }).withMessage('البيروكسيد يجب أن يكون رقماً موجباً'),

    body('items.*.abs_232')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('items.*.abs_232').exists())
        .isFloat({ min: 0 }).withMessage('امتصاص 232 يجب أن يكون رقماً موجباً'),

    body('items.*.abs_266')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('items.*.abs_266').exists())
        .isFloat({ min: 0 }).withMessage('امتصاص 266 يجب أن يكون رقماً موجباً'),

    body('items.*.abs_270')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('items.*.abs_270').exists())
        .isFloat({ min: 0 }).withMessage('امتصاص 270 يجب أن يكون رقماً موجباً'),

    body('items.*.abs_274')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('items.*.abs_274').exists())
        .isFloat({ min: 0 }).withMessage('امتصاص 274 يجب أن يكون رقماً موجباً'),

    body('items.*.delta_k')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('items.*.delta_k').exists())
        .isFloat().withMessage('دلتا k يجب أن تكون رقماً'),

    body('items.*.stigmastadiene')
        .optional({ nullable: true, checkFalsy: true })
        .if(body('items.*.stigmastadiene').exists())
        .isFloat({ min: 0 }).withMessage('ستيغما ستاديين يجب أن يكون رقماً موجباً')
];

// التحقق من صحة بيانات الفاتورة
exports.validateInvoice = [
    body('date')
        .notEmpty().withMessage('تاريخ الفاتورة مطلوب')
        .custom((value) => {
            // التحقق من صحة التاريخ سواء كان بصيغة YYYY-MM-DD أو DD/MM/YYYY
            if (value.includes('/')) {
                const parts = value.split('/');
                if (parts.length !== 3) {
                    throw new Error('صيغة التاريخ غير صحيحة');
                }
                const day = parseInt(parts[0]);
                const month = parseInt(parts[1]);
                const year = parseInt(parts[2]);
                if (isNaN(day) || isNaN(month) || isNaN(year)) {
                    throw new Error('تاريخ غير صالح');
                }
                if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
                    throw new Error('تاريخ غير صالح');
                }
            } else {
                if (!moment(value, 'YYYY-MM-DD', true).isValid()) {
                    throw new Error('تاريخ غير صالح');
                }
            }
            return true;
        }),
    
    body('invoice_number')
        .notEmpty().withMessage('رقم الفاتورة مطلوب')
        .isNumeric().withMessage('رقم الفاتورة يجب أن يكون رقماً'),
    
    body('customer_name')
        .notEmpty().withMessage('اسم العميل مطلوب')
        .trim()
        .isLength({ min: 3 }).withMessage('اسم العميل يجب أن يكون 3 أحرف على الأقل'),
    
    body('driver_name')
        .optional()
        .trim(),
    
    body('quantities')
        .notEmpty().withMessage('الكميات مطلوبة')
        .custom((value) => {
            if (typeof value !== 'object') {
                throw new Error('الكميات يجب أن تكون كائناً');
            }
            if (Object.keys(value).length === 0) {
                throw new Error('يجب اختيار عنصر واحد على الأقل');
            }
            for (const [key, val] of Object.entries(value)) {
                if (!Number.isInteger(Number(key))) {
                    throw new Error('معرف العنصر غير صالح');
                }
                if (!Number.isFinite(Number(val)) || Number(val) <= 0) {
                    throw new Error('الكمية يجب أن تكون رقماً موجباً');
                }
            }
            return true;
        })
];

// تصحيح الرجوع للصفحة السابقة
const getRedirectUrl = (req) => {
    const referrer = req.get('Referrer');
    return referrer || '/';
};

// التحقق من صحة البيانات
exports.validateInventoryItem = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('errors', errors.array());
        return res.redirect(getRedirectUrl(req));
    }
    next();
};

// ميدل وير للتحقق من نتائج التحقق
exports.validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(400).json({ 
                success: false, 
                message: 'خطأ في البيانات المدخلة',
                errors: errors.array() 
            });
        }
        req.flash('error_msg', 'يرجى التحقق من البيانات المدخلة');
        return res.redirect(getRedirectUrl(req));
    }
    next();
};

// ميدل وير للتحقق من توفر المخزون
exports.validateInventoryAvailability = async (req, res, next) => {
    try {
        const { quantities } = req.body;
        const { pool } = require('../database/db');
        
        if (!quantities || typeof quantities !== 'object') {
            return next();
        }

        for (const [inventoryId, requestedQuantity] of Object.entries(quantities)) {
            const [rows] = await pool.query(
                'SELECT current_quantity, sample_number FROM inventory WHERE id = ? AND deleted_at IS NULL',
                [inventoryId]
            );

            if (rows.length === 0) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: `العينة غير موجودة في المخزون`
                    });
                }
                req.flash('error_msg', `العينة غير موجودة في المخزون`);
                return res.redirect('back');
            }

            let availableQuantity = parseFloat(rows[0].current_quantity);

            // إذا كانت هذه عملية تعديل فاتورة (PUT على /invoices/:id)،
            if (req.method === 'PUT' && req.params.id) {
                // جلب الكمية القديمة لأجل هذه العينة في الفاتورة الحالية
                const [[old]] = await pool.query(
                    'SELECT quantity FROM invoice_items WHERE invoice_id = ? AND inventory_id = ?',
                    [req.params.id, inventoryId]
                );
                if (old && old.quantity) {
                    availableQuantity += parseFloat(old.quantity);
                }
            }

            const requested = parseFloat(requestedQuantity);
            if (requested > availableQuantity) {
                if (req.xhr || req.headers.accept.indexOf('json') > -1) {
                    return res.status(400).json({
                        success: false,
                        message: `الكمية المطلوبة (${requested}) أكبر من المتوفرة (${availableQuantity}) للعينة: ${rows[0].sample_number}`
                    });
                }
                req.flash('error_msg', `الكمية المطلوبة (${requested}) أكبر من المتوفرة (${availableQuantity}) للعينة: ${rows[0].sample_number}`);
                return res.redirect('back');
            }
        }

        next();
    } catch (error) {
        console.error('Error validating inventory availability:', error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'حدث خطأ أثناء التحقق من المخزون'
            });
        }
        req.flash('error_msg', 'حدث خطأ أثناء التحقق من المخزون');
        res.redirect('back');
    }
}; 