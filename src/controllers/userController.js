const bcrypt = require('bcryptjs');
const { pool } = require('../database/db');

// عرض قائمة المستخدمين
exports.getUsers = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.username, u.role_id, u.created_at, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            ORDER BY u.username
        `);

        // تحويل role_id إلى نص وصفي
        const formattedUsers = users.map(user => ({
            ...user,
            role: user.role_id === 2 ? 'editor' : user.role_id === 3 ? 'viewer' : 'unknown'
        }));

        res.render('users/index', {
            title: 'إدارة المستخدمين',
            users: formattedUsers,
            user: req.session.user
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        req.flash('error_msg', 'حدث خطأ أثناء جلب بيانات المستخدمين');
        res.redirect('/');
    }
};

// عرض نموذج إضافة مستخدم جديد
exports.getCreateForm = (req, res) => {
    res.render('users/create', {
        title: 'إضافة مستخدم جديد',
        user: req.session.user
    });
};

// إضافة مستخدم جديد
exports.createUser = async (req, res) => {
    try {
        const { username, password, password2, role_id } = req.body;

        // التحقق من تطابق كلمات المرور
        if (password !== password2) {
            req.flash('error_msg', 'كلمات المرور غير متطابقة');
            return res.redirect('/users/create');
        }

        // التحقق من عدم وجود اسم مستخدم مكرر
        const [existingUsers] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existingUsers.length > 0) {
            req.flash('error_msg', 'اسم المستخدم موجود مسبقاً');
            return res.redirect('/users/create');
        }

        // تشفير كلمة المرور
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // إضافة المستخدم
        await pool.query(
            'INSERT INTO users (username, password_hash, role_id) VALUES (?, ?, ?)',
            [username, hashedPassword, role_id]
        );

        req.flash('success_msg', 'تم إضافة المستخدم بنجاح');
        res.redirect('/users');
    } catch (error) {
        console.error('Error creating user:', error);
        req.flash('error_msg', 'حدث خطأ أثناء إضافة المستخدم');
        res.redirect('/users/create');
    }
};

// عرض نموذج تعديل مستخدم
exports.getEditForm = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT u.id, u.username, u.role_id, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            WHERE u.id = ?
        `, [req.params.id]);

        if (users.length === 0) {
            req.flash('error_msg', 'المستخدم غير موجود');
            return res.redirect('/users');
        }

        const editUser = {
            ...users[0],
            role: users[0].role_id === 2 ? 'editor' : users[0].role_id === 3 ? 'viewer' : 'unknown'
        };

        res.render('users/edit', {
            title: 'تعديل بيانات المستخدم',
            user: req.session.user,
            editUser: editUser
        });
    } catch (error) {
        console.error('Error fetching user:', error);
        req.flash('error_msg', 'حدث خطأ أثناء جلب بيانات المستخدم');
        res.redirect('/users');
    }
};

// تحديث بيانات المستخدم
exports.updateUser = async (req, res) => {
    try {
        const { username, role_id } = req.body;
        const userId = req.params.id;

        // التحقق من عدم وجود اسم مستخدم مكرر
        const [existingUsers] = await pool.query(
            'SELECT * FROM users WHERE username = ? AND id != ?',
            [username, userId]
        );
        if (existingUsers.length > 0) {
            req.flash('error_msg', 'اسم المستخدم موجود مسبقاً');
            return res.redirect(`/users/${userId}/edit`);
        }

        // تحديث بيانات المستخدم
        await pool.query(
            'UPDATE users SET username = ?, role_id = ? WHERE id = ?',
            [username, role_id, userId]
        );

        req.flash('success_msg', 'تم تحديث بيانات المستخدم بنجاح');
        res.redirect('/users');
    } catch (error) {
        console.error('Error updating user:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تحديث بيانات المستخدم');
        res.redirect(`/users/${req.params.id}/edit`);
    }
};

// حذف مستخدم
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // التحقق من وجود المستخدم
        const [user] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
        if (user.length === 0) {
            req.flash('error_msg', 'المستخدم غير موجود');
            return res.redirect('/users');
        }

        // منع حذف المستخدم الحالي
        if (parseInt(userId) === parseInt(req.session.user.id)) {
            req.flash('error_msg', 'لا يمكن حذف المستخدم الحالي');
            return res.redirect('/users');
        }

        // حذف المستخدم
        const [result] = await pool.query('DELETE FROM users WHERE id = ?', [userId]);
        
        if (result.affectedRows === 0) {
            req.flash('error_msg', 'فشل حذف المستخدم');
            return res.redirect('/users');
        }

        req.flash('success_msg', 'تم حذف المستخدم بنجاح');
        res.redirect('/users');
    } catch (error) {
        console.error('Error deleting user:', error);
        req.flash('error_msg', 'حدث خطأ أثناء حذف المستخدم');
        res.redirect('/users');
    }
}; 