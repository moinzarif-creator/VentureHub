import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email');
    const navigate = useNavigate();

    const [otpCode, setOtpCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            await axios.post('http://localhost:5001/api/auth/verify-email', { email, otpCode });
            setMessage('Your email has been successfully verified! Redirecting to login...');
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid or expired code.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResendLoading(true);
        setError(null);
        setMessage(null);

        try {
            const res = await axios.post('http://localhost:5001/api/auth/resend-otp', { email });
            setMessage(res.data.message || 'A new verification code has been sent.');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to resend code.');
        } finally {
            setResendLoading(false);
        }
    };

    if (!email) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
                <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
                    <p className="text-red-500 font-medium">Error: No email provided. Please register or log in again.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
            <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Email Verification</h2>
                <p className="text-gray-600 mb-6 text-sm">
                    We've sent a 6-digit code to <span className="font-semibold text-gray-800">{email}</span>. Please enter it below.
                </p>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-4 rounded text-left">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}
                
                {message && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-3 mb-4 rounded text-left">
                        <p className="text-sm text-green-700">{message}</p>
                    </div>
                )}

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <input
                            type="text"
                            maxLength="6"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                            className="text-center text-2xl tracking-[0.5em] font-mono block w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="------"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || otpCode.length !== 6}
                        className={`w-full py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${loading || otpCode.length !== 6 ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} transition-colors shadow-sm`}
                    >
                        {loading ? 'Verifying...' : 'Verify Code'}
                    </button>
                </form>

                <div className="mt-6 border-t border-gray-100 pt-4">
                    <p className="text-sm text-gray-600">
                        Didn't receive the code?{' '}
                        <button 
                            type="button"
                            onClick={handleResend}
                            disabled={resendLoading}
                            className="font-medium text-blue-600 hover:text-blue-500 disabled:text-blue-300 transition-colors"
                        >
                            {resendLoading ? 'Sending...' : 'Resend Code'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
