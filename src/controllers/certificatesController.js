const QRCode = require('qrcode');
const crypto = require('crypto');
const pool = require('../database/db');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

exports.index = async (req, res) => {
  try {
    const { date, customer } = req.query;
    let query = `
      SELECT c.*, 
             c.total_quantity,
             c.total_weight,
             u.username as created_by_name,
             DATE_FORMAT(c.date, '%Y-%m-%d') as formatted_date
      FROM certificates c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += ` AND DATE(c.date) = ?`;
      params.push(date);
    }
    if (customer) {
      query += ` AND c.customer_name LIKE ?`;
      params.push(`%${customer}%`);
    }

    query += ` ORDER BY c.year DESC, CAST(c.certificate_number AS UNSIGNED) DESC`;

    const [certificates] = await req.db.execute(query, params);
    
    res.render('certificates/index', { 
      title: 'الشهادات',
      certificates,
      filters: req.query,
      user: req.session.user
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'حدث خطأ أثناء تحميل الشهادات');
    res.redirect('/');
  }
};

exports.create = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    // Get the last certificate number for the current year
    const [rows] = await req.db.execute(
      'SELECT certificate_number FROM certificates WHERE year = ? ORDER BY certificate_number DESC LIMIT 1',
      [currentYear]
    );
    const nextNumber = rows.length > 0 ? +(rows[0].certificate_number) + (+1) : (+1);

    res.render('certificates/create', {
      title: 'إنشاء شهادة جديدة',
      nextNumber,
      currentYear
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'حدث خطأ أثناء تحضير نموذج الشهادة');
    res.redirect('/certificates');
  }
};

exports.store = async (req, res) => {
  try {
    await req.db.beginTransaction();

    const {
      type,
      customer_name,
      customer_phone,
      customer_address,
      analyst,
      notes,
      total_quantity,
      total_weight,
      items = [],
      certificate_number
    } = req.body;

    // Ensure items is an array
    const itemsArray = Array.isArray(items) ? items : [items];

    // Format items data
    const formattedItems = itemsArray.map(item => ({
      sample_number: item.sample_number || null,
      quantity: item.quantity ? parseFloat(item.quantity) : null,
      packaging_unit: item.packaging_unit || null,
      packaging_weight: item.packaging_weight ? parseFloat(item.packaging_weight) : null,
      total_weight: item.total_weight ? parseFloat(item.total_weight) : null,
      ph: item.ph ? parseFloat(item.ph) : null,
      peroxide: item.peroxide ? parseFloat(item.peroxide) : null,
      abs_232: item.abs_232 ? parseFloat(item.abs_232) : null,
      abs_270: item.abs_270 ? parseFloat(item.abs_270) : null,
      abs_268: item.abs_268 ? parseFloat(item.abs_268) : null,
      abs_262: item.abs_262 ? parseFloat(item.abs_262) : null,
      abs_274: item.abs_274 ? parseFloat(item.abs_274) : null,
      abs_266: item.abs_266 ? parseFloat(item.abs_266) : null,
      k_232: item.k_232 ? parseFloat(item.k_232) : null,
      k_270: item.k_270 ? parseFloat(item.k_270) : null,
      delta_k: item.delta_k ? parseFloat(item.delta_k) : null,
      stigmastadiene: item.stigmastadiene ? parseFloat(item.stigmastadiene) : null
    }));

    // Generate public ID
    const public_id = crypto.randomBytes(4).toString('hex');

    // Get current year
    const currentYear = new Date().getFullYear();

    // Get next certificate number
    const [lastCertificate] = await req.db.query(
      'SELECT certificate_number FROM certificates WHERE year = ? AND type = ? ORDER BY certificate_number DESC LIMIT 1',
      [currentYear, type]
    );

    let nextNumber;
    if (lastCertificate.length > 0) {
      nextNumber = parseInt(lastCertificate[0].certificate_number) + 1;
    } else {
      // If no certificates exist for this year and type, start with 1
      nextNumber = 1;
    }

    // استخدم رقم الشهادة القادم من الفرونت إذا توفر
    const certNumber = certificate_number ? parseInt(certificate_number) : nextNumber;

    // تحقق من عدم وجود شهادة بنفس الرقم والسنة والنوع
    const [existingCertificate] = await req.db.query(
      'SELECT id FROM certificates WHERE year = ? AND type = ? AND certificate_number = ?',
      [currentYear, type, certNumber]
    );
    if (existingCertificate.length > 0) {
      throw new Error('رقم الشهادة مستخدم بالفعل لهذه السنة');
    }

    // Insert certificate
    const [result] = await req.db.query(
      `INSERT INTO certificates (
        certificate_number, year, type, date, customer_name, customer_phone, 
        customer_address, analyst, notes, items, total_quantity, total_weight, 
        public_id, created_by
      ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        certNumber,
        currentYear,
        type,
        customer_name || null,
        customer_phone || null,
        customer_address || null,
        analyst || null,
        notes || null,
        JSON.stringify(formattedItems),
        total_quantity ? parseFloat(total_quantity) : 0,
        total_weight ? parseFloat(total_weight) : 0,
        public_id,
        req.session.user.id
      ]
    );

    await req.db.commit();

    // Get the created certificate
    const [certificate] = await req.db.query(
      'SELECT * FROM certificates WHERE id = ?',
      [result.insertId]
    );

    if (certificate.length === 0) {
      throw new Error('لم يتم العثور على الشهادة بعد إنشائها');
    }

    // Parse items JSON and ensure numeric values
    const certificateData = certificate[0];
    certificateData.items = JSON.parse(certificateData.items);
    
    // Ensure numeric values are properly parsed
    certificateData.total_quantity = parseFloat(certificateData.total_quantity) || 0;
    certificateData.total_weight = parseFloat(certificateData.total_weight) || 0;
    
    // Parse numeric values in items
    certificateData.items = certificateData.items.map(item => ({
      ...item,
      quantity: parseFloat(item.quantity) || 0,
      packaging_weight: parseFloat(item.packaging_weight) || 0,
      total_weight: parseFloat(item.total_weight) || 0,
      ph: parseFloat(item.ph) || 0,
      peroxide: parseFloat(item.peroxide) || 0,
      abs_232: parseFloat(item.abs_232) || 0,
      abs_270: parseFloat(item.abs_270) || 0,
      abs_268: parseFloat(item.abs_268) || 0,
      abs_262: parseFloat(item.abs_262) || 0,
      abs_274: parseFloat(item.abs_274) || 0,
      abs_266: parseFloat(item.abs_266) || 0,
      k_232: parseFloat(item.k_232) || 0,
      k_270: parseFloat(item.k_270) || 0,
      delta_k: parseFloat(item.delta_k) || 0,
      stigmastadiene: parseFloat(item.stigmastadiene) || 0
    }));

    // Generate QR code URL
    const qrCodeUrl = `${req.protocol}://${req.get('host')}/certificates/${certificateData.id}`;
    const qrCode = await QRCode.toDataURL(qrCodeUrl);

    // Check if the request wants JSON response
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.json({
        success: true,
        certificate_id: certificateData.id,
        message: 'تم إنشاء الشهادة بنجاح'
      });
    }

    // Redirect to the show page
    res.redirect(`/certificates/${certificateData.id}`);

  } catch (error) {
    await req.db.rollback();
    console.error('Error creating certificate:', error);
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء إنشاء الشهادة'
      });
    }

    req.flash('error', error.message || 'حدث خطأ أثناء إنشاء الشهادة');
    res.redirect('/certificates');
  }
};

exports.show = async (req, res) => {
  try {
    const [certificates] = await req.db.execute(
      'SELECT * FROM certificates WHERE id = ?',
      [req.params.id]
    );

    if (certificates.length === 0) {
      req.flash('error', 'الشهادة غير موجودة');
      return res.redirect('/certificates');
    }

    const certificate = certificates[0];
    certificate.items = JSON.parse(certificate.items);
    
    // Convert numeric fields to numbers
    certificate.total_quantity = parseFloat(certificate.total_quantity);
    certificate.total_weight = parseFloat(certificate.total_weight);
    
    // Convert numeric fields in items
    certificate.items = certificate.items.map(item => ({
      ...item,
      quantity: parseFloat(item.quantity),
      net_weight_total: parseFloat(item.net_weight_total),
      ph: parseFloat(item.ph),
      peroxide_value: parseFloat(item.peroxide_value),
      absorption_232: parseFloat(item.absorption_232),
      absorption_266: parseFloat(item.absorption_266),
      absorption_270: parseFloat(item.absorption_270),
      absorption_274: parseFloat(item.absorption_274),
      delta_k: parseFloat(item.delta_k)
    }));

    const qrCode = await QRCode.toDataURL(
      `${process.env.BASE_URL}/certificates/public/${certificate.public_id}`
    );

    res.render('certificates/show', {
      title: `شهادة رقم ${certificate.certificate_number}`,
      certificate,
      qrCode,
      isPrintView: req.url.includes('/print')
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'حدث خطأ أثناء عرض الشهادة');
    res.redirect('/certificates');
  }
};

exports.showPublic = async (req, res) => {
  try {
    const [certificates] = await req.db.execute(
      'SELECT * FROM certificates WHERE public_id = ?',
      [req.params.public_id]
    );

    if (certificates.length === 0) {
      return res.status(404).render('error', {
        message: 'الشهادة غير موجودة',
        error: { status: 404 }
      });
    }

    const certificate = certificates[0];
    certificate.items = JSON.parse(certificate.items);
    
    // Convert numeric fields to numbers
    certificate.total_quantity = parseFloat(certificate.total_quantity);
    certificate.total_weight = parseFloat(certificate.total_weight);
    
    // Convert numeric fields in items
    certificate.items = certificate.items.map(item => ({
      ...item,
      quantity: parseFloat(item.quantity),
      net_weight_total: parseFloat(item.net_weight_total),
      ph: parseFloat(item.ph),
      peroxide_value: parseFloat(item.peroxide_value),
      absorption_232: parseFloat(item.absorption_232),
      absorption_266: parseFloat(item.absorption_266),
      absorption_270: parseFloat(item.absorption_270),
      absorption_274: parseFloat(item.absorption_274),
      delta_k: parseFloat(item.delta_k)
    }));

    const qrCode = await QRCode.toDataURL(
      `${process.env.BASE_URL}/certificates/public/${certificate.public_id}`
    );

    res.render('certificates/public', {
      title: `شهادة رقم ${certificate.certificate_number}`,
      certificate,
      qrCode,
      layout: 'layouts/public'
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', {
      message: 'حدث خطأ أثناء عرض الشهادة',
      error: { status: 500 }
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const [result] = await req.db.execute(
      'DELETE FROM certificates WHERE id = ?',
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'الشهادة غير موجودة' });
    }

    res.json({ success: true, message: 'تم حذف الشهادة بنجاح' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء حذف الشهادة' });
  }
};

// عرض صفحة اختيار نوع الشهادة
exports.createType = async (req, res) => {
    res.render('certificates/create-type', {
        title: 'اختيار نوع الشهادة'
    });
};

// عرض نموذج إنشاء شهادة داخلية
exports.createInternal = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    // Get the last certificate number for the current year and internal type
    const [rows] = await req.db.execute(
      'SELECT certificate_number FROM certificates WHERE year = ? AND type = ? ORDER BY CAST(certificate_number AS UNSIGNED) DESC LIMIT 1',
      [currentYear, 'internal']
    );
    // Get the last certificate number for the current year (all types)
    const [allRows] = await req.db.execute(
      'SELECT certificate_number FROM certificates WHERE year = ? ORDER BY CAST(certificate_number AS UNSIGNED) DESC LIMIT 1',
      [currentYear]
    );

    // Use the higher number between type-specific and overall
    let nextNumber;
    const lastTypeNumber = rows.length > 0 ? parseInt(rows[0].certificate_number) : 0;
    const lastOverallNumber = allRows.length > 0 ? parseInt(allRows[0].certificate_number) : 0;
    nextNumber = (Math.max(lastTypeNumber, lastOverallNumber) + 1).toString();

    // Get available inventory items
    const [inventory] = await req.db.execute(
      'SELECT * FROM inventory WHERE current_quantity > 0 ORDER BY date DESC, id DESC'
    );

    res.render('certificates/create-internal', {
      title: 'إنشاء شهادة داخلية',
      nextNumber,
      currentYear,
      inventory,
      type: 'internal'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'حدث خطأ أثناء تحضير نموذج الشهادة');
    res.redirect('/certificates');
  }
};

// عرض نموذج إنشاء شهادة خارجية
exports.createExternal = async (req, res) => {
  try {
    const currentYear = new Date().getFullYear();
    // Get the last certificate number for the current year and external type
    const [rows] = await req.db.execute(
      'SELECT certificate_number FROM certificates WHERE year = ? AND type = ? ORDER BY CAST(certificate_number AS UNSIGNED) DESC LIMIT 1',
      [currentYear, 'external']
    );
    
    // Get the last certificate number for the current year (all types)
    const [allRows] = await req.db.execute(
      'SELECT certificate_number FROM certificates WHERE year = ? ORDER BY CAST(certificate_number AS UNSIGNED) DESC LIMIT 1',
      [currentYear]
    );

    // Use the higher number between type-specific and overall
    let nextNumber;
    const lastTypeNumber = rows.length > 0 ? parseInt(rows[0].certificate_number) : 0;
    const lastOverallNumber = allRows.length > 0 ? parseInt(allRows[0].certificate_number) : 0;
    nextNumber = (Math.max(lastTypeNumber, lastOverallNumber) + 1).toString();

    res.render('certificates/create-external', {
      title: 'إنشاء شهادة خارجية',
      nextNumber,
      currentYear,
      type: 'external'
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'حدث خطأ أثناء تحضير نموذج الشهادة');
    res.redirect('/certificates');
  }
};

// تصدير الشهادة كـ PDF (حفظ الملف وإرجاع الرابط)
exports.exportCertificatePDF = async (req, res) => {
  const pdf = require('html-pdf-node');
  try {
    // استخدم رابط الشهادة للطباعة بدون حماية
    const certUrl = `${process.env.BASE_URL}/certificates/${req.params.id}/print-pdf-raw`;

    const options = { format: 'A4' };
    const file = { url: certUrl };

    const fileName = uuidv4() + '.pdf';
    const savePath = path.join(__dirname, '../public/certificates_pdf', fileName);

    const pdfBuffer = await pdf.generatePdf(file, options);
    fs.writeFileSync(savePath, pdfBuffer);

    const fileUrl = `${process.env.BASE_URL}/public/certificates_pdf/${fileName}`;

    res.json({
      success: true,
      url: fileUrl
    });

  } catch (error) {
    console.error('Error exporting certificate PDF:', error);
    res.status(500).json({ success: false, message: 'حدث خطأ أثناء تصدير الشهادة كـ PDF' });
  }
};

// طباعة شهادة (عرض صفحة الطباعة)
exports.printCertificate = async (req, res) => {
  try {
    const [certificates] = await req.db.execute(
      'SELECT * FROM certificates WHERE id = ?',
      [req.params.id]
    );

    if (certificates.length === 0) {
      req.flash('error', 'الشهادة غير موجودة');
      return res.redirect('/certificates');
    }

    const certificate = certificates[0];
    certificate.items = JSON.parse(certificate.items);
    certificate.total_quantity = parseFloat(certificate.total_quantity);
    certificate.total_weight = parseFloat(certificate.total_weight);
    certificate.items = certificate.items.map(item => ({
      ...item,
      quantity: parseFloat(item.quantity),
      packaging_weight: parseFloat(item.packaging_weight),
      total_weight: parseFloat(item.total_weight),
      ph: parseFloat(item.ph),
      peroxide: parseFloat(item.peroxide),
      abs_232: parseFloat(item.abs_232),
      abs_266: parseFloat(item.abs_266),
      abs_270: parseFloat(item.abs_270),
      abs_274: parseFloat(item.abs_274),
      delta_k: parseFloat(item.delta_k),
      stigmastadiene: parseFloat(item.stigmastadiene)
    }));

    const qrCode = await QRCode.toDataURL(
      `${process.env.BASE_URL}/certificates/public/${certificate.public_id}`
    );

    res.render('certificates/print', {
      title: `طباعة شهادة رقم ${certificate.certificate_number}`,
      certificate,
      qrCode,
      layout: false
    });
  } catch (error) {
    console.error('Error printing certificate:', error);
    req.flash('error', 'حدث خطأ أثناء طباعة الشهادة');
    res.redirect('/certificates');
  }
}; 