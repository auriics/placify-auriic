import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';

const TEAM_IMAGES = [
  '/team-1.webp',
  '/team-2.webp',
  '/team-3.webp',
  '/team-4.webp'
];

export const LoginPage: React.FC = () => {
  const { login, resetPassword } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [errors, setErrors] = useState({
    email: '',
    password: '',
    general: ''
  });

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % TEAM_IMAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: '', password: '', general: '' };

    if (!formData.email) {
      newErrors.email = 'Email address is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }

    if (!isResetting && !formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({ email: '', password: '', general: '' });
    
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      if (isResetting) {
        await resetPassword(formData.email);
        showToast('Password reset instructions have been sent to your email.', 'success');
        setIsResetting(false);
      } else {
        await login(formData.email, formData.password);
        showToast('Successfully signed in', 'success');
      }
    } catch (error: any) {
      console.warn('Auth error:', error.message);
      let message = 'An unexpected error occurred. Please try again.';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      }
      
      setErrors(prev => ({ ...prev, general: message }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex font-sans bg-bg-secondary">
      
      {/* Left Side - Team Image (Hidden on smaller screens) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-black">
        {TEAM_IMAGES.map((src, index) => (
          <img 
            key={src}
            src={src} 
            alt={`Auriic Team ${index + 1}`} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ease-in-out ${
              index === currentImageIndex ? 'opacity-90' : 'opacity-0'
            }`}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-12 pointer-events-none">
          <div className="max-w-md">
            <h2 className="text-white text-3xl font-bold mb-3 tracking-tight">Meet the team behind Auriic Services.</h2>
            <p className="text-white/80 text-lg leading-relaxed">
              We are dedicated to connecting talent with the right opportunities and helping professionals build successful careers in a rapidly changing workforce.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Area */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 sm:p-8">
        
        {/* Brand Logos */}
        <div className="mb-8 md:mb-10 flex items-center justify-center gap-3 md:gap-5">
          <img 
            src={theme === 'dark' 
              ? "https://auriic.co/wp-content/uploads/2026/04/Auriic-logo-Header.webp" 
              : "https://auriic.co/wp-content/uploads/2026/05/Auriic_dark_Logo.webp"
            } 
            alt="Auriic Logo" 
            className="h-12 md:h-16 w-auto object-contain"
          />
          <div className="text-gray-300 dark:text-gray-600 font-light text-xl md:text-2xl mt-1">
            ✕
          </div>
          <img 
            src="/placify-logo.webp" 
            alt="Placify Logo" 
            className={`h-9 md:h-12 w-auto object-contain ${theme !== 'dark' ? 'invert' : ''}`}
          />
        </div>

        {/* Main Card */}
        <div className="w-full max-w-[400px] bg-bg-primary rounded-xl shadow-sm border border-border-primary p-6 sm:p-8">
          
          <div className="mb-8 text-center sm:text-left">
            <h1 className="text-2xl font-semibold text-text-primary tracking-tight">
              {isResetting ? 'Reset your password' : 'Sign in to Placify'}
            </h1>
            <p className="text-sm text-text-secondary mt-2">
              {isResetting 
                ? 'Enter your email and we\'ll send you instructions.' 
                : 'Welcome back! Please enter your details.'}
            </p>
          </div>

          {errors.general && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email Field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-text-primary">
                Email Address
              </label>
              <input 
                id="email"
                type="email" 
                value={formData.email}
                onChange={e => {
                  setFormData({...formData, email: e.target.value});
                  if (errors.email) setErrors({...errors, email: ''});
                }}
                placeholder="name@company.com"
                className={`w-full bg-bg-secondary border ${errors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-border-primary focus:border-accent-blue focus:ring-accent-blue'} rounded-lg px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 transition-shadow`}
              />
              {errors.email && (
                <p className="text-sm text-red-500 mt-1">{errors.email}</p>
              )}
            </div>

            {/* Password Field (Only when not resetting) */}
            {!isResetting && (
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-text-primary">
                  Password
                </label>
                <div className="relative">
                  <input 
                    id="password"
                    type={showPassword ? "text" : "password"} 
                    value={formData.password}
                    onChange={e => {
                      setFormData({...formData, password: e.target.value});
                      if (errors.password) setErrors({...errors, password: ''});
                    }}
                    placeholder="••••••••"
                    className={`w-full bg-bg-secondary border ${errors.password ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-border-primary focus:border-accent-blue focus:ring-accent-blue'} rounded-lg px-3.5 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 transition-shadow`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary focus:outline-none transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password}</p>
                )}
              </div>
            )}

            {/* Remember Me & Forgot Password */}
            {!isResetting && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="w-4 h-4 rounded border border-border-primary bg-bg-secondary peer-checked:bg-accent-blue peer-checked:border-accent-blue peer-focus-visible:ring-2 peer-focus-visible:ring-accent-blue peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-bg-primary transition-colors flex items-center justify-center">
                      <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">Remember me</span>
                </label>
                
                <button 
                  type="button"
                  onClick={() => {
                    setIsResetting(true);
                    setErrors({ email: '', password: '', general: '' });
                  }}
                  className="text-sm font-medium text-accent-blue hover:text-accent-blue/80 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center py-2.5 px-4 bg-accent-blue hover:brightness-110 active:brightness-95 text-white text-sm font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <span>{isResetting ? 'Send reset link' : 'Sign in'}</span>
              )}
            </button>
          </form>

          {isResetting && (
            <div className="mt-6 text-center">
              <button 
                onClick={() => {
                  setIsResetting(false);
                  setErrors({ email: '', password: '', general: '' });
                }}
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Back to log in
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-text-muted">
            © {new Date().getFullYear()} Placify CRM. All rights reserved.
          </p>
        </div>
      </div>
      
    </div>
  );
};
