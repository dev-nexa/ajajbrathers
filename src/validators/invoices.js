const { body } = require('express-validator');
const { isValidPhone } = require('../utils/helpers');

exports.invoiceValidation = [
  body('invoice_number')
    .notEmpty().withMessage('رقم الفاتورة مطلوب')
    .isInt({ min: 1 }).withMessage('رقم الفاتورة يجب أن يكون عدداً موجباً'),
  body('customer_name')
    .notEmpty().withMessage('اسم العميل مطلوب')
    .isLength({ min: 3 }).withMessage('اسم العميل يجب أن يكون 3 أحرف على الأقل'),
  body('invoice_date')
    .notEmpty().withMessage('تاريخ الفاتورة مطلوب')
    .isISO8601().withMessage('تاريخ الفاتورة غير صالح'),
  body('due_date')
    .notEmpty().withMessage('تاريخ الاستحقاق مطلوب')
    .isISO8601().withMessage('تاريخ الاستحقاق غير صالح')
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.invoice_date)) {
        throw new Error('تاريخ الاستحقاق يجب أن يكون بعد تاريخ الفاتورة');
      }
      return true;
    }),
  body('items')
    .notEmpty().withMessage('عناصر الفاتورة مطلوبة')
    .isArray().withMessage('عناصر الفاتورة يجب أن تكون مصفوفة')
    .custom((items) => {
      if (items.length === 0) {
        throw new Error('يجب إضافة عنصر واحد على الأقل');
      }
      return true;
    }),
  body('items.*.description')
    .notEmpty().withMessage('وصف العنصر مطلوب'),
  body('items.*.quantity')
    .notEmpty().withMessage('الكمية مطلوبة')
    .isFloat({ min: 0.1 }).withMessage('الكمية يجب أن تكون أكبر من صفر'),
  body('items.*.unit_price')
    .notEmpty().withMessage('سعر الوحدة مطلوب')
    .isFloat({ min: 0 }).withMessage('سعر الوحدة يجب أن يكون أكبر من أو يساوي صفر'),
  body('items.*.total')
    .notEmpty().withMessage('الإجمالي مطلوب')
    .isFloat({ min: 0 }).withMessage('الإجمالي يجب أن يكون أكبر من أو يساوي صفر')
    .custom((value, { req, path }) => {
      const index = path.split('.')[1];
      const item = req.body.items[index];
      if (value !== item.quantity * item.unit_price) {
        throw new Error('الإجمالي غير صحيح');
      }
      return true;
    }),
  body('subtotal')
    .notEmpty().withMessage('المجموع الفرعي مطلوب')
    .isFloat({ min: 0 }).withMessage('المجموع الفرعي يجب أن يكون أكبر من أو يساوي صفر')
    .custom((value, { req }) => {
      const itemsTotal = req.body.items.reduce((sum, item) => sum + item.total, 0);
      if (value !== itemsTotal) {
        throw new Error('المجموع الفرعي غير صحيح');
      }
      return true;
    }),
  body('tax_rate')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('نسبة الضريبة يجب أن تكون بين 0 و 100'),
  body('tax_amount')
    .optional()
    .isFloat({ min: 0 }).withMessage('قيمة الضريبة يجب أن تكون أكبر من أو يساوي صفر')
    .custom((value, { req }) => {
      if (req.body.tax_rate && value !== (req.body.subtotal * req.body.tax_rate / 100)) {
        throw new Error('قيمة الضريبة غير صحيحة');
      }
      return true;
    }),
  body('total')
    .notEmpty().withMessage('الإجمالي النهائي مطلوب')
    .isFloat({ min: 0 }).withMessage('الإجمالي النهائي يجب أن يكون أكبر من أو يساوي صفر')
    .custom((value, { req }) => {
      const expectedTotal = req.body.subtotal + (req.body.tax_amount || 0);
      if (value !== expectedTotal) {
        throw new Error('الإجمالي النهائي غير صحيح');
      }
      return true;
    }),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('الملاحظات يجب أن لا تتجاوز 500 حرف')
];

exports.paymentValidation = [
  body('invoice_id')
    .notEmpty().withMessage('معرف الفاتورة مطلوب')
    .isInt().withMessage('معرف الفاتورة غير صالح'),
  body('amount')
    .notEmpty().withMessage('المبلغ مطلوب')
    .isFloat({ min: 0.1 }).withMessage('المبلغ يجب أن يكون أكبر من صفر'),
  body('payment_date')
    .notEmpty().withMessage('تاريخ الدفع مطلوب')
    .isISO8601().withMessage('تاريخ الدفع غير صالح'),
  body('payment_method')
    .notEmpty().withMessage('طريقة الدفع مطلوبة')
    .isIn(['cash', 'bank_transfer', 'check']).withMessage('طريقة الدفع غير صالحة'),
  body('reference_number')
    .optional()
    .isLength({ min: 3 }).withMessage('رقم المرجع يجب أن يكون 3 أحرف على الأقل'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('الملاحظات يجب أن لا تتجاوز 500 حرف')
]; 