// AuthContext - Authentication state and methods
// FIXES:
// 1. Better error handling for sign in with specific error messages
// 2. Password recovery detection and redirect to settings
// 3. Better debugging for login issues (400 Bad Request)
// 4. New user detection for Google OAuth
// 5. Resend confirmation email function
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

const AuthContext = createContext(null);

// Cache helpers for instant profile loading
const PROFILE_CACHE_KEY = 'deadblock_profile_cache';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

const loadCachedProfile = () => {
  try {
    const cached = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!cached) return null;
    const { profile, timestamp, userId } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_MAX_AGE) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return null;
    }
    return { profile, userId };
  } catch (e) {
    return null;
  }
};

const saveCachedProfile = (userId, profile) => {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({
      profile,
      userId,
      timestamp: Date.now()
    }));
  } catch (e) {
    console.error('Failed to cache profile:', e);
  }
};

const clearCachedProfile = () => {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch (e) {
    // Ignore
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const initialFetchDone = useRef(false);

  const isOnlineEnabled = isSupabaseConfigured();

  // Fetch profile with retry logic
  const fetchProfile = useCallback(async (userId, retryCount = 0) => {
    const maxRetries = 3;
    
    if (!supabase || !userId) {
      console.log('[AuthContext] fetchProfile: No supabase or userId');
      return null;
    }
    
    console.log('[AuthContext] fetchProfile: Starting for', userId, 'retry:', retryCount);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[AuthContext] fetchProfile error:', error);
        if (error.code === 'PGRST116') {
          console.log('[AuthContext] Profile not found, may need to create one');
          if (retryCount < maxRetries) {
            console.log(`[AuthContext] Profile retry ${retryCount + 1}/${maxRetries}...`);
            await new Promise(r => setTimeout(r, 500 * (retryCount + 1)));
            return fetchProfile(userId, retryCount + 1);
          }
        }
        return null;
      }
      
      console.log('[AuthContext] fetchProfile success:', { username: data?.username, id: data?.id });
      setProfile(data);
      saveCachedProfile(userId, data);
      
      return data;
    } catch (err) {
      console.error('[AuthContext] fetchProfile exception:', err);
      if (retryCount < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * (retryCount + 1)));
        return fetchProfile(userId, retryCount + 1);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // Check URL for OAuth callback or recovery
    const url = window.location.href;
    const hash = window.location.hash;
    const search = window.location.search;
    
    const hasAccessToken = hash.includes('access_token=') || search.includes('access_token=');
    const hasCode = search.includes('code=');
    const hasAuthData = hasAccessToken || hasCode;
    
    // Check for password recovery type
    const urlParams = new URLSearchParams(search);
    const hashParams = new URLSearchParams(hash.replace('#', ''));
    const authType = urlParams.get('type') || hashParams.get('type');
    
    if (authType === 'recovery') {
      console.log('[AuthContext] Password recovery detected');
      setIsPasswordRecovery(true);
    }
    
    // Clean up empty callback URLs
    if (url.includes('/auth/callback') && !hasAuthData) {
      console.log('Cleaning up empty OAuth callback URL');
      window.history.replaceState({}, document.title, '/');
    }
    
    if (hasAuthData) {
      console.log('OAuth callback detected with auth data, processing...');
      setIsOAuthCallback(true);
    }

    // Handle OAuth callback
    const handleOAuthCallback = async () => {
      if (hasAuthData) {
        console.log('=== OAuth Callback Processing Started ===');
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OAuth timeout')), 8000)
          );
          
          console.log('OAuth: Getting session from Supabase...');
          const sessionPromise = supabase.auth.getSession();
          
          const { data, error } = await Promise.race([
            sessionPromise, 
            timeoutPromise.then(() => ({ data: null, error: { message: 'Timeout' } }))
          ]);
          
          console.log('OAuth: Session response:', { 
            hasData: !!data, 
            hasSession: !!data?.session,
            hasUser: !!data?.session?.user,
            error: error?.message 
          });
          
          if (error) {
            console.error('OAuth: Error getting session:', error);
            setIsOAuthCallback(false);
          } else if (data?.session) {
            console.log('OAuth: Session established successfully', {
              userId: data.session.user?.id,
              email: data.session.user?.email,
              provider: data.session.user?.app_metadata?.provider
            });
            setUser(data.session.user);
            
            try {
              console.log('OAuth: Fetching profile...');
              const profileResult = await fetchProfile(data.session.user.id);
              console.log('OAuth: Profile result:', { hasProfile: !!profileResult });
              
              // Check if this is a new user (profile created within last 60 seconds)
              if (profileResult?.created_at) {
                const createdAt = new Date(profileResult.created_at);
                const now = new Date();
                const diffSeconds = (now - createdAt) / 1000;
                if (diffSeconds < 60) {
                  console.log('OAuth: New user detected (profile created', diffSeconds, 'seconds ago)');
                  setIsNewUser(true);
                }
              }
            } catch (profileError) {
              console.error('OAuth: Profile fetch failed:', profileError);
            }
            
            console.log('OAuth: Callback processed successfully');
          } else {
            console.log('OAuth: No session in response');
            setIsOAuthCallback(false);
          }
          
          // Clean up URL after processing (but keep recovery type for settings)
          console.log('OAuth: Cleaning up URL');
          if (!authType) {
            window.history.replaceState({}, document.title, '/');
          }
        } catch (err) {
          console.error('OAuth: Callback error:', err);
          setIsOAuthCallback(false);
          window.history.replaceState({}, document.title, '/');
        }
        console.log('=== OAuth Callback Processing Finished ===');
      }
    };

    // Get initial session
    const initAuth = async () => {
      console.log('=== Auth Init Started ===');
      
      const cached = loadCachedProfile();
      if (cached?.profile && !initialFetchDone.current) {
        console.log('Auth init: Using cached profile for instant display:', cached.profile.username);
        setProfile(cached.profile);
        setLoading(false);
      }
      
      let timeoutCleared = false;
      
      const timeout = setTimeout(() => {
        if (!timeoutCleared) {
          console.log('Auth init: TIMEOUT - completing with current state');
          setSessionReady(true);
          setLoading(false);
        }
      }, cached?.profile ? 3000 : 8000);
      
      const clearTimeoutSafe = () => {
        timeoutCleared = true;
        clearTimeout(timeout);
      };
      
      try {
        console.log('Auth init: Handling OAuth callback (if any)...');
        await handleOAuthCallback();
        console.log('Auth init: OAuth callback handling complete');
        
        console.log('Auth init: Getting current session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth init: Error getting session:', error);
          clearTimeoutSafe();
          setSessionReady(true);
          setLoading(false);
          return;
        }
        
        console.log('Auth init: Session result', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          email: session?.user?.email 
        });
        
        setUser(session?.user ?? null);
        setSessionReady(true);
        console.log('Auth init: User state set, isAuthenticated will be:', !!session?.user, ', sessionReady: true');
        
        if (cached?.profile && session?.user) {
          if (cached.userId !== session.user.id) {
            console.log('Auth init: Cached profile is for different user, clearing');
            clearCachedProfile();
            setProfile(null);
          }
        }
        
        if (!session?.user) {
          if (cached?.profile) {
            console.log('Auth init: No session but have cached profile, clearing');
            clearCachedProfile();
            setProfile(null);
          }
          clearTimeoutSafe();
          setSessionReady(true);
          setLoading(false);
          return;
        }
        
        console.log('Auth init: Fetching fresh profile for', session.user.id);
        initialFetchDone.current = true;
        
        const profileResult = await fetchProfile(session.user.id);
        console.log('Auth init: Profile fetch result', { 
          hasProfile: !!profileResult,
          username: profileResult?.username 
        });
        
        if (!profileResult && !cached?.profile) {
          console.log('Auth init: Profile not found and no cache, starting retry...');
          for (let i = 0; i < 3; i++) {
            await new Promise(r => setTimeout(r, 500 * (i + 1)));
            const retryResult = await fetchProfile(session.user.id);
            console.log(`Auth init: Retry ${i + 1} result:`, { hasProfile: !!retryResult });
            if (retryResult) break;
          }
        }
        
        clearTimeoutSafe();
        console.log('Auth init: Setting loading to false');
        setLoading(false);
        console.log('=== Auth Init Complete ===');
      } catch (err) {
        console.error('Auth init: Error:', err);
        clearTimeoutSafe();
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth event:', event, session?.user?.email);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('[AuthContext] Setting sessionReady=true from', event);
          setSessionReady(true);
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[AuthContext] SIGNED_IN - fetching profile');
          await fetchProfile(session.user.id);
          
          const currentPath = window.location.pathname;
          if (currentPath.includes('/auth/callback') || window.location.hash || window.location.search) {
            // Don't clear URL if it's a recovery - let App.jsx handle it
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('type') !== 'recovery') {
              window.history.replaceState({}, document.title, '/');
            }
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('[AuthContext] TOKEN_REFRESHED - fetching profile for', session.user.id);
          const result = await fetchProfile(session.user.id);
          console.log('[AuthContext] TOKEN_REFRESHED - profile fetch result:', { 
            hasProfile: !!result, 
            username: result?.username 
          });
          
          if (!result) {
            console.log('[AuthContext] TOKEN_REFRESHED - profile not found, retrying...');
            for (let i = 0; i < 3; i++) {
              await new Promise(r => setTimeout(r, 1000 * (i + 1)));
              const retryResult = await fetchProfile(session.user.id);
              console.log(`[AuthContext] TOKEN_REFRESHED - retry ${i + 1}:`, { hasProfile: !!retryResult });
              if (retryResult) break;
            }
          }
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          console.log('[AuthContext] INITIAL_SESSION - fetching profile for', session.user.id);
          const result = await fetchProfile(session.user.id);
          console.log('[AuthContext] INITIAL_SESSION - profile fetch result:', { 
            hasProfile: !!result, 
            username: result?.username 
          });
          
          if (!result) {
            console.log('[AuthContext] INITIAL_SESSION - profile not found, retrying...');
            for (let i = 0; i < 3; i++) {
              await new Promise(r => setTimeout(r, 1000 * (i + 1)));
              const retryResult = await fetchProfile(session.user.id);
              console.log(`[AuthContext] INITIAL_SESSION - retry ${i + 1}:`, { hasProfile: !!retryResult });
              if (retryResult) break;
            }
          }
        } else if (event === 'INITIAL_SESSION' && !session) {
          console.log('[AuthContext] INITIAL_SESSION - no session, user not logged in');
          setSessionReady(true);
          if (loadCachedProfile()?.profile) {
            console.log('[AuthContext] Clearing stale cached profile');
            clearCachedProfile();
            setProfile(null);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsOAuthCallback(false);
          setIsPasswordRecovery(false);
          setSessionReady(true);
          clearCachedProfile();
          console.log('[AuthContext] SIGNED_OUT - cleared profile and cache');
        } else if (event === 'PASSWORD_RECOVERY') {
          console.log('[AuthContext] PASSWORD_RECOVERY event detected');
          setIsPasswordRecovery(true);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = useCallback(async (email, password, username) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    // Validate username format
    if (!username || username.length < 3 || username.length > 20) {
      return { error: { message: 'Username must be 3-20 characters' } };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { error: { message: 'Username can only contain letters, numbers, and underscores' } };
    }

    // Check if username is taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .ilike('username', username)
      .single();

    if (existing) {
      return { error: { message: 'Username already taken' } };
    }

    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: { 
          username: username.toLowerCase(), 
          display_name: username 
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (!error && data?.user) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();
      
      if (!profileCheck) {
        console.log('Profile not created by trigger, creating manually...');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: username.toLowerCase(),
            display_name: username
          });
        
        if (profileError) {
          console.error('Failed to create profile manually:', profileError);
        }
      }
      
      const needsEmailConfirmation = !data.session;
      setIsNewUser(true);
      
      return { 
        data, 
        error: null, 
        needsEmailConfirmation,
        isNewUser: true
      };
    }

    if (error) {
      let friendlyMessage = error.message;
      
      if (error.message.includes('database error')) {
        friendlyMessage = 'Account created but profile setup failed. Please try signing in.';
      } else if (error.message.includes('already registered')) {
        friendlyMessage = 'An account with this email already exists';
      } else if (error.message.includes('invalid email')) {
        friendlyMessage = 'Please enter a valid email address';
      } else if (error.message.includes('weak password')) {
        friendlyMessage = 'Password is too weak. Use at least 6 characters';
      }
      
      return { data, error: { ...error, message: friendlyMessage } };
    }

    return { data, error };
  }, []);

  // =====================================================
  // ENHANCED signIn with better error handling for 400 errors
  // =====================================================
  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    console.log('[AuthContext] signIn: Attempting login for', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(), // Normalize email
      password
    });

    if (error) {
      console.error('[AuthContext] signIn error:', error);
      
      let friendlyMessage = error.message;
      let needsEmailConfirmation = false;
      
      // Parse specific error types
      if (error.message.includes('Invalid login credentials')) {
        friendlyMessage = 'Invalid email or password. If you just signed up, please verify your email first.';
        needsEmailConfirmation = true; // Could be unverified email
      } else if (error.message.includes('Email not confirmed')) {
        friendlyMessage = 'Please verify your email before signing in. Check your inbox for the confirmation link.';
        needsEmailConfirmation = true;
      } else if (error.message.includes('Invalid email')) {
        friendlyMessage = 'Please enter a valid email address.';
      } else if (error.message.includes('rate limit') || error.message.includes('too many')) {
        friendlyMessage = 'Too many login attempts. Please wait a moment and try again.';
      } else if (error.message.includes('User not found')) {
        friendlyMessage = 'No account found with this email. Please sign up first.';
      } else if (error.status === 400 || error.message.includes('400')) {
        // Generic 400 error - most commonly unconfirmed email
        friendlyMessage = 'Login failed. If you recently signed up, please check your email and click the verification link first.';
        needsEmailConfirmation = true;
      }
      
      return { 
        data, 
        error: { ...error, message: friendlyMessage },
        needsEmailConfirmation
      };
    }

    console.log('[AuthContext] signIn: Success', { userId: data?.user?.id });
    return { data, error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    console.log('[AuthContext] Starting Google OAuth with redirect to:', `${window.location.origin}/auth/callback`);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false,
        }
      });
      
      console.log('[AuthContext] Google OAuth result:', { data, error });
      
      if (error) {
        console.error('[AuthContext] Google OAuth error:', error);
        return { data, error };
      }
      
      if (data?.url) {
        console.log('[AuthContext] OAuth URL received, redirecting to:', data.url);
        window.location.href = data.url;
      }
      
      return { data, error };
    } catch (err) {
      console.error('[AuthContext] Google OAuth exception:', err);
      return { data: null, error: { message: err.message || 'Failed to start Google Sign In' } };
    }
  }, []);

  const signInWithMagicLink = useCallback(async (email) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    const { data, error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?type=magiclink`
      }
    });

    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setProfile(null);
      setIsPasswordRecovery(false);
      localStorage.removeItem('deadblock_entry_auth_passed');
      clearCachedProfile();
      console.log('[AuthContext] signOut: Cleared user, profile, and cache');
    }
    return { error };
  }, []);

  const resetPassword = useCallback(async (email) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    const { data, error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(), 
      {
        // Redirect to callback with recovery type so we know to open settings
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`
      }
    );

    return { data, error };
  }, []);

  const updateEmail = useCallback(async (newEmail) => {
    if (!supabase || !user) return { error: { message: 'Not authenticated' } };

    const { data, error } = await supabase.auth.updateUser({
      email: newEmail.trim().toLowerCase()
    });

    return { data, error };
  }, [user]);

  const updatePassword = useCallback(async (newPassword) => {
    if (!supabase || !user) return { error: { message: 'Not authenticated' } };

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    // Clear recovery flag after successful password update
    if (!error) {
      setIsPasswordRecovery(false);
      // Clean up URL if it had recovery type
      window.history.replaceState({}, document.title, '/');
    }

    return { data, error };
  }, [user]);

  const updateProfile = useCallback(async (updates) => {
    if (!supabase || !user) return { error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
      saveCachedProfile(user.id, data);
    }

    return { data, error };
  }, [user]);

  const checkUsernameAvailable = useCallback(async (username) => {
    if (!supabase) return { available: false, error: { message: 'Not configured' } };
    
    if (profile?.username?.toLowerCase() === username.toLowerCase()) {
      return { available: true, error: null };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .single();

    if (error?.code === 'PGRST116') {
      return { available: true, error: null };
    }
    
    if (error) {
      return { available: false, error };
    }

    return { available: false, error: null };
  }, [profile?.username]);

  // =====================================================
  // NEW: Resend confirmation email
  // =====================================================
  const resendConfirmationEmail = useCallback(async (email) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    console.log('[AuthContext] Resending confirmation email to', email);
    
    // Use resend method if available, otherwise use magic link
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });

    if (error) {
      console.error('[AuthContext] Resend confirmation error:', error);
      
      // Fallback: try magic link which also confirms email
      const { error: magicError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (magicError) {
        return { data: null, error: magicError };
      }
      
      return { data: { message: 'Confirmation email sent' }, error: null };
    }

    return { data, error };
  }, []);

  const clearOAuthCallback = useCallback(() => {
    setIsOAuthCallback(false);
  }, []);
  
  const clearNewUser = useCallback(() => {
    setIsNewUser(false);
  }, []);

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
    window.history.replaceState({}, document.title, '/');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) {
      return await fetchProfile(user.id);
    }
    return null;
  }, [user, fetchProfile]);

  const contextValue = useMemo(() => ({
    user,
    profile,
    loading,
    sessionReady,
    isAuthenticated: !!user,
    isOnlineEnabled,
    isOAuthCallback,
    isNewUser,
    isPasswordRecovery,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updateEmail,
    updatePassword,
    updateProfile,
    checkUsernameAvailable,
    resendConfirmationEmail,
    refreshProfile,
    clearOAuthCallback,
    clearNewUser,
    clearPasswordRecovery,
  }), [
    user,
    profile,
    loading,
    sessionReady,
    isOnlineEnabled,
    isOAuthCallback,
    isNewUser,
    isPasswordRecovery,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithMagicLink,
    signOut,
    resetPassword,
    updateEmail,
    updatePassword,
    updateProfile,
    checkUsernameAvailable,
    resendConfirmationEmail,
    refreshProfile,
    clearOAuthCallback,
    clearNewUser,
    clearPasswordRecovery,
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
