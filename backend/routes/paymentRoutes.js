const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const SSLCommerzPayment = require('sslcommerz-lts');

// Environment Variables
const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false; // true for live, false for sandbox

// @route   POST /api/payment/init
// @desc    Initialize SSLCommerz Payment
// @access  Private
router.post('/init', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const tran_id = `VH_KYC_${new Date().getTime()}_${user._id}`;

        const data = {
            total_amount: 500,
            currency: 'BDT',
            tran_id: tran_id, // use unique tran_id for each api call
            success_url: `${process.env.BASE_URL || 'http://localhost:5001'}/api/payment/success/${user._id}`,
            fail_url: `${process.env.BASE_URL || 'http://localhost:5001'}/api/payment/fail`,
            cancel_url: `${process.env.BASE_URL || 'http://localhost:5001'}/api/payment/fail`,
            ipn_url: `${process.env.BASE_URL || 'http://localhost:5001'}/api/payment/ipn`,
            shipping_method: 'No',
            product_name: 'KYC Verification Fee',
            product_category: 'Verification',
            product_profile: 'general',
            cus_name: user.name,
            cus_email: 'customer@example.com', // Generic email
            cus_add1: 'Dhaka',
            cus_city: 'Dhaka',
            cus_postcode: '1000',
            cus_country: 'Bangladesh',
            cus_phone: user.phone || '01711111111',
            cus_fax: '',
            ship_name: user.name,
            ship_add1: 'Dhaka',
            ship_city: 'Dhaka',
            ship_postcode: 1000,
            ship_country: 'Bangladesh',
        };

        const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
        sslcz.init(data).then(apiResponse => {
            // Redirect the user to payment gateway
            let GatewayPageURL = apiResponse.GatewayPageURL;
            if (GatewayPageURL) {
                res.json({ GatewayPageURL });
            } else {
                res.status(400).json({ message: 'Failed to generate Gateway URL', details: apiResponse });
            }
        }).catch(err => {
            console.error('SSLCommerz Init Error:', err);
            res.status(500).json({ message: 'SSLCommerz Gateway Error' });
        });

    } catch (error) {
        console.error('Error initializing payment:', error);
        res.status(500).json({ message: 'Server Error processing payment init' });
    }
});

// @route   POST /api/payment/success/:userId
// @desc    SSLCommerz Success Webhook
// @access  Public (Webhook from Provider)
router.post('/success/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (user) {
            user.hasPaidKycFee = true;
            user.isVerified = true;
            await user.save();
        }

        // Redirect user back to React frontend
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?payment=success`);
    } catch (error) {
        console.error('Error processing success webhook:', error);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?payment=fail`);
    }
});

// @route   POST /api/payment/fail
// @desc    SSLCommerz Fail Webhook
// @access  Public (Webhook from Provider)
router.post('/fail', async (req, res) => {
    // Redirect user back to React frontend
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?payment=fail`);
});

// @route   POST /api/payment/ipn
// @desc    SSLCommerz IPN
// @access  Public
router.post('/ipn', async (req, res) => {
    res.status(200).send('IPN Received');
});

module.exports = router;
