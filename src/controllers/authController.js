const bcrypt = require('bcryptjs');
const { pool } = require('../database/db');

// عرض صفحة تسجيل الدخول
exports.getLogin = (req, res) => {
    res.render('auth/login', {
        title: 'تسجيل الدخول',
        user: null
    });
};

// معالجة تسجيل الدخول
exports.postLogin = async (req, res) => {
    try {
        const { username, password } = req.body;

        // التحقق من وجود البيانات المطلوبة
        if (!username || !password) {
            req.flash('error_msg', 'يرجى إدخال اسم المستخدم وكلمة المرور');
            return res.redirect('/auth/login');
        }

        // التحقق من وجود المستخدم
        const [users] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        if (users.length === 0) {
            req.flash('error_msg', 'اسم المستخدم أو كلمة المرور غير صحيحة');
            return res.redirect('/auth/login');
        }

        const user = users[0];

        // التحقق من وجود كلمة المرور
        if (!user.password_hash) {
            console.error('User has no password:', user);
            req.flash('error_msg', 'خطأ في بيانات المستخدم');
            return res.redirect('/auth/login');
        }

        // التحقق من كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            req.flash('error_msg', 'اسم المستخدم أو كلمة المرور غير صحيحة');
            return res.redirect('/auth/login');
        }

        // تخزين بيانات المستخدم في الجلسة
        // Map role_id to role name string
        let roleName;
        if (user.role_id === 2) {
            roleName = 'editor';
        } else if (user.role_id === 3) {
            roleName = 'viewer';
        } else {
            roleName = 'unknown'; // Default or handle other roles
        }

        req.session.user = {
            id: user.id,
            username: user.username,
            role: roleName // Store the role name string
        };

        req.flash('success_msg', 'تم تسجيل الدخول بنجاح');
        res.redirect('/');
    } catch (error) {
        console.error('Login error:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تسجيل الدخول');
        res.redirect('/auth/login');
    }
};

// تسجيل الخروج
exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/auth/login');
    });
};

// عرض صفحة تغيير كلمة المرور
exports.getChangePassword = (req, res) => {
    res.render('auth/change-password', {
        title: 'تغيير كلمة المرور',
        user: req.session.user
    });
};

// معالجة تغيير كلمة المرور
exports.postChangePassword = async (req, res) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;

        // التحقق من وجود البيانات المطلوبة
        if (!current_password || !new_password || !confirm_password) {
            req.flash('error_msg', 'يرجى إدخال جميع البيانات المطلوبة');
            return res.redirect('/auth/change-password');
        }

        // التحقق من تطابق كلمتي المرور الجديدتين
        if (new_password !== confirm_password) {
            req.flash('error_msg', 'كلمتا المرور الجديدتان غير متطابقتين');
            return res.redirect('/auth/change-password');
        }

        // التحقق من كلمة المرور الحالية
        const [users] = await pool.query(
            'SELECT * FROM users WHERE id = ?',
            [req.session.user.id]
        );

        if (users.length === 0) {
            req.flash('error_msg', 'المستخدم غير موجود');
            return res.redirect('/auth/change-password');
        }

        const user = users[0];

        // التحقق من وجود كلمة المرور
        if (!user.password_hash) {
            console.error('User has no password:', user);
            req.flash('error_msg', 'خطأ في بيانات المستخدم');
            return res.redirect('/auth/change-password');
        }

        const isMatch = await bcrypt.compare(current_password, user.password_hash);
        if (!isMatch) {
            req.flash('error_msg', 'كلمة المرور الحالية غير صحيحة');
            return res.redirect('/auth/change-password');
        }

        // تشفير كلمة المرور الجديدة
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(new_password, salt);

        // تحديث كلمة المرور
        await pool.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [hashedPassword, req.session.user.id]
        );

        req.flash('success_msg', 'تم تغيير كلمة المرور بنجاح');
        res.redirect('/');
    } catch (error) {
        console.error('Change password error:', error);
        req.flash('error_msg', 'حدث خطأ أثناء تغيير كلمة المرور');
        res.redirect('/auth/change-password');
    }
}; 