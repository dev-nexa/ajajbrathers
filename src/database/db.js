const mysql = require('mysql2/promise');

// إنشاء تجمع الاتصالات
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lab_inventory',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// اختبار الاتصال
pool.getConnection()
    .then(connection => {
        console.log('Connected to MySQL server');
        connection.release();
    })
    .catch(err => {
        console.error('خطأ في الاتصال بقاعدة البيانات:', err);
    });

module.exports = { pool }; 