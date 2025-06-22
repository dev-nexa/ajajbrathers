const { body } = require('express-validator');
const { isValidPhone } = require('../utils/helpers');

exports.certificateValidation = [
  body('certificate_number')
    .notEmpty().withMessage('رقم الشهادة مطلوب')
    .isLength({ min: 10 }).withMessage('رقم الشهادة غير صالح'),
  body('customer_or_supplier_name')
    .notEmpty().withMessage('اسم العميل أو المورد مطلوب')
    .isLength({ min: 3 }).withMessage('اسم العميل أو المورد يجب أن يكون 3 أحرف على الأقل'),
  body('analysis_date')
    .notEmpty().withMessage('تاريخ التحليل مطلوب')
    .isISO8601().withMessage('تاريخ التحليل غير صالح'),
  body('sample_number')
    .notEmpty().withMessage('رقم العينة مطلوب')
    .isLength({ min: 10 }).withMessage('رقم العينة غير صالح'),
  body('analysis_type')
    .notEmpty().withMessage('نوع التحليل مطلوب')
    .isIn(['physical', 'chemical', 'microbiological']).withMessage('نوع التحليل غير صالح'),
  body('results')
    .notEmpty().withMessage('نتائج التحليل مطلوبة')
    .isArray().withMessage('نتائج التحليل يجب أن تكون مصفوفة'),
  body('results.*.parameter')
    .notEmpty().withMessage('معامل التحليل مطلوب'),
  body('results.*.value')
    .notEmpty().withMessage('قيمة التحليل مطلوبة'),
  body('results.*.unit')
    .notEmpty().withMessage('وحدة القياس مطلوبة'),
  body('results.*.standard')
    .optional()
    .isFloat({ min: 0 }).withMessage('المعيار يجب أن يكون أكبر من أو يساوي صفر'),
  body('conclusion')
    .notEmpty().withMessage('الخلاصة مطلوبة')
    .isLength({ min: 10 }).withMessage('الخلاصة يجب أن تكون 10 أحرف على الأقل'),
  body('notes')
    .optional()
    .isLength({ max: 500 }).withMessage('الملاحظات يجب أن لا تتجاوز 500 حرف')
];

exports.customerValidation = [
  body('name')
    .notEmpty().withMessage('اسم العميل مطلوب')
    .isLength({ min: 3 }).withMessage('اسم العميل يجب أن يكون 3 أحرف على الأقل'),
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

exports.analysisTypeValidation = [
  body('name')
    .notEmpty().withMessage('اسم نوع التحليل مطلوب')
    .isLength({ min: 3 }).withMessage('اسم نوع التحليل يجب أن يكون 3 أحرف على الأقل'),
  body('description')
    .optional()
    .isLength({ max: 500 }).withMessage('الوصف يجب أن لا يتجاوز 500 حرف'),
  body('parameters')
    .notEmpty().withMessage('معاملات التحليل مطلوبة')
    .isArray().withMessage('معاملات التحليل يجب أن تكون مصفوفة'),
  body('parameters.*.name')
    .notEmpty().withMessage('اسم المعامل مطلوب'),
  body('parameters.*.unit')
    .notEmpty().withMessage('وحدة القياس مطلوبة'),
  body('parameters.*.standard')
    .optional()
    .isFloat({ min: 0 }).withMessage('المعيار يجب أن يكون أكبر من أو يساوي صفر')
]; 