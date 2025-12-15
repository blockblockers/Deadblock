import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Create context
const AuthContext = createContext(null);

// Supabase configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = SUPABASE_URL && SUPABASE_ANON_KEY && 
  SUPABASE_URL !== 'your-supabase-url' && 
  SUPABASE_ANON_KEY !== 'your-supabase-anon-key';

// Create Supabase client only if configured
const supabase = isSupabaseConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    })
  : null;

// Profile cache utilities
const PROFILE_CACHE_KEY = 'deadblock_profile_cache';
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedProfile = () => {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;
    
    const { profile, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > PROFILE_CACHE_TTL) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }
    return profile;
  } catch {
    return null;
  }
};

const setCachedProfile = (profile) => {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      profile,
      timestamp: Date.now()
    }));
  } catch {
    // Ignore localStorage errors
  }
};

const clearCachedProfile = () => {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {
    // Ignore localStorage errors
  }
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const initRef = useRef(false);
  const fetchingProfileRef = useRef(false);

  // Fetch user profile from Supabase with retry logic
  const fetchProfile = useCallback(async (userId, retryCount = 0) => {
    if (!supabase || !userId) return null;
    
    // Prevent concurrent fetches
    if (fetchingProfileRef.current) {
      console.log('[AuthContext] fetchProfile: Already fetching, skipping');
      return null;
    }
    
    fetchingProfileRef.current = true;
    console.log(`[AuthContext] fetchProfile: fetching for ${userId}, attempt ${retryCount + 1}`);

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
      );

      // Race between fetch and timeout
      const { data, error } = await Promise.race([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        timeoutPromise
      ]);

      if (error) {
        console.log('[AuthContext] fetchProfile: Error:', error.message);
        
        // Retry on network errors
        if (retryCount < 2 && (error.message.includes('timeout') || error.message.includes('fetch'))) {
          fetchingProfileRef.current = false;
          await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
          return fetchProfile(userId, retryCount + 1);
        }
        
        fetchingProfileRef.current = false;
        return null;
      }

      console.log('[AuthContext] fetchProfile: Success');
      setCachedProfile(data);
      fetchingProfileRef.current = false;
      return data;
    } catch (err) {
      console.log('[AuthContext] fetchProfile: Exception:', err.message);
      
      // Retry on timeout
      if (retryCount < 2) {
        fetchingProfileRef.current = false;
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
        return fetchProfile(userId, retryCount + 1);
      }
      
      fetchingProfileRef.current = false;
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    if (!supabase || initRef.current) {
      setLoading(false);
      return;
    }

    initRef.current = true;
    console.log('[AuthContext] Initializing...');

    const initAuth = async () => {
      try {
        // Check for cached profile first
        const cachedProfile = getCachedProfile();
        if (cachedProfile) {
          console.log('[AuthContext] Using cached profile');
          setProfile(cachedProfile);
        }

        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.log('[AuthContext] getSession error:', error.message);
          setLoading(false);
          return;
        }

        if (session?.user) {
          console.log('[AuthContext] Session found, user:', session.user.id);
          setUser(session.user);
          setSessionReady(true);
          
          // Fetch fresh profile in background if no cache
          if (!cachedProfile) {
            const freshProfile = await fetchProfile(session.user.id);
            if (freshProfile) {
              setProfile(freshProfile);
            }
          }
        } else {
          console.log('[AuthContext] No session');
        }
      } catch (err) {
        console.log('[AuthContext] Init error:', err.message);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AuthContext] Auth state change:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setSessionReady(true);
        
        // Fetch profile
        const profile = await fetchProfile(session.user.id);
        if (profile) {
          setProfile(profile);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setSessionReady(false);
        clearCachedProfile();
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('[AuthContext] Token refreshed');
      }
    });

    initAuth();

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchProfile]);

  // Sign in with email/password
  const signIn = async (email, password) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { data, error };
  };

  // Sign up with email/password
  const signUp = async (email, password) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { data, error };
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    return { data, error };
  };

  // Sign in with magic link (passwordless)
  const signInWithMagicLink = async (email) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?type=magiclink`
      }
    });

    return { data, error };
  };

  // Send password reset email
  const resetPassword = async (email) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`
    });

    return { data, error };
  };

  // Update user password
  const updatePassword = async (newPassword) => {
    if (!supabase || !user) return { error: { message: 'Not authenticated' } };

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    return { data, error };
  };

  // Update user email
  const updateEmail = async (newEmail) => {
    if (!supabase || !user) return { error: { message: 'Not authenticated' } };

    const { data, error } = await supabase.auth.updateUser({
      email: newEmail
    });

    return { data, error };
  };

  // FIXED: Sign out with timeout handling and immediate local state clearing
  const signOut = async () => {
    console.log('[AuthContext] signOut: Starting sign out process...');
    
    // First, clear all local state immediately (don't wait for Supabase)
    setUser(null);
    setProfile(null);
    setSessionReady(false);
    
    // Clear entry auth flag so user sees auth screen on next visit
    localStorage.removeItem('deadblock_entry_auth_passed');
    
    // Clear cached profile
    clearCachedProfile();
    
    // Clear all Supabase-related localStorage items
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.log('[AuthContext] signOut: Error removing key:', key, e);
      }
    });
    
    console.log('[AuthContext] signOut: Cleared local state and localStorage');
    
    // Try to sign out from Supabase (with timeout to prevent hanging)
    if (supabase) {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sign out timeout')), 3000)
        );
        
        const signOutPromise = supabase.auth.signOut();
        
        await Promise.race([signOutPromise, timeoutPromise]);
        console.log('[AuthContext] signOut: Supabase sign out successful');
      } catch (err) {
        // Don't worry about errors - we've already cleared local state
        console.log('[AuthContext] signOut: Supabase call failed/timed out (local state already cleared):', err.message);
      }
    }
    
    console.log('[AuthContext] signOut: Complete');
    return { error: null };
  };

  // Update profile
  const updateProfile = async (updates) => {
    if (!supabase || !user) return { error: { message: 'Not authenticated' } };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setCachedProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error('[AuthContext] updateProfile error:', error);
      return { data: null, error };
    }
  };

  // Create or update profile
  const upsertProfile = async (profileData) => {
    if (!supabase || !user) return { error: { message: 'Not authenticated' } };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
      setCachedProfile(data);
      return { data, error: null };
    } catch (error) {
      console.error('[AuthContext] upsertProfile error:', error);
      return { data: null, error };
    }
  };

  // Refresh profile from database
  const refreshProfile = async () => {
    if (!user) return;
    
    clearCachedProfile();
    const freshProfile = await fetchProfile(user.id);
    if (freshProfile) {
      setProfile(freshProfile);
    }
  };

  const value = {
    user,
    profile,
    loading,
    sessionReady,
    isAuthenticated: !!user,
    isOnlineEnabled: isSupabaseConfigured,
    supabase,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithMagicLink,
    resetPassword,
    updatePassword,
    updateEmail,
    signOut,
    updateProfile,
    upsertProfile,
    refreshProfile,
    fetchProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
