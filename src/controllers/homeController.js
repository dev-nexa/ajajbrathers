const { pool } = require('../database/db');

exports.getHome = async (req, res) => {
    try {

        // جلب آخر 3 عينات
        const samplesQuery = `
            SELECT 
                i.id,
                i.sample_number,
                i.supplier_or_sample_name,
                DATE_FORMAT(i.date, '%Y-%m-%d') as date,
                COALESCE(u.username, 'النظام') as created_by_name
            FROM inventory i
            LEFT JOIN users u ON i.created_by = u.id
            WHERE i.updated_at IS NOT NULL
            ORDER BY i.date DESC
            LIMIT 3
        `;
        const [recentSamples] = await pool.query(samplesQuery);

        // جلب آخر 3 شهادات
        const certificatesQuery = `
            SELECT 
                c.id,
                c.certificate_number,
                c.customer_name as customer_or_supplier_name,
                DATE_FORMAT(c.date, '%Y-%m-%d') as analysis_date,
                COALESCE(u.username, 'النظام') as created_by_name
            FROM certificates c
            LEFT JOIN users u ON c.created_by = u.id
            WHERE c.updated_at IS NOT NULL
            ORDER BY c.date DESC
            LIMIT 3
        `;
        const [recentCertificates] = await pool.query(certificatesQuery);

        // جلب آخر 3 فواتير مع عدد العناصر لكل فاتورة
        const invoicesQuery = `
            SELECT 
                i.id,
                i.invoice_number,
                DATE_FORMAT(i.date, '%Y-%m-%d') as date,
                i.total_amount,
                i.customer_name,
                COALESCE(u.username, 'النظام') as created_by_name,
                (
                    SELECT COUNT(*)
                    FROM invoice_items ii
                    WHERE ii.invoice_id = i.id
                ) as items_count
            FROM invoices i
            LEFT JOIN users u ON i.created_by = u.id
            WHERE i.updated_at IS NOT NULL
            ORDER BY i.date DESC
            LIMIT 3
        `;
        const [recentInvoices] = await pool.query(invoicesQuery);

        // تجميع كل البيانات للعرض
        const viewData = {
            title: 'الرئيسية',
            user: req.session.user,
            recentSamples: recentSamples || [],
            recentCertificates: recentCertificates || [],
            recentInvoices: recentInvoices || [],
            debug: true // تفعيل وضع التصحيح دائماً للفحص
        };


        res.render('index', viewData);
    } catch (error) {
        console.error('Error Type:', error.constructor.name);
        console.error('Error Message:', error.message);
        console.error('Error Stack:', error.stack);
        
        if (error.sql) {
            console.error('SQL Error:', {
                code: error.code,
                errno: error.errno,
                sqlMessage: error.sqlMessage,
                sqlState: error.sqlState,
                sql: error.sql
            });
        }

        let errorMessage = 'حدث خطأ أثناء تحميل البيانات';
        if (error.code === 'ER_NO_SUCH_TABLE') {
            errorMessage = 'خطأ: جدول غير موجود - ' + error.message;
        } else if (error.code === 'ER_BAD_FIELD_ERROR') {
            errorMessage = 'خطأ: عمود غير موجود - ' + error.message;
        }

        req.flash('error_msg', errorMessage);
        res.render('index', {
            title: 'الرئيسية',
            user: req.session.user,
            recentSamples: [],
            recentCertificates: [],
            recentInvoices: [],
            debug: true,
            error: errorMessage
        });
    }
}; 