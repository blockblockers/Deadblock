// AccountDeletionModal.jsx - Account deletion modal
// v7.15: Simplified modal for account deletion only (password reset available in sign-in flow)
// Place in src/components/AccountDeletionModal.jsx

import { useState } from 'react';
import { X, Mail, Lock, Eye, EyeOff, Trash2, AlertTriangle, CheckCircle, Loader, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';
import { soundManager } from '../utils/soundManager';

/**
 * AccountDeletionModal - Modal for permanent account deletion
 * Requires user to verify credentials before deletion
 */
const AccountDeletionModal = ({ onClose }) => {
  const { signIn } = useAuth();
  
  // View modes: 'verify', 'confirm', 'success'
  const [view, setView] = useState('verify');
  
  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const requiredConfirmText = 'DELETE';
  
  // Verify credentials before allowing deletion
  const handleVerifyCredentials = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !email.includes('@')) {
      setError('Please enter your email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    
    setLoading(true);
    soundManager.playButtonClick?.();
    
    try {
      // Attempt to sign in to verify credentials
      const result = await signIn(email, password);
      
      if (result.error) {
        setError('Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }
      
      // Credentials verified, proceed to confirmation
      setView('confirm');
    } catch (err) {
      setError('Failed to verify credentials');
    }
    
    setLoading(false);
  };
  
  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (confirmText !== requiredConfirmText) return;
    
    setLoading(true);
    setError('');
    soundManager.playButtonClick?.();
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('No user session found. Please try again.');
        setLoading(false);
        return;
      }
      
      console.log('[AccountDeletion] Attempting to delete account for:', user.id);
      
      // Try the RPC function first (preferred method - handles cascade deletion)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('delete_user_account', {
        p_user_id: user.id
      });
      
      if (rpcError) {
        console.warn('[AccountDeletion] RPC delete failed:', rpcError.message);
        
        // Check if it's a "function does not exist" error
        if (rpcError.message?.includes('does not exist') || rpcError.code === '42883') {
          console.log('[AccountDeletion] RPC function not found, using fallback deletion');
          
          // Fallback: Delete profile directly (cascades should handle related data)
          const { error: profileError } = await supabase
            .from('profiles')
            .delete()
            .eq('id', user.id);
          
          if (profileError) {
            console.error('[AccountDeletion] Profile deletion failed:', profileError);
            setError('Failed to delete account. Please contact support at deadblock.game@gmail.com');
            setLoading(false);
            return;
          }
        } else {
          // Some other RPC error
          setError('Failed to delete account. Please contact support at deadblock.game@gmail.com');
          setLoading(false);
          return;
        }
      } else {
        console.log('[AccountDeletion] RPC delete successful:', rpcResult);
      }
      
      // Sign out the user
      await supabase.auth.signOut();
      
      // Clear any cached data
      try {
        localStorage.removeItem('deadblock_profile_cache');
        // Clear other app-specific cached data
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('deadblock_')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.warn('[AccountDeletion] Failed to clear cache:', e);
      }
      
      setView('success');
      setSuccess('Your account has been permanently deleted.');
      
      // Redirect to home after delay
      setTimeout(() => {
        window.location.href = '/';
      }, 3000);
      
    } catch (err) {
      console.error('[AccountDeletion] Delete error:', err);
      setError('Failed to delete account. Please contact support at deadblock.game@gmail.com');
    }
    
    setLoading(false);
  };
  
  // Render credential verification view
  const renderVerifyView = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
          <Trash2 size={32} className="text-red-400" />
        </div>
        <h3 className="text-red-400 font-bold text-lg">Delete Account</h3>
        <p className="text-slate-400 text-sm mt-1">Enter your credentials to continue</p>
      </div>
      
      <div className="p-3 bg-amber-900/30 border border-amber-500/30 rounded-xl">
        <p className="text-amber-300 text-xs text-center">
          ⚠️ This action is permanent and cannot be undone. All your data will be deleted.
        </p>
      </div>
      
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleVerifyCredentials} className="space-y-3">
        <div>
          <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800/80 rounded-xl text-white border border-slate-600 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 focus:outline-none transition-all"
              placeholder="your@email.com"
              required
              autoComplete="email"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-slate-400 text-xs mb-1.5 uppercase tracking-wider">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 bg-slate-800/80 rounded-xl text-white border border-slate-600 focus:border-red-500 focus:ring-1 focus:ring-red-500/50 focus:outline-none transition-all"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader size={18} className="animate-spin" /> Verifying...</>
            ) : (
              'Continue'
            )}
          </button>
        </div>
      </form>
    </div>
  );
  
  // Render deletion confirmation view
  const renderConfirmView = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
          <AlertTriangle size={32} className="text-red-400" />
        </div>
        <h3 className="text-red-400 font-bold text-lg">Final Warning</h3>
        <p className="text-slate-400 text-sm mt-2">
          This will permanently delete your account and all associated data:
        </p>
      </div>
      
      <ul className="text-slate-500 text-xs space-y-1 px-4">
        <li>• Your profile and username</li>
        <li>• Game history and statistics</li>
        <li>• Achievements and progress</li>
        <li>• Friends list and messages</li>
        <li>• ELO rating and leaderboard position</li>
      </ul>
      
      {error && (
        <div className="p-3 bg-red-900/50 border border-red-500/50 rounded-xl text-red-300 text-sm">
          {error}
        </div>
      )}
      
      <div className="p-3 bg-red-900/30 border border-red-500/30 rounded-xl">
        <p className="text-red-300 text-sm text-center mb-2">
          Type <span className="font-mono font-bold bg-red-500/20 px-1.5 py-0.5 rounded">DELETE</span> to confirm
        </p>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
          className="w-full px-4 py-2.5 bg-slate-800/80 rounded-lg text-white text-center font-mono border border-red-500/30 focus:border-red-500 focus:outline-none"
          placeholder="Type DELETE"
          autoComplete="off"
        />
      </div>
      
      <div className="flex gap-3">
        <button
          onClick={() => { setView('verify'); setConfirmText(''); setError(''); }}
          disabled={loading}
          className="flex-1 py-3 rounded-xl font-bold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700"
        >
          Go Back
        </button>
        <button
          onClick={handleDeleteAccount}
          disabled={loading || confirmText !== requiredConfirmText}
          className="flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader size={18} className="animate-spin" /> Deleting...</>
          ) : (
            <><Trash2 size={18} /> Delete Forever</>
          )}
        </button>
      </div>
    </div>
  );
  
  // Render success view
  const renderSuccessView = () => (
    <div className="space-y-4 text-center py-4">
      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
        <CheckCircle size={32} className="text-green-400" />
      </div>
      <h3 className="text-green-400 font-bold text-lg">Account Deleted</h3>
      <p className="text-slate-400 text-sm">
        Your account has been permanently deleted.
      </p>
      <p className="text-slate-500 text-xs">
        Redirecting to home page...
      </p>
      <div className="w-8 h-8 border-2 border-slate-600 border-t-green-400 rounded-full animate-spin mx-auto mt-4" />
    </div>
  );
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl max-w-sm w-full overflow-hidden border border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.15)]">
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-white font-bold">Delete Account</h2>
          {view !== 'success' && (
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
          className="p-5 max-h-[70vh] overflow-y-auto"
          style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}
        >
          {view === 'verify' && renderVerifyView()}
          {view === 'confirm' && renderConfirmView()}
          {view === 'success' && renderSuccessView()}
        </div>
        
        {/* Footer with support link */}
        {view !== 'success' && (
          <div className="px-5 pb-4 pt-2 border-t border-slate-800">
            <p className="text-slate-600 text-xs text-center">
              Need help?{' '}
              <a 
                href="mailto:deadblock.game@gmail.com" 
                className="text-slate-500 hover:text-slate-400 underline"
              >
                Contact support
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountDeletionModal;
