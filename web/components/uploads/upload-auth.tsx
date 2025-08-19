'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface UploadAuthProps {
	userSlug: string;
	onAuthenticated: (token: string) => void;
}

export default function UploadAuth({ userSlug, onAuthenticated }: UploadAuthProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [step, setStep] = useState<'initial' | 'code-sent' | 'verifying'>('initial');
	const [code, setCode] = useState('');
	const [error, setError] = useState('');
	const [loading, setLoading] = useState(false);
	const [countdown, setCountdown] = useState(0);

	// Check for pre-auth code in URL params
	useEffect(() => {
		const preAuthCode = searchParams.get('code') || searchParams.get('lemmein');
		if (preAuthCode) {
			setCode(preAuthCode);
			setStep('code-sent');
			// Auto-verify if code is provided
			verifyCode(preAuthCode);
		}
	}, [searchParams]);

	// Countdown timer for resend
	useEffect(() => {
		if (countdown > 0) {
			const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
			return () => clearTimeout(timer);
		}
	}, [countdown]);

	const sendCode = async () => {
		setLoading(true);
		setError('');

		try {
			const response = await fetch('/api/uploads/auth/send-code', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ userSlug }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to send code');
			}

			setStep('code-sent');
			setCountdown(60); // 60 second cooldown
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to send code');
		} finally {
			setLoading(false);
		}
	};

	const verifyCode = async (codeToVerify?: string) => {
		const verificationCode = codeToVerify || code;
		if (!verificationCode || verificationCode.length !== 6) {
			setError('Please enter a 6-digit code');
			return;
		}

		setLoading(true);
		setError('');
		setStep('verifying');

		try {
			const response = await fetch('/api/uploads/auth/verify-code', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ userSlug, code: verificationCode }),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Invalid code');
			}

			// Store token and notify parent
			localStorage.setItem(`upload_auth_${userSlug}`, data.token);
			onAuthenticated(data.token);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Verification failed');
			setStep('code-sent');
		} finally {
			setLoading(false);
		}
	};

	const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value.replace(/\D/g, '').slice(0, 6);
		setCode(value);
		setError('');
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && code.length === 6) {
			verifyCode();
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
				<div className="text-center mb-6">
					<h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
						🔐 Secure Access
					</h1>
					<p className="text-gray-600">
						Verify your identity to access <strong>@{userSlug}</strong>'s upload gallery
					</p>
				</div>

				{step === 'initial' && (
					<div className="space-y-4">
						<p className="text-gray-700 text-center">
							For security, we'll send a verification code to the phone number associated with this account.
						</p>
						
						<button
							onClick={sendCode}
							disabled={loading}
							className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
								loading
									? 'bg-gray-300 text-gray-500 cursor-not-allowed'
									: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
							}`}
						>
							{loading ? 'Sending...' : '📱 Send Me the Code'}
						</button>
					</div>
				)}

				{step === 'code-sent' && (
					<div className="space-y-4">
						<div className="text-center">
							<p className="text-green-600 font-medium mb-2">
								✅ Code sent via SMS!
							</p>
							<p className="text-gray-600 text-sm">
								Enter the 6-digit code below:
							</p>
						</div>

						<div>
							<input
								type="text"
								value={code}
								onChange={handleCodeChange}
								onKeyPress={handleKeyPress}
								placeholder="000000"
								maxLength={6}
								className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 tracking-widest"
								autoFocus
							/>
						</div>

						<button
							onClick={() => verifyCode()}
							disabled={loading || code.length !== 6}
							className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
								loading || code.length !== 6
									? 'bg-gray-300 text-gray-500 cursor-not-allowed'
									: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
							}`}
						>
							{loading ? 'Verifying...' : 'Verify Code'}
						</button>

						<div className="text-center">
							<button
								onClick={sendCode}
								disabled={loading || countdown > 0}
								className="text-purple-600 hover:text-purple-700 text-sm disabled:text-gray-400 disabled:cursor-not-allowed"
							>
								{countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
							</button>
						</div>
					</div>
				)}

				{step === 'verifying' && (
					<div className="text-center space-y-4">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
						<p className="text-gray-600">Verifying your code...</p>
					</div>
				)}

				{error && (
					<div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
						{error}
					</div>
				)}

				<div className="mt-6 text-center text-xs text-gray-500">
					<p>🔒 Your images are private and secure</p>
					<p>Only you can access and upload to this gallery</p>
				</div>
			</div>
		</div>
	);
}