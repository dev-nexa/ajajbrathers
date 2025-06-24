require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');
const flash = require('connect-flash');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const methodOverride = require('method-override');
const cron = require('node-cron');
const { pool } = require('./database/db');
const { authMiddleware } = require('./middleware/auth');
const morgan = require('morgan');

// إنشاء تطبيق Express
const app = express();

// إعداد ترويسة الأمان باستخدام helmet
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:", "http:"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "http:", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
}));

// إعداد الوسائط (middlewares) - يجب أن تكون بهذا الترتيب

app.use(express.json({ limit: '50mb' }));
// تسجيل body للطلبات والردود (اختياري - لمراقبة التفاصيل الدقيقة)

app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// إضافة method-override للتعامل مع PUT/DELETE requests
app.use(methodOverride('_method'));

// إعدادات القوالب
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set("layout extractScripts", true);
app.set("layout extractStyles", true);

// إعداد الملفات الثابتة
app.use('/public', express.static(path.join(__dirname, 'public'), {
    maxAge: '1d',
    etag: false
}));

// إعداد الجلسة (Session)
const sessionStore = new MySQLStore({
    expiration: 24 * 60 * 60 * 1000, // 24 ساعة
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data'
        }
    }
}, pool);

app.set('trust proxy', 1); // لإبلاغ Express بأن الاتصال آمن خلف بروكسي

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000, // 24 ساعة
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// إعداد رسائل الفلاش
app.use(flash());

// إضافة اتصال قاعدة البيانات إلى كل طلب
app.use(async (req, res, next) => {
    try {
        const connection = await pool.getConnection();
        req.db = connection;
        res.on('finish', () => {
            connection.release();
        });
        next();
    } catch (error) {
        next(error);
    }
});

// وسيط المصادقة
app.use((req, res, next) => {
    const publicPaths = [
        '/inventory/print-pdf-raw',
        '/inventory/export/pdf'
    ];
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }
    return authMiddleware(req, res, next);
});

// المتغيرات العامة للـ Views
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    res.locals.user = req.session.user || null;
    res.locals.appName = 'نظام إدارة المختبر';
    res.locals.title = 'نظام إدارة المختبر'; // العنوان الافتراضي
    next();
});

// تعطيل layout الافتراضي لمسار طباعة PDF المخزون فقط
app.use((req, res, next) => {
  if (req.path.startsWith('/inventory/print-pdf-raw')) {
    res.locals.layout = false;
  }
  next();
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.render('index', {
        title: 'نظام إدارة المختبر',
        user: req.session.user
    });
});

// المسارات
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/inventory', require('./routes/inventory'));
app.use('/invoices', require('./routes/invoices'));
app.use('/users', require('./routes/users'));
app.use('/certificates', require('./routes/certificates'));
app.use('/exports', require('./routes/exports'));

// معالجة خطأ 404
app.use((req, res, next) => {
    res.status(404).render('error', {
        title: 'خطأ 404',
        message: 'الصفحة غير موجودة',
        error: {}
    });
});

// معالجة الأخطاء العامة
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        title: 'خطأ في الخادم',
        message: 'حدث خطأ في الخادم',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

// Cron Job لحذف السجلات المحذوفة ناعماً (كل يوم عند منتصف الليل)
cron.schedule('0 0 * * *', async () => {
    const conn = await pool.getConnection();
    try {        
        // حذف السجلات المحذوفة ناعماً التي يزيد عمرها عن شهر واحد
        const [certificatesResult] = await conn.query(`
            DELETE FROM certificates WHERE deleted_at < NOW() - INTERVAL 1 MONTH
        `);
        
        const [inventoryResult] = await conn.query(`
            DELETE FROM inventory WHERE deleted_at < NOW() - INTERVAL 1 MONTH
        `);
        
        const [invoicesResult] = await conn.query(`
            DELETE FROM invoices WHERE deleted_at < NOW() - INTERVAL 1 MONTH
        `);
        
    } catch (error) {
        console.error('خطأ في عملية حذف السجلات المحذوفة ناعماً:', error);
    } finally {
        conn.release();
    }
}, {
    scheduled: true,
    timezone: "Asia/Damascus" // توقيت دمشق
});

// تشغيل الخادم
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
