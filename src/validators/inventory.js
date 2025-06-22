const { body } = require('express-validator');
const { isValidPhone } = require('../utils/helpers');

exports.sampleValidation = [
  body('sample_number')
    .notEmpty().withMessage('رقم العينة مطلوب')
    .isLength({ min: 10 }).withMessage('رقم العينة غير صالح'),
  body('supplier_or_sample_name')
    .notEmpty().withMessage('اسم المورد أو العينة مطلوب')
    .isLength({ min: 3 }).withMessage('اسم المورد أو العينة يجب أن يكون 3 أحرف على الأقل'),
  body('date')
    .notEmpty().withMessage('تاريخ العينة مطلوب')
    .custom((value) => {
      // التحقق من تنسيق DD/MM/YYYY
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      if (!dateRegex.test(value)) {
        throw new Error('تاريخ العينة يجب أن يكون بالتنسيق يوم/شهر/سنة');
      }
      
      const [, day, month, year] = value.match(dateRegex);
      const date = new Date(year, month - 1, day);
      
      // التحقق من أن التاريخ صحيح
      if (date.getFullYear() != year || date.getMonth() != month - 1 || date.getDate() != day) {
        throw new Error('تاريخ العينة غير صالح');
      }
      
      // التحقق من أن التاريخ ليس في المستقبل
      const today = new Date();
      today.setHours(23, 59, 59, 999); // نهاية اليوم الحالي
      if (date > today) {
        throw new Error('تاريخ العينة لا يمكن أن يكون في المستقبل');
      }
      
      return true;
    }),
  body('quantity')
    .notEmpty().withMessage('الكمية مطلوبة')
    .isFloat({ min: 0.1 }).withMessage('الكمية يجب أن تكون أكبر من صفر'),
  body('unit')
    .notEmpty().withMessage('وحدة القياس مطلوبة')
    .isIn(['kg', 'g', 'l', 'ml']).withMessage('وحدة القياس غير صالحة'),
  body('storage_location')
    .notEmpty().withMessage('موقع التخزين مطلوب'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('الملاحظات يجب أن لا تتجاوز 500 حرف'),
  body('base_quantity')
    .notEmpty().withMessage('الكمية الأساسية مطلوبة')
    .isFloat({ min: 0.1 }).withMessage('الكمية الأساسية يجب أن تكون أكبر من صفر'),
  body('net_weight_total')
    .notEmpty().withMessage('الوزن الصافي مطلوب')
    .isFloat({ min: 0.1 }).withMessage('الوزن الصافي يجب أن يكون أكبر من صفر')
];

exports.supplierValidation = [
  body('name')
    .notEmpty().withMessage('اسم المورد مطلوب')
    .isLength({ min: 3 }).withMessage('اسم المورد يجب أن يكون 3 أحرف على الأقل'),
  body('contact_person')
    .notEmpty().withMessage('اسم الشخص المسؤول مطلوب')
    .isLength({ min: 3 }).withMessage('اسم الشخص المسؤول يجب أن يكون 3 أحرف على الأقل'),
  body('phone')
    .notEmpty().withMessage('رقم الهاتف مطلوب')
    .custom(isValidPhone).withMessage('رقم الهاتف غير صالح'),
  body('email')
    .optional()
    .isEmail().withMessage('البريد الإلكتروني غير صالح'),
  body('address')
    .notEmpty().withMessage('العنوان مطلوب'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('الملاحظات يجب أن لا تتجاوز 500 حرف')
];

exports.storageLocationValidation = [
  body('name')
    .notEmpty().withMessage('اسم موقع التخزين مطلوب')
    .isLength({ min: 3 }).withMessage('اسم موقع التخزين يجب أن يكون 3 أحرف على الأقل'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('الوصف يجب أن لا يتجاوز 500 حرف'),
  body('capacity')
    .optional()
    .isFloat({ min: 0 }).withMessage('السعة يجب أن تكون أكبر من أو تساوي صفر'),
  body('unit')
    .optional()
    .isIn(['kg', 'g', 'l', 'ml']).withMessage('وحدة القياس غير صالحة')
];

exports.inventoryTransferValidation = [
  body('sample_id')
    .notEmpty().withMessage('معرف العينة مطلوب')
    .isInt().withMessage('معرف العينة غير صالح'),
  body('from_location')
    .notEmpty().withMessage('موقع النقل من مطلوب'),
  body('to_location')
    .notEmpty().withMessage('موقع النقل إلى مطلوب')
    .custom((value, { req }) => {
      if (value === req.body.from_location) {
        throw new Error('موقع النقل من وإلى يجب أن يكونا مختلفين');
      }
      return true;
    }),
  body('quantity')
    .notEmpty().withMessage('الكمية مطلوبة')
    .isFloat({ min: 0.1 }).withMessage('الكمية يجب أن تكون أكبر من صفر'),
  body('transfer_date')
    .notEmpty().withMessage('تاريخ النقل مطلوب')
    .custom((value) => {
      // التحقق من تنسيق DD/MM/YYYY
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      if (!dateRegex.test(value)) {
        throw new Error('تاريخ النقل يجب أن يكون بالتنسيق يوم/شهر/سنة');
      }
      
      const [, day, month, year] = value.match(dateRegex);
      const date = new Date(year, month - 1, day);
      
      // التحقق من أن التاريخ صحيح
      if (date.getFullYear() != year || date.getMonth() != month - 1 || date.getDate() != day) {
        throw new Error('تاريخ النقل غير صالح');
      }
      
      return true;
    }),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('الملاحظات يجب أن لا تتجاوز 500 حرف')
]; 