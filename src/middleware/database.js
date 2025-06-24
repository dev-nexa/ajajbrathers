const { pool } = require('../database/db');

const connectDb = async (req, res, next) => {
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
};

module.exports = { connectDb }; 