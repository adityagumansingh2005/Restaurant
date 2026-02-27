'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';

type Tab = 'login' | 'signup' | 'otp' | 'password';

interface StepIndicatorProps {
  currentStep: 1 | 2 | 3;
}

function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { num: 1, label: 'Details' },
    { num: 2, label: 'Verify' },
    { num: 3, label: 'Password' },
  ];

  return (
    <div className="step-indicator">
      {steps.map((step, i) => (
        <span key={step.num} style={{ display: 'contents' }}>
          <div
            className={`step ${
              step.num < currentStep ? 'completed' : step.num === currentStep ? 'active' : ''
            }`}
          >
            <span className="step-circle">
              {step.num < currentStep ? '\u2713' : step.num}
            </span>
            <small>{step.label}</small>
          </div>
          {i < steps.length - 1 && (
            <div className={`step-line ${step.num < currentStep ? 'active' : ''}`} />
          )}
        </span>
      ))}
    </div>
  );
}

export default function AuthModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupError, setSignupError] = useState('');
  const [sendingOTP, setSendingOTP] = useState(false);

  // OTP state
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(600);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password state
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [settingPassword, setSettingPassword] = useState(false);

  const clearAllForms = useCallback(() => {
    setLoginEmail(''); setLoginPassword(''); setLoginError('');
    setSignupName(''); setSignupEmail(''); setSignupPhone(''); setSignupError('');
    setOtpValues(['', '', '', '', '', '']); setOtpError('');
    setPassword(''); setPasswordConfirm(''); setPasswordError('');
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const handleClose = useCallback(() => {
    clearAllForms();
    setActiveTab('login');
    onClose();
  }, [clearAllForms, onClose]);

  // Start OTP timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerSeconds(600);
    setTimerExpired(false);
    timerRef.current = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimerExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // -- OTP Input handlers --
  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/[^0-9]/g, '');
    const newValues = [...otpValues];
    newValues[index] = digit;
    setOtpValues(newValues);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
      const newValues = [...otpValues];
      newValues[index - 1] = '';
      setOtpValues(newValues);
    }
  };

  const handleOtpPaste = (index: number, e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/[^0-9]/g, '').split('');
    const newValues = [...otpValues];
    digits.forEach((digit, i) => {
      if (index + i < 6) {
        newValues[index + i] = digit;
      }
    });
    setOtpValues(newValues);
    const lastIndex = Math.min(index + digits.length, 5);
    otpRefs.current[lastIndex]?.focus();
  };

  // -- Action handlers --
  const handleLogin = async () => {
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError('Please enter email and password');
      return;
    }
    try {
      await auth.login(loginEmail, loginPassword);
      handleClose();
      document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  const handleSendOTP = async () => {
    setSignupError('');
    if (!signupName || !signupEmail) {
      setSignupError('Please fill in name and email');
      return;
    }
    if (!signupEmail.includes('@')) {
      setSignupError('Please enter a valid email');
      return;
    }
    setSendingOTP(true);
    try {
      await auth.sendOTP(signupName, signupEmail, signupPhone);
      setActiveTab('otp');
      startTimer();
    } catch (error) {
      setSignupError(error instanceof Error ? error.message : 'Failed to send OTP');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleVerifyOTP = async () => {
    setOtpError('');
    const otp = otpValues.join('');
    if (otp.length !== 6 || !/^\d+$/.test(otp)) {
      setOtpError('Please enter a valid 6-digit OTP');
      return;
    }
    setVerifying(true);
    try {
      await auth.verifyOTP(otp);
      setActiveTab('password');
    } catch (error) {
      setOtpError(error instanceof Error ? error.message : 'OTP verification failed');
      // Shake OTP inputs
      setOtpValues(['', '', '', '', '', '']);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    try {
      await auth.resendOTP();
      setOtpValues(['', '', '', '', '', '']);
      startTimer();
    } catch (error) {
      auth.showNotification(
        error instanceof Error ? error.message : 'Failed to resend OTP',
        'error'
      );
    }
  };

  const handleSetPassword = async () => {
    setPasswordError('');
    if (!password || !passwordConfirm) {
      setPasswordError('Please fill in all password fields');
      return;
    }
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordError('Passwords do not match');
      return;
    }
    setSettingPassword(true);
    try {
      await auth.setPassword(password);
      handleClose();
      document.getElementById('home')?.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTO_LOGIN_FAILED') {
        setActiveTab('login');
      } else {
        setPasswordError(error instanceof Error ? error.message : 'Failed to set password');
      }
    } finally {
      setSettingPassword(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="auth-box">
        <button className="close-btn" onClick={handleClose}>&times;</button>

        {/* Login Tab */}
        {activeTab === 'login' && (
          <div className="auth-tab">
            <h2>Login</h2>
            {loginError && <div className="error-msg">{loginError}</div>}

            <input
              type="email"
              placeholder="Email Address"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />

            <button className="btn" onClick={handleLogin}>Login</button>

            <p className="text-center">
              Don&apos;t have an account?{' '}
              <button onClick={() => setActiveTab('signup')}>Sign Up</button>
            </p>
          </div>
        )}

        {/* Signup Tab */}
        {activeTab === 'signup' && (
          <div className="auth-tab">
            <h2>Create Account</h2>
            <StepIndicator currentStep={1} />
            {signupError && <div className="error-msg">{signupError}</div>}

            <input
              type="text"
              placeholder="Full Name"
              value={signupName}
              onChange={(e) => setSignupName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email Address"
              value={signupEmail}
              onChange={(e) => setSignupEmail(e.target.value)}
            />
            <input
              type="tel"
              placeholder="Phone Number (optional)"
              value={signupPhone}
              onChange={(e) => setSignupPhone(e.target.value)}
            />

            <button className="btn" onClick={handleSendOTP} disabled={sendingOTP}>
              {sendingOTP ? 'Sending...' : 'Send Verification Code'}
            </button>

            <p className="text-center">
              Already have an account?{' '}
              <button onClick={() => setActiveTab('login')}>Login</button>
            </p>
          </div>
        )}

        {/* OTP Tab */}
        {activeTab === 'otp' && (
          <div className="auth-tab">
            <h2>Verify Email</h2>
            <StepIndicator currentStep={2} />
            {otpError && <div className="error-msg">{otpError}</div>}

            <div className="otp-info">
              <div className="otp-icon">&#9993;</div>
              <p>We sent a 6-digit verification code to</p>
              <strong>{auth.signupEmail || signupEmail}</strong>
            </div>

            <div className="otp-inputs">
              {otpValues.map((val, i) => (
                <span key={i} style={{ display: 'contents' }}>
                  {i === 3 && <span className="otp-dash">&#8212;</span>}
                  <input
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    className={`otp-input${val ? ' filled' : ''}`}
                    maxLength={1}
                    inputMode="numeric"
                    value={val}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={(e) => handleOtpPaste(i, e)}
                    onFocus={(e) => e.target.select()}
                    autoFocus={i === 0}
                  />
                </span>
              ))}
            </div>

            <div className="otp-timer">
              {timerExpired ? (
                <span style={{ color: '#f44336' }}>Code expired. Please resend.</span>
              ) : (
                <>Code expires in <span>{formatTime(timerSeconds)}</span></>
              )}
            </div>

            <button className="btn" onClick={handleVerifyOTP} disabled={verifying}>
              {verifying ? 'Verifying...' : 'Verify & Continue'}
            </button>

            <div className="otp-actions">
              <p>Didn&apos;t receive the code?</p>
              <button onClick={handleResendOTP}>Resend Code</button>
              <span className="otp-divider">|</span>
              <button onClick={() => setActiveTab('signup')}>Change Email</button>
            </div>
          </div>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <div className="auth-tab">
            <h2>Set Your Password</h2>
            <StepIndicator currentStep={3} />
            {passwordError && <div className="error-msg">{passwordError}</div>}

            <div className="otp-info">
              <div className="otp-icon">&#128274;</div>
              <p>Create a secure password for your account</p>
            </div>

            <input
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              type="password"
              placeholder="Confirm Password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
            />

            <button className="btn" onClick={handleSetPassword} disabled={settingPassword}>
              {settingPassword ? 'Setting up...' : 'Complete Setup'}
            </button>

            <p className="text-center" style={{ marginTop: 15, fontSize: 12, color: '#999' }}>
              <button onClick={() => setActiveTab('login')}>Back to Login</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
