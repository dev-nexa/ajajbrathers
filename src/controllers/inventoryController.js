const { pool } = require('../database/db');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// دالة لتحويل التاريخ من تنسيق DD/MM/YYYY إلى ISO
function convertDateToISO(dateString) {
    if (!dateString) return null;
    
    // إذا كان التاريخ بالفعل بتنسيق ISO، ارجعه كما هو
    if (dateString.includes('-') && dateString.length === 10) {
        return dateString;
    }
    
    // إذا كان التاريخ بتنسيق DD/MM/YYYY
    if (dateString.includes('/')) {
        const [day, month, year] = dateString.split('/');
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return dateString;
}

// دالة تجلب بيانات المخزون فقط (بدون رندر)
exports.fetchInventoryData = async (query) => {
    const { date, supplier, sample_number, positive_quantity } = query;
    let sql = `
        SELECT *, COALESCE(is_rejected, 0) as is_rejected FROM inventory 
        WHERE 1=1
    `;
    const params = [];

    if (date) {
        let formattedDate;
        if (date.includes('/')) {
            const [day, month, year] = date.split('/');
            formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } else {
            formattedDate = date;
        }
        sql += ` AND DATE(date) = ?`;
        params.push(formattedDate);
    }
    if (supplier) {
        sql += ` AND supplier_or_sample_name LIKE ?`;
        params.push(`%${supplier}%`);
    }
    if (sample_number) {
        sql += ` AND sample_number LIKE ?`;
        params.push(`%${sample_number}%`);
    }
    if (positive_quantity === '1') {
        sql += ` AND current_quantity > 0`;
    }
    sql += ` ORDER BY CAST(sample_number AS UNSIGNED) DESC`;
    const [inventory] = await pool.query(sql, params);
    return inventory;
};

// عرض صفحة المخزون
exports.getInventory = async (req, res) => {
    try {
        const inventory = await exports.fetchInventoryData(req.query);

        // Calculate total current quantity
        const [totalResult] = await pool.query('SELECT SUM(current_quantity) as total FROM inventory WHERE current_quantity > 0');
        const totalCurrentQuantity = totalResult[0].total || 0;

        res.render('inventory/index', {
            inventory,
            filters: req.query,
            user: req.session.user,
            totalCurrentQuantity
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).render('error', {
            message: 'حدث خطأ أثناء جلب بيانات المخزون',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// عرض تفاصيل عينة واحدة
exports.getInventoryItem = async (req, res) => {
    try {
        // Get inventory item details
        const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).render('error', { message: 'العينة غير موجودة' });
        }

        // Get sales data for this inventory item
        const [sales] = await pool.query(`
            SELECT 
                i.id as invoice_id,
                i.invoice_number,
                i.date,
                i.customer_name,
                i.driver_name,
                ii.quantity,
                ii.net_weight
            FROM invoice_items ii
            JOIN invoices i ON ii.invoice_id = i.id
            WHERE ii.inventory_id = ?
            ORDER BY i.date DESC, i.id DESC
        `, [req.params.id]);

        res.render('inventory/show', {
            item: rows[0],
            sales: sales,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching inventory item details:', error);
        res.status(500).render('error', {
            message: 'حدث خطأ أثناء جلب تفاصيل العينة',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// عرض صفحة إضافة عينة جديدة
exports.getCreateForm = async (req, res) => {
    try {
        res.render('inventory/create', {
            user: req.session.user
        });
    } catch (error) {
        console.error('Error getting create form:', error);
        res.render('inventory/create', {
            user: req.session.user
        });
    }
};

// إضافة عينة جديدة
exports.createInventory = async (req, res) => {
    try {
        const {
            date,
            sample_number,
            supplier_or_sample_name,
            base_quantity,
            net_weight_total,
            ph,
            peroxide_value,
            absorption_readings,
            sigma_absorbance,
            analyst,
            notes,
            sample_weight
        } = req.body;

        // التحقق من القيم المدخلة
        if (!date) {
            req.flash('error_msg', 'الرجاء إدخال التاريخ');
            return res.redirect('/inventory/create');
        }

        if (!sample_number || sample_number.trim() === '') {
            req.flash('error_msg', 'الرجاء إدخال رقم العينة');
            return res.redirect('/inventory/create');
        }

        if (!supplier_or_sample_name || supplier_or_sample_name.trim() === '') {
            req.flash('error_msg', 'الرجاء إدخال اسم المورد أو العينة');
            return res.redirect('/inventory/create');
        }

        if (!analyst || analyst.trim() === '') {
            req.flash('error_msg', 'الرجاء إدخال اسم المحلل');
            return res.redirect('/inventory/create');
        }

        // تحويل التاريخ إلى تنسيق ISO
        const isoDate = convertDateToISO(date);
        if (!isoDate) {
            req.flash('error_msg', 'الرجاء إدخال تاريخ صحيح');
            return res.redirect('/inventory/create');
        }

        // التحقق من صحة التاريخ
        const dateObj = new Date(isoDate);
        if (isNaN(dateObj.getTime())) {
            req.flash('error_msg', 'الرجاء إدخال تاريخ صحيح');
            return res.redirect('/inventory/create');
        }

        if (!base_quantity || parseFloat(base_quantity) <= 0) {
            req.flash('error_msg', 'الرجاء إدخال الكمية بشكل صحيح');
            return res.redirect('/inventory/create');
        }

        if (!net_weight_total || parseFloat(net_weight_total) <= 0) {
            req.flash('error_msg', 'الرجاء إدخال الوزن الصافي بشكل صحيح');
            return res.redirect('/inventory/create');
        }

        if (!ph || parseFloat(ph) <= 0) {
            req.flash('error_msg', 'الرجاء إدخال درجة الحموضة بشكل صحيح');
            return res.redirect('/inventory/create');
        }

        // معالجة قراءات الامتصاص
        let processedAbsorptionReadings = absorption_readings ? absorption_readings.trim() : '';
        
        // تنظيف القراءات من المسافات الزائدة والتبويبات
        processedAbsorptionReadings = processedAbsorptionReadings.replace(/\s+/g, ' ');
        
        const readingsArr = processedAbsorptionReadings.split(' ');
        
        // التحقق من وجود قراءات
        if (readingsArr.length === 0 || (readingsArr.length === 1 && readingsArr[0] === '')) {
            req.flash('error_msg', 'يجب إدخال قراءات الامتصاص');
            return res.redirect('/inventory/create');
        }
        
        // إذا كان هناك أقل من 5 قراءات، نضيف قيم فارغة
        while (readingsArr.length < 5) {
            readingsArr.push('');
        }
        
        // إذا كان هناك أكثر من 5 قراءات، نأخذ أول 5 فقط
        if (readingsArr.length > 5) {
            readingsArr.splice(5);
        }
        
        processedAbsorptionReadings = readingsArr.join(' ');

        // Insert new inventory item
        await pool.query(
            `INSERT INTO inventory (
                date, sample_number, supplier_or_sample_name,
                base_quantity, current_quantity, net_weight_total,
                ph, peroxide_value, absorption_readings,
                sigma_absorbance, analyst, notes, sample_weight
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                isoDate, sample_number, supplier_or_sample_name,
                base_quantity, base_quantity, net_weight_total,
                ph || null, peroxide_value || null, processedAbsorptionReadings,
                sigma_absorbance || null, analyst, notes, sample_weight && sample_weight !== '' ? parseFloat(sample_weight).toFixed(3) : null
            ]
        );

        req.flash('success_msg', 'تمت إضافة العينة بنجاح');
        res.redirect('/inventory');
    } catch (error) {
        console.error('Error creating inventory item:', error);
        
        // رسائل خطأ أكثر تفصيلاً
        let errorMessage = 'حدث خطأ أثناء إضافة العينة';
        
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'رقم العينة موجود مسبقاً، يرجى استخدام رقم آخر';
        } else if (error.sqlMessage) {
            errorMessage = `خطأ في قاعدة البيانات: ${error.sqlMessage}`;
        }
        
        req.flash('error_msg', errorMessage);
        res.redirect('/inventory/create');
    }
};

// عرض صفحة تعديل عينة
exports.getEditForm = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory WHERE id = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).render('error', { message: 'العينة غير موجودة' });
        }
        res.render('inventory/edit', { item: rows[0], user: req.session.user });
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).render('error', {
            message: 'حدث خطأ أثناء جلب بيانات العينة',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// تحديث عنصر في المخزون
exports.updateInventory = async (req, res) => {
    try {
        const {
            date,
            sample_number,
            supplier_or_sample_name,
            base_quantity,
            current_quantity,
            net_weight_total,
            ph,
            peroxide_value,
            absorption_readings,
            sigma_absorbance,
            analyst,
            notes,
            sample_weight
        } = req.body;

        // التحقق من القيم المدخلة
        if (!date) {
            req.flash('error_msg', 'الرجاء إدخال التاريخ');
            return res.redirect(`/inventory/${req.params.id}/edit`);
        }

        if (!sample_number || sample_number.trim() === '') {
            req.flash('error_msg', 'الرجاء إدخال رقم العينة');
            return res.redirect(`/inventory/${req.params.id}/edit`);
        }

        if (!supplier_or_sample_name || supplier_or_sample_name.trim() === '') {
            req.flash('error_msg', 'الرجاء إدخال اسم المورد أو العينة');
            return res.redirect(`/inventory/${req.params.id}/edit`);
        }

        if (!analyst || analyst.trim() === '') {
            req.flash('error_msg', 'الرجاء إدخال اسم المحلل');
            return res.redirect(`/inventory/${req.params.id}/edit`);
        }

        // تحويل التاريخ إلى تنسيق ISO
        const isoDate = convertDateToISO(date);
        if (!isoDate) {
            req.flash('error_msg', 'الرجاء إدخال تاريخ صحيح');
            return res.redirect(`/inventory/${req.params.id}/edit`);
        }

        // التحقق من صحة التاريخ
        const dateObj = new Date(isoDate);
        if (isNaN(dateObj.getTime())) {
            req.flash('error_msg', 'الرجاء إدخال تاريخ صحيح');
            return res.redirect(`/inventory/${req.params.id}/edit`);
        }

        if (!base_quantity || parseFloat(base_quantity) <= 0) {
            req.flash('error_msg', 'الرجاء إدخال الكمية الأساسية بشكل صحيح');
            return res.redirect(`/inventory/${req.params.id}/edit`);
        }

        if (!current_quantity || parseFloat(current_quantity) <= 0) {
            req.flash('error_msg', 'الرجاء إدخال الكمية الحالية بشكل صحيح');
            return res.redirect(`/inventory/${req.params.id}/edit`);
        }

        if (!net_weight_total || parseFloat(net_weight_total) <= 0) {
            req.flash('error_msg', 'الرجاء إدخال الوزن الصافي بشكل صحيح');
            return res.redirect(`/inventory/${req.params.id}/edit`);
        }

        if (!ph || parseFloat(ph) <= 0) {
            req.flash('error_msg', 'الرجاء إدخال درجة الحموضة بشكل صحيح');
            return res.redirect(`/inventory/${req.params.id}/edit`);
        }

        // معالجة قراءات الامتصاص
        let processedAbsorptionReadings = absorption_readings ? absorption_readings.trim() : '';
        
        // تنظيف القراءات من المسافات الزائدة والتبويبات
        processedAbsorptionReadings = processedAbsorptionReadings.replace(/\s+/g, ' ');
        
        const readingsArr = processedAbsorptionReadings.split(' ');
        
        // التحقق من وجود قراءات
        if (readingsArr.length === 0 || (readingsArr.length === 1 && readingsArr[0] === '')) {
            req.flash('error_msg', 'يجب إدخال قراءات الامتصاص');
            return res.redirect(`/inventory/${req.params.id}/edit`);
        }
        
        // إذا كان هناك أقل من 5 قراءات، نضيف قيم فارغة
        while (readingsArr.length < 5) {
            readingsArr.push('');
        }
        
        // إذا كان هناك أكثر من 5 قراءات، نأخذ أول 5 فقط
        if (readingsArr.length > 5) {
            readingsArr.splice(5);
        }
        
        processedAbsorptionReadings = readingsArr.join(' ');

        // Update inventory item
        await pool.query(
            `UPDATE inventory SET
                date = ?,
                sample_number = ?,
                supplier_or_sample_name = ?,
                base_quantity = ?,
                current_quantity = ?,
                net_weight_total = ?,
                ph = ?,
                peroxide_value = ?,
                absorption_readings = ?,
                sigma_absorbance = ?,
                analyst = ?,
                notes = ?,
                sample_weight = ?
            WHERE id = ?`,
            [
                isoDate,
                sample_number,
                supplier_or_sample_name,
                base_quantity,
                current_quantity,
                net_weight_total,
                ph || null,
                peroxide_value || null,
                processedAbsorptionReadings,
                sigma_absorbance || null,
                analyst,
                notes,
                sample_weight && sample_weight !== '' ? parseFloat(sample_weight).toFixed(3) : null,
                req.params.id
            ]
        );

        req.flash('success_msg', 'تم تحديث العينة بنجاح');
        res.redirect('/inventory');
    } catch (error) {
        console.error('Error updating inventory item:', error);
        
        // رسائل خطأ أكثر تفصيلاً
        let errorMessage = 'حدث خطأ أثناء تحديث العينة';
        
        if (error.code === 'ER_DUP_ENTRY') {
            errorMessage = 'رقم العينة موجود مسبقاً، يرجى استخدام رقم آخر';
        } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            errorMessage = 'العينة غير موجودة أو تم حذفها';
        } else if (error.sqlMessage) {
            errorMessage = `خطأ في قاعدة البيانات: ${error.sqlMessage}`;
        }
        
        req.flash('error_msg', errorMessage);
        res.redirect(`/inventory/${req.params.id}/edit`);
    }
};

// حذف عينة
exports.deleteInventory = async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction(); // Start transaction

        const inventoryItemId = req.params.id;

        // Delete related invoice items first
        await connection.query('DELETE FROM invoice_items WHERE inventory_id = ?', [inventoryItemId]);

        // Then delete the inventory item
        await connection.query('DELETE FROM inventory WHERE id = ?', [inventoryItemId]);

        await connection.commit(); // Commit transaction

        req.flash('success_msg', 'تم حذف العينة بنجاح');
        res.redirect('/inventory');
    } catch (error) {
        if (connection) {
            await connection.rollback(); // Rollback transaction on error
        }
        console.error('Error deleting inventory item:', error);
        req.flash('error_msg', 'حدث خطأ أثناء حذف العينة: ' + error.sqlMessage || error.message);
        res.redirect('/inventory');
    } finally {
        if (connection) {
            connection.release(); // Release the connection
        }
    }
};

// حذف جماعي للعينات
exports.bulkDeleteInventory = async (req, res) => {
    let connection;
    try {
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'لم يتم تحديد أي عينات للحذف' 
            });
        }

        connection = await pool.getConnection();
        await connection.beginTransaction(); // Start transaction

        // Delete related invoice items first
        await connection.query('DELETE FROM invoice_items WHERE inventory_id IN (?)', [ids]);

        // Then delete the inventory items
        const [result] = await connection.query('DELETE FROM inventory WHERE id IN (?)', [ids]);

        await connection.commit(); // Commit transaction

        res.json({ 
            success: true, 
            deletedCount: result.affectedRows,
            message: `تم حذف ${result.affectedRows} عينة بنجاح`
        });
    } catch (error) {
        if (connection) {
            await connection.rollback(); // Rollback transaction on error
        }
        console.error('Error bulk deleting inventory items:', error);
        res.status(500).json({ 
            success: false, 
            message: 'حدث خطأ أثناء حذف العينات: ' + (error.sqlMessage || error.message)
        });
    } finally {
        if (connection) {
            connection.release(); // Release the connection
        }
    }
};

// تبديل حالة رفض العينة
exports.toggleReject = async (req, res) => {
    try {
        const [currentItem] = await pool.query('SELECT is_rejected FROM inventory WHERE id = ?', [req.params.id]);

        if (currentItem.length === 0) {
            return res.json({ success: false, message: 'العينة غير موجودة' });
        }

        const newStatus = !currentItem[0].is_rejected;

        await pool.query(
            'UPDATE inventory SET is_rejected = ? WHERE id = ?',
            [newStatus, req.params.id]
        );

        res.json({ success: true, is_rejected: newStatus });
    } catch (error) {
        console.error('Error toggling reject status:', error);
        res.json({ success: false, message: 'حدث خطأ أثناء تحديث حالة العينة' });
    }
};

// تصدير المخزون كـ PDF (حفظ الملف وإرجاع الرابط)
exports.exportInventoryPDF = async (req, res) => {
    const pdf = require('html-pdf-node');
    try {
        const params = new URLSearchParams(req.query).toString();
        const inventoryUrl = `${process.env.BASE_URL}/inventory/print-pdf-raw${params ? '?' + params : ''}`;

        const options = { format: 'A4' };
        const file = { url: inventoryUrl };

        const fileName = uuidv4() + '.pdf';
        const savePath = path.join(__dirname, '../public/inventory_pdf', fileName);

        const pdfBuffer = await pdf.generatePdf(file, options);

        // تأكد من وجود المجلد
        const dir = path.join(__dirname, '../public/inventory_pdf');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(savePath, pdfBuffer);

        const fileUrl = `${process.env.BASE_URL}/public/inventory_pdf/${fileName}`;

        res.json({ success: true, url: fileUrl });
    } catch (error) {
        console.error('Error exporting inventory PDF:', error);
        res.status(500).json({ success: false, message: 'حدث خطأ أثناء تصدير المخزون كـ PDF' });
    }
};

// طباعة المخزون بدون حماية الجلسة (مخصص لتوليد PDF)
exports.printInventoryRaw = async (req, res) => {
    try {
        const inventory = await exports.fetchInventoryData(req.query);
        res.render('inventory/print', {
            inventory: inventory || [],
            layout: false
        });
    } catch (error) {
        // حتى في حال الخطأ، اعرض صفحة طباعة فارغة
        res.render('inventory/print', {
            inventory: [],
            layout: false
        });
    }
};

// عرض صفحة طباعة PDF
exports.getPrintView = async (req, res) => {
    try {
        const inventory = await exports.fetchInventoryData(req.query);
        res.render('inventory/print', {
            inventory,
            filters: req.query,
            layout: false
        });
    } catch (error) {
        console.error('❌ Print View Error:', error);
        res.status(500).render('error', {
            message: 'حدث خطأ أثناء جلب بيانات المخزون للطباعة',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
};

// تصدير PDF
exports.exportPDF = async (req, res) => {
    try {
        // بناء URL مع معايير البحث
        const queryParams = new URLSearchParams(req.query).toString();
        const printUrl = `${process.env.BASE_URL}/inventory/print-pdf-raw?${queryParams}`;

        const options = {
            format: 'A4',
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            }
        };

        const file = { url: printUrl };

        const pdfBuffer = await pdf.generatePdf(file, options);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=inventory.pdf');
        res.send(pdfBuffer);
    } catch (error) {
        console.error('❌ Export PDF Error:', error);
        res.status(500).send('حدث خطأ أثناء إنشاء ملف PDF');
    }
};