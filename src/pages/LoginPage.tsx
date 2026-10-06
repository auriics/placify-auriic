import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useTheme } from '../contexts/ThemeContext';
import { Eye, EyeOff, ArrowRight, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const LoginPage: React.FC = () => {
  const { login, resetPassword } = useAuth();
  const { showToast } = useToast();
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isResetting) {
        await resetPassword(formData.email);
        showToast('Password reset email sent! Please check your inbox.', 'success');
        setIsResetting(false);
      } else {
        await login(formData.email, formData.password);
        showToast('Successfully logged in!', 'success');
      }
    } catch (error: any) {
      console.warn('Auth error:', error.message);
      let message = 'Failed to authenticate. Please try again.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Invalid email or password. Please try again.';
      }
      if (error.code === 'auth/invalid-email') message = 'Invalid email format.';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bg-primary overflow-hidden font-sans">
      {/* Visual Side */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative overflow-hidden bg-zinc-950 flex-col justify-between p-12 xl:p-16">
        {/* Modern dark gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-zinc-950 z-0" />
        
        {/* Abstract soft glows */}
        <div className="absolute top-1/4 -left-1/4 w-[500px] h-[500px] bg-accent-blue/20 rounded-full mix-blend-screen filter blur-[120px] z-0 animate-pulse duration-[10s]" />
        <div className="absolute bottom-1/4 -right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full mix-blend-screen filter blur-[120px] z-0" />

        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />

        {/* Top: Logo */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-20 flex items-center gap-3"
        >
          <img 
            src="https://auriic.co/wp-content/uploads/2026/04/Auriic-logo-Header.webp"
            alt="Auriic Logo" 
            className="h-8 w-auto brightness-0 invert"
            referrerPolicy="no-referrer"
          />
        </motion.div>

        {/* Middle: Value Prop / Quote */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-20 max-w-lg"
        >
          <Quote className="w-12 h-12 text-white/10 mb-6" />
          <h1 className="text-3xl xl:text-4xl font-semibold text-white leading-[1.3] tracking-tight mb-8">
            "Auriic has completely transformed how we manage our talent pipeline. The efficiency gains are unprecedented."
          </h1>
          <div className="flex items-center gap-4">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" alt="Sarah J." className="w-12 h-12 rounded-full border-2 border-white/10 bg-white/5" />
            <div>
              <div className="text-white font-medium text-sm">Sarah Jenkins</div>
              <div className="text-white/50 text-sm">Head of Talent Acquisition, TechCorp</div>
            </div>
          </div>
        </motion.div>

        {/* Bottom: Metrics */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative z-20 flex items-center gap-10 border-t border-white/10 pt-8"
        >
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white tracking-tight">10k+</span>
            <span className="text-sm text-white/50 font-medium">Active Candidates</span>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-white tracking-tight">99.9%</span>
            <span className="text-sm text-white/50 font-medium">Service Uptime</span>
          </div>
        </motion.div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 relative bg-bg-primary">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-[380px] space-y-8"
        >
          {/* Logo for mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <img 
              src={theme === 'dark' 
                ? "https://auriic.co/wp-content/uploads/2026/04/Auriic-logo-Header.webp" 
                : "https://auriic.co/wp-content/uploads/2026/05/Auriic_dark_Logo.webp"
              } 
              alt="Auriic Logo" 
              className="h-8 w-auto"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="text-center sm:text-left space-y-2">
            <motion.h2 variants={itemVariants} className="text-2xl sm:text-3xl font-semibold text-text-primary tracking-tight">
              {isResetting ? 'Reset your password' : 'Log in to your account'}
            </motion.h2>
            <motion.p variants={itemVariants} className="text-sm text-text-secondary">
              {isResetting 
                ? 'Enter your email and we will send you a reset link.' 
                : 'Welcome back! Please enter your details.'}
            </motion.p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <motion.div variants={itemVariants} className="space-y-1.5">
              <label className="text-sm font-medium text-text-primary block">Email</label>
              <input 
                type="email" 
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="name@company.com"
                className="w-full bg-bg-secondary border border-border-primary rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all"
              />
            </motion.div>

            {!isResetting && (
              <motion.div variants={itemVariants} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text-primary">Password</label>
                  <button 
                    type="button"
                    onClick={() => setIsResetting(true)}
                    className="text-sm font-medium text-accent-blue hover:text-accent-blue/80 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-bg-secondary border border-border-primary rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </motion.div>
            )}

            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90 transition-all focus:outline-none focus:ring-2 focus:ring-accent-blue focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-70 mt-4 shadow-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{isResetting ? 'Send reset link' : 'Sign in'}</span>
              )}
            </motion.button>
          </form>

          <AnimatePresence>
            {isResetting && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center pt-2"
              >
                <button 
                  onClick={() => setIsResetting(false)} 
                  className="text-sm font-medium text-text-secondary hover:text-text-primary flex items-center justify-center gap-2 w-full transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  Back to log in
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-6 left-0 right-0 flex flex-col items-center pointer-events-none"
        >
          <p className="text-[11px] text-text-muted/60 font-medium tracking-wide">
            AURIIC ENTERPRISE © {new Date().getFullYear()}
          </p>
        </motion.div>
      </div>
    </div>
  );
};
