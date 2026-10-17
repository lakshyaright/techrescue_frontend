import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ShieldCheck, ArrowRight, Building2, Laptop, Wrench, Shield, AlertCircle, CheckCircle2, Loader2, Wifi, WifiOff } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, loginAs } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('sonu.patel@fintechglobal.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');

  // Check URL query parameters for redirects or notices
  const searchParams = new URLSearchParams(location.search);
  const redirectTarget = searchParams.get('redirect');
  const stateReason = (location.state as any)?.reason;

  useEffect(() => {
    // Check backend health on mount
    api.testConnection().then(res => {
      setBackendStatus(res.isConnected ? 'connected' : 'offline');
    });
  }, []);

  const routeByRole = (role: string) => {
    if (redirectTarget) {
      navigate(redirectTarget, { replace: true });
      return;
    }
    switch (role) {
      case 'CLIENT': navigate('/client/dashboard'); break;
      case 'EXPERT': navigate('/expert/dashboard'); break;
      case 'ENGINEER': navigate('/engineer/dashboard'); break;
      case 'ADMIN': navigate('/admin/dashboard'); break;
      default: navigate('/client/dashboard');
    }
  };

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success && res.user) {
        routeByRole(res.user.role);
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleFastLogin = async (fastEmail: string, role: string, fastId: string) => {
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await login(fastEmail, 'password123');
      if (res.success && res.user) {
        routeByRole(res.user.role);
      } else {
        // Fallback to local demo profile
        loginAs(fastId);
        routeByRole(role);
      }
    } catch (e) {
      loginAs(fastId);
      routeByRole(role);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Sign In to TechRescue
          </h2>
          <p className="text-xs text-slate-500">
            Access your verified incident console, specialist workspace, or dispatch queue
          </p>

          {/* Backend Connectivity Indicator */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium mt-1">
            {backendStatus === 'checking' && (
              <span className="text-slate-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking Backend API...
              </span>
            )}
            {backendStatus === 'connected' && (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                <Wifi className="w-3 h-3 text-emerald-600" /> Backend API Connected (PostgreSQL)
              </span>
            )}
            {backendStatus === 'offline' && (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                <WifiOff className="w-3 h-3 text-amber-600" /> Standalone Demo Mode (Backend Offline)
              </span>
            )}
          </div>
        </div>

        {/* Notice if redirected due to unauthenticated access */}
        {stateReason === 'authentication_required' && (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Please sign in to access the requested protected workspace.</span>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1-Click Instant Demo Profiles Box */}
        <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
              1-Click Verified Role Login:
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleFastLogin('sonu.patel@fintechglobal.com', 'CLIENT', 'usr-client-1')}
              className="p-2.5 rounded-lg bg-white border border-blue-200 hover:border-blue-400 text-left transition-colors shadow-2xs group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-blue-700 font-semibold mb-0.5">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>Client</span>
              </div>
              <span className="text-[11px] text-slate-600 block truncate">Sonu Patel (VP IT)</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleFastLogin('rahul.sharma@cloudarchitects.io', 'EXPERT', 'usr-expert-1')}
              className="p-2.5 rounded-lg bg-white border border-blue-200 hover:border-blue-400 text-left transition-colors shadow-2xs group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-blue-700 font-semibold mb-0.5">
                <Laptop className="w-3.5 h-3.5 shrink-0" />
                <span>Expert</span>
              </div>
              <span className="text-[11px] text-slate-600 block truncate">Rahul S. (Architect)</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleFastLogin('rajesh.k@fieldtechrescue.in', 'ENGINEER', 'usr-eng-1')}
              className="p-2.5 rounded-lg bg-white border border-blue-200 hover:border-blue-400 text-left transition-colors shadow-2xs group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-blue-700 font-semibold mb-0.5">
                <Wrench className="w-3.5 h-3.5 shrink-0" />
                <span>Field Eng</span>
              </div>
              <span className="text-[11px] text-slate-600 block truncate">Rajesh K. (On-site)</span>
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleFastLogin('admin@techrescue.io', 'ADMIN', 'usr-admin-1')}
              className="p-2.5 rounded-lg bg-white border border-blue-200 hover:border-blue-400 text-left transition-colors shadow-2xs group cursor-pointer disabled:opacity-50"
            >
              <div className="flex items-center gap-1.5 text-blue-700 font-semibold mb-0.5">
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Admin</span>
              </div>
              <span className="text-[11px] text-slate-600 block truncate">Lakshya (SuperAdmin)</span>
            </button>
          </div>
        </div>

        {/* Standard Form */}
        <div className="bg-white p-6 sm:p-8 rounded-xl border border-slate-200 shadow-2xs space-y-4">
          <form onSubmit={handleCustomLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Corporate Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link to="/auth/forgot-password" className="text-[11px] text-blue-600 hover:underline">
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Default password for seeded accounts: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">password123</code>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Authenticating with Backend...</span>
                </>
              ) : (
                <>
                  <span>Sign In with Credentials</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
            Don't have an enterprise account?{' '}
            <Link to="/auth/signup" className="text-blue-600 font-semibold hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
