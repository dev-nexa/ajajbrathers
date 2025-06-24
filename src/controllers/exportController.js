const Excel = require('exceljs');
const { pool } = require('../database/db');

exports.exportInventoryToExcel = async (req, res) => {
    try {
        // Create a new workbook and worksheet
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('المخزون');

        // Set RTL direction for the worksheet
        worksheet.views = [{ rightToLeft: true }];

        // Define columns
        worksheet.columns = [
            { header: 'رقم العينة', key: 'sample_number', width: 15 },
            { header: 'اسم المورد/العينة', key: 'supplier_or_sample_name', width: 30 },
            { header: 'التاريخ', key: 'date', width: 15 },
            { header: 'الكمية الأساسية', key: 'base_quantity', width: 15 },
            { header: 'الكمية الحالية', key: 'current_quantity', width: 15 },
            { header: 'الوزن الصافي', key: 'net_weight_total', width: 15 },
            { header: 'وزن التعبئة', key: 'sample_weight', width: 15 },
            { header: 'درجة الحموضة', key: 'ph', width: 10 },
            { header: 'رقم البيروكسيد', key: 'peroxide_value', width: 15 },
            { header: 'امتصاص 232', key: 'abs_232', width: 12 },
            { header: 'امتصاص 266', key: 'abs_266', width: 12 },
            { header: 'امتصاص 270', key: 'abs_270', width: 12 },
            { header: 'امتصاص 274', key: 'abs_274', width: 12 },
            { header: 'Delta K', key: 'delta_k', width: 12 },
            { header: 'ستيجما ستاديين', key: 'sigma_absorbance', width: 15 },
            { header: 'المحلل', key: 'analyst', width: 20 },
            { header: 'ملاحظات', key: 'notes', width: 30 }
        ];

        // Style the header row
        worksheet.getRow(1).font = { bold: true, size: 12 };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Get data from database
        const [rows] = await pool.query(`
            SELECT 
                i.sample_number,
                i.supplier_or_sample_name,
                DATE_FORMAT(i.date, '%Y-%m-%d') as date,
                i.base_quantity,
                i.current_quantity,
                i.net_weight_total,
                i.sample_weight,
                i.ph,
                i.peroxide_value,
                SUBSTRING_INDEX(SUBSTRING_INDEX(i.absorption_readings, ' ', 1), ' ', -1) as abs_232,
                SUBSTRING_INDEX(SUBSTRING_INDEX(i.absorption_readings, ' ', 2), ' ', -1) as abs_266,
                SUBSTRING_INDEX(SUBSTRING_INDEX(i.absorption_readings, ' ', 3), ' ', -1) as abs_270,
                SUBSTRING_INDEX(SUBSTRING_INDEX(i.absorption_readings, ' ', 4), ' ', -1) as abs_274,
                SUBSTRING_INDEX(i.absorption_readings, ' ', -1) as delta_k,
                i.sigma_absorbance,
                i.analyst,
                i.notes
            FROM inventory i
            WHERE i.deleted_at IS NULL
            ORDER BY CAST(i.sample_number AS UNSIGNED) DESC
        `);

        // Add rows to worksheet
        rows.forEach(row => {
            worksheet.addRow(row);
        });

        // Set borders for all cells
        worksheet.eachRow((row, rowNumber) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
                // Center align all cells
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
        });

        // Auto-fit columns
        worksheet.columns.forEach(column => {
            column.width = Math.max(column.width || 10, 10);
        });

        // Set response headers
        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=inventory-' + Date.now() + '.xlsx'
        );

        // Write to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error exporting inventory:', error);
        res.status(500).json({
            success: false,
            message: 'حدث خطأ أثناء تصدير البيانات'
        });
    }
}; 