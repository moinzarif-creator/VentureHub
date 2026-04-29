const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const crypto = require('crypto');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');

// Configure Multer Storage for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'venturehive_kyc',
        allowed_formats: ['mp4', 'mov', 'avi', 'webm', 'jpg', 'jpeg', 'png', 'pdf'],
        resource_type: 'auto'
    }
});
const upload = multer({ storage });

// @route   POST /api/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', async (req, res) => {
    try {
        const { name, email, phone, password, role } = req.body;

        // Validate Input
        if (!name || !email || !phone || !password) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        // Check if user exists
        let user = await User.findOne({ $or: [{ phone }, { email }] });
        if (user) {
            return res.status(400).json({ message: 'User already exists with this phone number or email' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification token
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationTokenExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Create user
        user = new User({
            name,
            email,
            phone,
            password: hashedPassword,
            role: role || 'Public',
            verificationToken,
            verificationTokenExpires
        });

        await user.save();

        // Send Email
        const message = `Welcome to VentureHive! Your email verification code is: ${verificationToken}`;
        const html = `
            <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 40px 20px; text-align: center;">
                <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h2 style="color: #333333; margin-bottom: 20px;">Welcome to VentureHive!</h2>
                    <p style="color: #555555; font-size: 16px; margin-bottom: 30px;">
                        Hi ${user.name}, we're excited to have you on board. Please use the verification code below to activate your account.
                    </p>
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <h1 style="color: #2563EB; font-size: 36px; letter-spacing: 4px; margin: 0; font-family: monospace;">${verificationToken}</h1>
                    </div>
                    <p style="color: #999999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eeeeee; padding-top: 20px;">
                        This code will expire in 5 minutes. If you did not request this account creation, please ignore this email.
                    </p>
                </div>
            </div>
        `;

        try {
            await sendEmail({
                email: user.email,
                subject: 'Welcome to VentureHive - Verify Your Email',
                message,
                html
            });
            res.status(201).json({ message: 'User registered successfully. An email has been sent to verify your account.' });
        } catch (emailError) {
            console.error('Email could not be sent:', emailError);
            user.verificationToken = undefined;
            user.verificationTokenExpires = undefined;
            await user.save();
            return res.status(500).json({ message: 'Error sending email. User registered, but email failed.' });
        }

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { phone, password } = req.body;

        // Validate Input
        if (!phone || !password) {
            return res.status(400).json({ message: 'Please provide phone and password' });
        }

        // Find User
        const user = await User.findOne({ phone });
        if (!user) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // Ensure Email is Verified (Hard Gate)
        if (!user.isEmailVerified) {
            return res.status(403).json({ message: 'Please verify your email address to log in. Check your inbox.' });
        }

        // Verify Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid Credentials' });
        }

        // Return JWT
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '5 days' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        role: user.role,
                        phone: user.phone,
                        isVerified: user.isVerified,
                        verificationStatus: user.verificationStatus,
                        kycVideoUrl: user.kycVideoUrl,
                        hasPaidKycFee: user.hasPaidKycFee
                    }
                });
            }
        );

    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/auth/mock-payment
// @desc    Process a mock fee payment for KYC
// @access  Private
router.post('/mock-payment', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.verificationStatus !== 'approved') {
            return res.status(400).json({ message: 'KYC video must be approved before payment' });
        }

        if (user.hasPaidKycFee) {
            return res.status(400).json({ message: 'Fee already paid' });
        }

        // Simulate payment processing delay (1.5s)
        await new Promise(resolve => setTimeout(resolve, 1500));

        user.hasPaidKycFee = true;
        user.isVerified = true;
        await user.save();

        res.json({
            id: user.id,
            name: user.name,
            role: user.role,
            phone: user.phone,
            isVerified: user.isVerified,
            verificationStatus: user.verificationStatus,
            kycVideoUrl: user.kycVideoUrl,
            hasPaidKycFee: user.hasPaidKycFee
        });
    } catch (error) {
        console.error('Error processing mock payment:', error);
        res.status(500).json({ message: 'Server Error processing payment' });
    }
});

// @route   PUT /api/auth/kyc-upload
// @desc    Upload KYC video and update status
// @access  Private
router.put('/kyc-upload', authMiddleware, upload.single('kycVideo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Please upload a video file' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.kycVideoUrl = req.file.path;
        user.verificationStatus = 'pending';

        await user.save();

        res.json({
            id: user.id,
            name: user.name,
            role: user.role,
            phone: user.phone,
            isVerified: user.isVerified,
            verificationStatus: user.verificationStatus,
            kycVideoUrl: user.kycVideoUrl
        });
    } catch (error) {
        console.error('Error uploading KYC:', error);
        res.status(500).json({ message: 'Server Error processing KYC upload' });
    }
});

// @route   PUT /api/auth/kyc-docs
// @desc    Upload KYC documents (NID and Tax)
// @access  Private
router.put('/kyc-docs', authMiddleware, upload.fields([
    { name: 'nidFront', maxCount: 1 },
    { name: 'nidBack', maxCount: 1 },
    { name: 'taxDoc', maxCount: 1 }
]), async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (req.files.nidFront) user.kycDocuments.nidFrontUrl = req.files.nidFront[0].path;
        if (req.files.nidBack) user.kycDocuments.nidBackUrl = req.files.nidBack[0].path;
        if (req.files.taxDoc) user.kycDocuments.taxDocUrl = req.files.taxDoc[0].path;

        user.kycDocuments.status = 'pending';
        await user.save();

        res.json({
            id: user.id,
            kycDocuments: user.kycDocuments
        });
    } catch (error) {
        console.error('Error uploading KYC documents:', error);
        res.status(500).json({ message: 'Server Error processing document upload' });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ message: 'Server Error fetching user' });
    }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email using OTP
// @access  Public
router.post('/verify-email', async (req, res) => {
    try {
        const { email, otpCode } = req.body;

        if (!email || !otpCode) {
            return res.status(400).json({ message: 'Email and OTP code are required' });
        }

        const user = await User.findOne({
            email,
            verificationToken: otpCode,
            verificationTokenExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired code' });
        }

        user.isEmailVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        res.status(200).json({ message: 'Email verified successfully' });
    } catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ message: 'Server error during email verification' });
    }
});

// @route   POST /api/auth/resend-otp
// @desc    Resend OTP for email verification
// @access  Public
router.post('/resend-otp', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email });
        
        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Generate new verification token
        const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
        const verificationTokenExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        user.verificationToken = verificationToken;
        user.verificationTokenExpires = verificationTokenExpires;
        await user.save();

        // Send Email
        const message = `Welcome to VentureHive! Your new email verification code is: ${verificationToken}`;
        const html = `
            <div style="font-family: Arial, sans-serif; background-color: #f9f9f9; padding: 40px 20px; text-align: center;">
                <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                    <h2 style="color: #333333; margin-bottom: 20px;">VentureHive Email Verification</h2>
                    <p style="color: #555555; font-size: 16px; margin-bottom: 30px;">
                        Hi ${user.name}, please use the verification code below to activate your account.
                    </p>
                    <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <h1 style="color: #2563EB; font-size: 36px; letter-spacing: 4px; margin: 0; font-family: monospace;">${verificationToken}</h1>
                    </div>
                    <p style="color: #999999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eeeeee; padding-top: 20px;">
                        This code will expire in 5 minutes. If you did not request this code, please ignore this email.
                    </p>
                </div>
            </div>
        `;

        await sendEmail({
            email: user.email,
            subject: 'New Verification Code - VentureHive',
            message,
            html
        });

        res.status(200).json({ message: 'A new verification code has been sent to your email.' });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({ message: 'Server error during OTP resend' });
    }
});

module.exports = router;
