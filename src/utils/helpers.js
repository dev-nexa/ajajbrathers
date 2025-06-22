const moment = require('moment');
require('moment/locale/ar');

moment.locale('en-gb');

// تنسيق التاريخ بالميلادي
exports.formatDate = (date) => {
  return moment(date).format('DD/MM/YYYY');
};

// تنسيق العملة
exports.formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR'
  }).format(amount);
};

// إنشاء رقم عينة فريد
exports.generateSampleNumber = () => {
  const prefix = 'SMP';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// إنشاء رقم شهادة فريد
exports.generateCertificateNumber = () => {
  const prefix = 'CERT';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

// التحقق من صحة البريد الإلكتروني
exports.isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

// التحقق من صحة رقم الهاتف
exports.isValidPhone = (phone) => {
  const re = /^[0-9]{10}$/;
  return re.test(phone);
};

// تنظيف النص من الأحرف الخاصة
exports.sanitizeText = (text) => {
  return text.replace(/[<>]/g, '');
};

// تحويل النص إلى عنوان URL
exports.slugify = (text) => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}; 