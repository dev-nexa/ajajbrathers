const { body } = require('express-validator');
const { isValidEmail } = require('../utils/helpers');

exports.loginValidation = [
  body('email')
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('البريد الإلكتروني غير صالح'),
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة')
    .isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
];

exports.registerValidation = [
  body('name')
    .notEmpty().withMessage('الاسم مطلوب')
    .isLength({ min: 3 }).withMessage('الاسم يجب أن يكون 3 أحرف على الأقل'),
  body('email')
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('البريد الإلكتروني غير صالح')
    .custom(isValidEmail).withMessage('البريد الإلكتروني غير صالح'),
  body('password')
    .notEmpty().withMessage('كلمة المرور مطلوبة')
    .isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .matches(/\d/).withMessage('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل')
    .matches(/[A-Z]/).withMessage('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل'),
  body('confirmPassword')
    .notEmpty().withMessage('تأكيد كلمة المرور مطلوب')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('كلمات المرور غير متطابقة');
      }
      return true;
    })
];

exports.resetPasswordValidation = [
  body('email')
    .notEmpty().withMessage('البريد الإلكتروني مطلوب')
    .isEmail().withMessage('البريد الإلكتروني غير صالح'),
  body('token')
    .notEmpty().withMessage('رمز إعادة تعيين كلمة المرور مطلوب'),
  body('password')
    .notEmpty().withMessage('كلمة المرور الجديدة مطلوبة')
    .isLength({ min: 6 }).withMessage('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
    .matches(/\d/).withMessage('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل')
    .matches(/[A-Z]/).withMessage('كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل'),
  body('confirmPassword')
    .notEmpty().withMessage('تأكيد كلمة المرور مطلوب')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('كلمات المرور غير متطابقة');
      }
      return true;
    })
]; 