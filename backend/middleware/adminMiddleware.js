const User = require('../models/User');

module.exports = async function (req, res, next) {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: 'No token, authorization denied' });
        }

        const user = await User.findById(req.user.id);

        if (!user || (user.role !== 'Admin' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Access Denied: Admin privileges required' });
        }

        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({ message: 'Server Error in admin verification' });
    }
};
