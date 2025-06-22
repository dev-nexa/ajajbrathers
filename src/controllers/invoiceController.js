const { pool } = require('../database/db');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// عرض قائمة الفواتير
exports.getInvoices = async (req, res) => {
    try {
        const { date, customer, invoice_number } = req.query;
        let query = `
            SELECT i.*, 
                   i.total_quantity_tanks,
                   i.total_quantity_liters,
                   u.username as created_by_name,
                   DATE_FORMAT(i.date, '%Y-%m-%d') as formatted_date
            FROM invoices i
            LEFT JOIN users u ON i.created_by = u.id
            WHERE 1=1
        `;
        const params = [];

        if (date) {
            query += ` AND DATE(i.date) = ?`;
            params.push(date);
        }
        if (customer) {
            query += ` AND i.customer_name LIKE ?`;
            params.push(`%${customer}%`);
        }
        if (invoice_number) {
            query += ` AND i.invoice_number LIKE ?`;
            params.push(`%${invoice_number}%`);
        }

        query += ` ORDER BY i.date DESC, i.id DESC`;

        const [invoices] = await pool.query(query, params);
        res.render('invoices/index', {
            title: 'الفواتير',
            invoices,
            filters: req.query,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching invoices:', error);
        req.flash('error_msg', 'حدث خطأ أثناء جلب بيانات الفواتير');
        res.redirect('/');
    }
};

// عرض نموذج إنشاء فاتورة جديدة
exports.getCreateForm = async (req, res) => {
    try {
        const [inventory] = await pool.query('SELECT * FROM inventory WHERE current_quantity > 0 ORDER BY date DESC');
        res.render('invoices/create', {
            title: 'إنشاء فاتورة جديدة',
            inventory,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error loading create form:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحميل النموذج');
        res.redirect('/invoices');
    }
};

// إنشاء فاتورة جديدة
exports.createInvoice = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        let {
            date,
            invoice_number,
            customer_name,
            driver_name,
            notes,
            quantities
        } = req.body;

        // معالجة quantities إذا كانت نصاً (JSON)
        if (typeof quantities === 'string') {
            try {
                quantities = JSON.parse(quantities);
            } catch (e) {
                throw new Error('خطأ في معالجة الكميات');
            }
        }

        // التحقق من صحة التاريخ والحصول على السنة
        let invoiceYear;
        try {
            if (!date || date.trim() === '') {
                const now = new Date();
                date = now.getFullYear() + '-' +
                    String(now.getMonth() + 1).padStart(2, '0') + '-' +
                    String(now.getDate()).padStart(2, '0');
            }
            const invoiceDate = new Date(date);
            if (isNaN(invoiceDate.getTime())) {
                throw new Error('التاريخ غير صالح');
            }
            invoiceYear = invoiceDate.getFullYear();
            if (isNaN(invoiceYear)) {
                throw new Error('لم نتمكن من استخراج السنة من التاريخ');
            }
        } catch (error) {
            throw new Error('خطأ في معالجة التاريخ: ' + error.message);
        }

        // التحقق فقط أن رقم الفاتورة عدد موجب
        const submittedNumber = parseInt(invoice_number);
        if (isNaN(submittedNumber) || submittedNumber <= 0) {
            throw new Error('رقم الفاتورة يجب أن يكون عدداً موجباً');
        }

        // التحقق من وجود كميات
        if (!quantities || Object.keys(quantities).length === 0) {
            throw new Error('يجب اختيار عنصر واحد على الأقل');
        }

        let totalQuantity = 0;
        let totalQuantityLiters = 0;
        let weightedSumPH = 0;
        let weightedSumPeroxide = 0;
        let weightedSum232 = 0;
        let weightedSum270 = 0;
        let weightedSumDeltaK = 0;

        // التحقق من توفر الكميات المطلوبة وجمع البيانات للمعدلات
        for (const [inventory_id, quantity] of Object.entries(quantities)) {

            const [rows] = await connection.query(
                `SELECT current_quantity, ph, peroxide_value, 
                        absorption_readings,
                        sigma_absorbance,
                        supplier_or_sample_name,
                        sample_number
                 FROM inventory WHERE id = ?`,
                [inventory_id]
            );

            if (rows.length === 0) {
                throw new Error(`العنصر غير موجود: ${inventory_id}`);
            }

            const inventoryItem = rows[0];

            const requestedQuantity = parseFloat(quantity);
            const availableQuantity = parseFloat(inventoryItem.current_quantity);

            if (requestedQuantity > availableQuantity) {
                throw new Error(`الكمية المطلوبة (${requestedQuantity}) أكبر من المتوفرة (${availableQuantity}) للعنصر: ${inventoryItem.sample_number}`);
            }

            totalQuantity += requestedQuantity;
            totalQuantityLiters += requestedQuantity * 16; // تحويل الكمية إلى ليتر (16 لتر لكل تنكة)

            // استخراج قيم الامتصاص من حقل absorption_readings
            let absorptionReadings = [0, 0, 0, 0, 0];
            try {
                if (inventoryItem.absorption_readings) {
                    if (typeof inventoryItem.absorption_readings === 'string') {
                        // تحويل النص إلى مصفوفة أرقام
                        const readings = inventoryItem.absorption_readings.split(' ').map(Number);
                        if (readings.length >= 5) {
                            absorptionReadings = readings;
                        }
                    } else if (Array.isArray(inventoryItem.absorption_readings)) {
                        absorptionReadings = inventoryItem.absorption_readings;
                    }
                }
            } catch (e) {
                console.error('Error parsing absorption readings:', e);
            }

            // حساب المجاميع الموزونة
            const ph = parseFloat(inventoryItem.ph) || 0;
            const peroxide = parseFloat(inventoryItem.peroxide_value) || 0;
            const sigma = parseFloat(inventoryItem.sigma_absorbance) || 0;

            weightedSumPH += requestedQuantity * ph;
            weightedSumPeroxide += requestedQuantity * peroxide;
            weightedSum232 += requestedQuantity * (absorptionReadings[0] || 0);
            weightedSum270 += requestedQuantity * sigma;
            weightedSumDeltaK += requestedQuantity * (absorptionReadings[4] || 0);

            // تحديث الكمية في المخزون
            await connection.query(
                'UPDATE inventory SET current_quantity = current_quantity - ? WHERE id = ?',
                [requestedQuantity, inventory_id]
            );

        }

        // حساب المتوسطات الموزونة - التعامل مع حالة عدم وجود كميات
        const avgPH = totalQuantity > 0 ? weightedSumPH / totalQuantity : 0;
        const avgPeroxide = totalQuantity > 0 ? weightedSumPeroxide / totalQuantity : 0;
        const avg232 = totalQuantity > 0 ? weightedSum232 / totalQuantity : 0;
        const avg270 = totalQuantity > 0 ? weightedSum270 / totalQuantity : 0;
        const avgDeltaK = totalQuantity > 0 ? weightedSumDeltaK / totalQuantity : 0;

        // إنشاء الفاتورة
        const [result] = await connection.query(
            `INSERT INTO invoices (
                invoice_number, customer_name, driver_name,
                date, total_amount, status, notes, created_by,
                avg_ph, avg_peroxide, avg_232, avg_270, avg_delta_k,
                total_quantity_tanks, total_quantity_liters
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                invoice_number, customer_name, driver_name,
                date, totalQuantityLiters, 'unpaid', notes, req.session.user.id,
                avgPH, avgPeroxide, avg232, avg270, avgDeltaK,
                totalQuantity, totalQuantityLiters
            ]
        );

        const invoice_id = result.insertId;

        // إضافة عناصر الفاتورة
        for (const [inventory_id, quantity] of Object.entries(quantities)) {
            const [item] = await connection.query(
                'SELECT * FROM inventory WHERE id = ?',
                [inventory_id]
            );

            if (item.length > 0) {
                const inventoryItem = item[0];
                let absorptionReadings = [0, 0, 0, 0, 0];

                try {
                    if (inventoryItem.absorption_readings) {
                        if (typeof inventoryItem.absorption_readings === 'string') {
                            const readings = inventoryItem.absorption_readings.split(' ').map(Number);
                            if (readings.length >= 5) {
                                absorptionReadings = readings;
                            }
                        } else if (Array.isArray(inventoryItem.absorption_readings)) {
                            absorptionReadings = inventoryItem.absorption_readings;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing absorption readings for invoice item:', e);
                }

                const requestedQuantity = parseFloat(quantity);
                const ph = parseFloat(inventoryItem.ph) || 0;
                const peroxide = parseFloat(inventoryItem.peroxide_value) || 0;
                const netWeight = requestedQuantity * (inventoryItem.net_weight_total / inventoryItem.base_quantity);

                await connection.query(
                    `INSERT INTO invoice_items (
                        invoice_id, inventory_id, quantity,
                        ph, peroxide_value, absorption_232,
                        absorption_266, absorption_270, absorption_274,
                        delta_k, net_weight, sample_number
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        invoice_id, inventory_id, requestedQuantity,
                        ph, peroxide, absorptionReadings[0] || 0,
                        absorptionReadings[1] || 0, absorptionReadings[2] || 0, absorptionReadings[3] || 0,
                        absorptionReadings[4] || 0, netWeight, inventoryItem.sample_number
                    ]
                );

            }
        }

        await connection.commit();

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.json({
                success: true,
                message: 'تم إنشاء الفاتورة بنجاح',
                invoiceId: invoice_id
            });
        }

        req.flash('success_msg', 'تم إنشاء الفاتورة بنجاح');
        res.redirect('/invoices/' + invoice_id);

    } catch (error) {
        await connection.rollback();
        console.error('Error creating invoice:', error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: error.message || 'حدث خطأ أثناء إنشاء الفاتورة'
            });
        }
        req.flash('error_msg', error.message || 'حدث خطأ أثناء إنشاء الفاتورة');
        res.redirect('/invoices/create');
    } finally {
        connection.release();
    }
};

// عرض فاتورة
exports.getInvoice = async (req, res) => {
    try {
        const [invoices] = await pool.query(
            `SELECT i.*, u.username as created_by_name
             FROM invoices i
             LEFT JOIN users u ON i.created_by = u.id
             WHERE i.id = ?`,
            [req.params.id]
        );

        if (invoices.length === 0) {
            req.flash('error_msg', 'الفاتورة غير موجودة');
            return res.redirect('/invoices');
        }

        const [items] = await pool.query(
            `SELECT ii.*, inv.sample_number
             FROM invoice_items ii
             JOIN inventory inv ON ii.inventory_id = inv.id
             WHERE ii.invoice_id = ?`,
            [req.params.id]
        );

        res.render('invoices/view', {
            title: 'عرض الفاتورة',
            invoice: invoices[0],
            items,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching invoice:', error);
        req.flash('error_msg', 'حدث خطأ أثناء جلب بيانات الفاتورة');
        res.redirect('/invoices');
    }
};

// طباعة فاتورة
exports.printInvoice = async (req, res) => {
    try {
        const [invoices] = await pool.query(
            `SELECT i.*, u.username as created_by_name
             FROM invoices i
             LEFT JOIN users u ON i.created_by = u.id
             WHERE i.id = ?`,
            [req.params.id]
        );

        if (invoices.length === 0) {
            req.flash('error_msg', 'الفاتورة غير موجودة');
            return res.redirect('/invoices');
        }

        const [items] = await pool.query(
            `SELECT ii.*, inv.sample_number
             FROM invoice_items ii
             JOIN inventory inv ON ii.inventory_id = inv.id
             WHERE ii.invoice_id = ?`,
            [req.params.id]
        );

        // تمرير user: null إذا لم يوجد مستخدم في الجلسة
        res.render('invoices/print', {
            title: 'طباعة الفاتورة',
            invoice: invoices[0],
            items,
            user: req.session.user || null,
            layout: 'invoices/print'
        });
    } catch (error) {
        console.error('Error printing invoice:', error);
        req.flash('error_msg', 'حدث خطأ أثناء طباعة الفاتورة');
        res.redirect('/invoices');
    }
};

// حذف فاتورة
exports.deleteInvoice = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const invoiceId = req.params.id;

        // التحقق من وجود الفاتورة
        const [invoice] = await connection.query('SELECT * FROM invoices WHERE id = ?', [invoiceId]);
        if (!invoice || invoice.length === 0) {
            throw new Error('الفاتورة غير موجودة');
        }

        // جلب عناصر الفاتورة
        const [items] = await connection.query('SELECT inventory_id, quantity FROM invoice_items WHERE invoice_id = ?', [invoiceId]);
        for (const item of items) {
            // تحقق إذا كانت العينة موجودة
            const [inventory] = await connection.query('SELECT id FROM inventory WHERE id = ?', [item.inventory_id]);
            if (inventory && inventory.length > 0) {
                // إرجاع الكمية
                await connection.query('UPDATE inventory SET current_quantity = current_quantity + ? WHERE id = ?', [item.quantity, item.inventory_id]);
            }
        }

        // حذف تفاصيل الفاتورة أولاً (العلاقة الفرعية)
        await connection.query('DELETE FROM invoice_items WHERE invoice_id = ?', [invoiceId]);

        // ثم حذف الفاتورة نفسها
        await connection.query('DELETE FROM invoices WHERE id = ?', [invoiceId]);

        await connection.commit();

        res.json({ success: true, message: 'تم حذف الفاتورة بنجاح' });
    } catch (error) {
        await connection.rollback();
        console.error('Error deleting invoice:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء حذف الفاتورة',
            error: error.message
        });
    } finally {
        connection.release();
    }
};

exports.exportInvoicePDF = async (req, res) => {
    const pdf = require('html-pdf-node');
    try {
        const invoiceUrl = `${process.env.BASE_URL}/invoices/${req.params.id}/print-pdf-raw`;

        const options = { format: 'A4' };
        const file = { url: invoiceUrl };

        const fileName = uuidv4() + '.pdf';
        const savePath = path.join(__dirname, '../public/invoices_pdf', fileName);

        // تأكد من وجود مجلد الحفظ
        const dir = path.join(__dirname, '../public/invoices_pdf');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        const pdfBuffer = await pdf.generatePdf(file, options);
        fs.writeFileSync(savePath, pdfBuffer);

        const fileUrl = `${req.protocol}://${req.get('host')}/public/invoices_pdf/${fileName}`;

        res.json({
            success: true,
            url: fileUrl
        });
    } catch (error) {
        console.error('Error exporting invoice PDF:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء تصدير الفاتورة كـ PDF' });
    }
};

module.exports = exports; 