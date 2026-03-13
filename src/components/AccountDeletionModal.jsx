// AccountDeletionModal.jsx - Account deletion modal
// v7.19: FIXED - Uses direct fetch for credential verification to avoid triggering
//   auth state changes that navigate the user away before deletion completes.
//   Single-screen flow: email + password + type DELETE → verify + delete in one action.
// Place in src/components/AccountDeletionModal.jsx

import { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, Trash2, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * AccountDeletionModal - Modal for permanent account deletion
 * Flow: Enter email + password + type DELETE → verify credentials via direct fetch → delete account
 * Uses direct fetch instead of supabase.auth.signIn to avoid triggering React auth state changes
 */
const AccountDeletionModal = ({ onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const canDelete = email.includes('@') && password.length > 0 && confirmText === 'DELETE';
  
  // Verify credentials and delete account in one flow using direct fetch
  const handleDelete = async () => {
    if (!canDelete) return;
    
    setLoading(true);
    setError('');
    soundManager.playButtonClick?.();
    
    try {
      // Step 1: Verify credentials via direct fetch (no auth state change)
      const authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });
      
      if (!authResponse.ok) {
        const authError = await authResponse.json().catch(() => ({}));
        if (authResponse.status === 400) {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(authError.error_description || authError.msg || 'Authentication failed.');
        }
        setLoading(false);
        return;
      }
      
      const authData = await authResponse.json();
      const accessToken = authData.access_token;
      const userId = authData.user?.id;
      
      if (!accessToken || !userId) {
        setError('Authentication failed. Please try again.');
        setLoading(false);
        return;
      }
      
      // Step 2: Delete account using the access token
      let deleted = false;
      
      // Try Edge Function first
      try {
        const edgeResponse = await fetch(
          `${SUPABASE_URL}/functions/v1/delete-user-account`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (edgeResponse.ok) {
          const result = await edgeResponse.json();
          if (result.success) deleted = true;
        }
      } catch (e) {
        console.warn('[AccountDeletion] Edge function failed:', e);
      }
      
      // Fallback: try RPC
      if (!deleted) {
        try {
          const rpcResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/delete_user_account`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': ANON_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_user_id: userId }),
          });
          
          if (rpcResponse.ok) {
            deleted = true;
          }
        } catch (e) {
          console.warn('[AccountDeletion] RPC failed:', e);
        }
      }
      
      // Fallback: delete profile directly
      if (!deleted) {
        const profileResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'apikey': ANON_KEY,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!profileResponse.ok) {
          setError('Failed to delete account. Contact deadblock.game@gmail.com');
          setLoading(false);
          return;
        }
      }
      
      // Step 3: Sign out the session we created
      try {
        await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'apikey': ANON_KEY,
          },
        });
      } catch (e) {
        // Ignore sign-out errors
      }
      
      // Step 4: Clear local data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('deadblock_') || key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      setSuccess(true);
      setTimeout(() => { window.location.href = '/'; }, 2500);
      
    } catch (err) {
      console.error('[AccountDeletion] Error:', err);
      setError('An unexpected error occurred. Contact deadblock.game@gmail.com');
      setLoading(false);
    }
  };
  
  if (success) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-slate-900 rounded-2xl max-w-sm w-full overflow-hidden border border-green-500/30 shadow-[0_0_50px_rgba(34,197,94,0.15)]">
          <div className="p-8 text-center">
            <CheckCircle size={48} className="text-green-400 mx-auto mb-4" />
            <h3 className="text-green-400 font-bold text-lg mb-2">Account Deleted</h3>
            <p className="text-slate-400 text-sm">Your account has been permanently deleted.</p>
            <p className="text-slate-500 text-xs mt-2">Redirecting...</p>
            <div className="w-8 h-8 border-2 border-slate-600 border-t-green-400 rounded-full animate-spin mx-auto mt-4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl max-w-sm w-full overflow-hidden border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)]">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trash2 size={20} className="text-red-400" />
            <h2 className="text-white font-bold">Delete Account</h2>
          </div>
          {!loading && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
        
        {/* Content */}
        <div 
          className="p-5 space-y-4 max-h-[70vh] overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {/* Warning */}
          <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <span className="text-red-300 text-sm font-bold">Permanent action</span>
            </div>
            <p className="text-red-300/70 text-xs">
              This will permanently delete your profile, game history, stats, friends, achievements, and ELO rating.
            </p>
          </div>
          
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}
          
          {/* Email */}
          <div>
            <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 rounded-lg text-white text-sm border border-slate-600 focus:border-red-500 focus:outline-none transition-all"
                placeholder="your@email.com"
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>
          
          {/* Password */}
          <div>
            <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-2.5 bg-slate-800/80 rounded-lg text-white text-sm border border-slate-600 focus:border-red-500 focus:outline-none transition-all"
                placeholder="Enter your password"
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          
          {/* Type DELETE */}
          <div>
            <label className="block text-slate-400 text-xs mb-1.5">
              Type <span className="text-red-400 font-bold font-mono">DELETE</span> to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              className="w-full px-3 py-2.5 bg-slate-800/80 rounded-lg text-white text-center font-mono text-sm border border-red-500/30 focus:border-red-500 focus:outline-none"
              placeholder="Type DELETE"
              autoComplete="off"
              disabled={loading}
            />
          </div>
          
          {/* Buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-600 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!canDelete || loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-lg text-sm font-bold hover:from-red-500 hover:to-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <><Loader size={14} className="animate-spin" /> Deleting...</>
              ) : (
                <><Trash2 size={14} /> Delete Account</>
              )}
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-5 pb-4 pt-2 border-t border-slate-800">
          <p className="text-slate-600 text-xs text-center">
            Need help?{' '}
            <a href="mailto:deadblock.game@gmail.com" className="text-slate-500 hover:text-slate-400 underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AccountDeletionModal;
