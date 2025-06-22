const { body, validationResult } = require('express-validator');

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
        .isDate().withMessage('تاريخ غير صالح'),
    
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