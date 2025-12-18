// Authentication Context with Local Profile Caching
import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

// Local storage keys for persistent auth
const STORAGE_KEYS = {
  CACHED_USER_ID: 'deadblock_cached_user_id',
  CACHED_PROFILE: 'deadblock_cached_profile',
  CACHED_TIMESTAMP: 'deadblock_cached_timestamp',
};

// Cache expiry time (7 days in milliseconds) - profile will still work but will be refreshed
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Helper to safely get from localStorage
const safeGetStorage = (key) => {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    console.warn('[AuthContext] localStorage read error:', e);
    return null;
  }
};

// Helper to safely set localStorage
const safeSetStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('[AuthContext] localStorage write error:', e);
  }
};

// Helper to safely remove from localStorage
const safeRemoveStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('[AuthContext] localStorage remove error:', e);
  }
};

// Load cached profile from localStorage
const loadCachedProfile = () => {
  try {
    const cachedUserId = safeGetStorage(STORAGE_KEYS.CACHED_USER_ID);
    const cachedProfileStr = safeGetStorage(STORAGE_KEYS.CACHED_PROFILE);
    const cachedTimestamp = safeGetStorage(STORAGE_KEYS.CACHED_TIMESTAMP);
    
    if (!cachedUserId || !cachedProfileStr) {
      return null;
    }
    
    const profile = JSON.parse(cachedProfileStr);
    const timestamp = parseInt(cachedTimestamp, 10) || 0;
    const age = Date.now() - timestamp;
    
    console.log('[AuthContext] Loaded cached profile:', { 
      username: profile?.username, 
      userId: cachedUserId,
      ageMinutes: Math.round(age / 60000)
    });
    
    return { userId: cachedUserId, profile, isExpired: age > CACHE_EXPIRY_MS };
  } catch (e) {
    console.warn('[AuthContext] Error loading cached profile:', e);
    return null;
  }
};

// Save profile to localStorage cache
const saveCachedProfile = (userId, profile) => {
  try {
    if (!userId || !profile) return;
    
    safeSetStorage(STORAGE_KEYS.CACHED_USER_ID, userId);
    safeSetStorage(STORAGE_KEYS.CACHED_PROFILE, JSON.stringify(profile));
    safeSetStorage(STORAGE_KEYS.CACHED_TIMESTAMP, Date.now().toString());
    
    console.log('[AuthContext] Saved profile to cache:', { username: profile.username });
  } catch (e) {
    console.warn('[AuthContext] Error saving profile to cache:', e);
  }
};

// Clear cached profile (on sign out)
const clearCachedProfile = () => {
  safeRemoveStorage(STORAGE_KEYS.CACHED_USER_ID);
  safeRemoveStorage(STORAGE_KEYS.CACHED_PROFILE);
  safeRemoveStorage(STORAGE_KEYS.CACHED_TIMESTAMP);
  console.log('[AuthContext] Cleared cached profile');
};

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  sessionReady: false,
  isAuthenticated: false,
  isOnlineEnabled: false,
  isOAuthCallback: false,
  isNewUser: false,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  clearOAuthCallback: () => {},
  clearNewUser: () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }) => {
  // Load cached data immediately for instant display
  const cachedData = loadCachedProfile();
  
  const [user, setUser] = useState(null);
  // Start with cached profile if available - instant load!
  const [profile, setProfile] = useState(cachedData?.profile || null);
  // If we have cached data, don't show loading state for UI
  const [loading, setLoading] = useState(!cachedData?.profile);
  // Session ready tracks if we've verified the Supabase session (separate from UI loading)
  const [sessionReady, setSessionReady] = useState(false);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  
  // Track if we've done the initial server fetch
  const initialFetchDone = useRef(false);

  const isOnlineEnabled = isSupabaseConfigured();

  const fetchProfile = useCallback(async (userId, retryCount = 0) => {
    if (!supabase) {
      console.log('[AuthContext] fetchProfile: supabase not configured');
      return null;
    }
    
    if (!userId) {
      console.log('[AuthContext] fetchProfile: no userId provided');
      return null;
    }
    
    const maxRetries = 3;
    console.log(`[AuthContext] fetchProfile: fetching for ${userId}, attempt ${retryCount + 1}`);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('[AuthContext] fetchProfile error:', error);
        // Try to create profile if it doesn't exist
        if (error.code === 'PGRST116') {
          console.log('[AuthContext] Profile not found, may need to create one');
          // Retry a few times in case of race condition
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
      
      // Cache the profile for instant loading next time
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

    // Check if this is an OAuth callback - must have actual token data, not just the path
    const url = window.location.href;
    const hash = window.location.hash;
    const search = window.location.search;
    
    // Only treat as OAuth callback if there's actual auth data
    const hasAccessToken = hash.includes('access_token=') || search.includes('access_token=');
    const hasCode = search.includes('code=');
    const hasAuthData = hasAccessToken || hasCode;
    
    // Clean up empty callback URLs (leftover from previous OAuth)
    if (url.includes('/auth/callback') && !hasAuthData) {
      console.log('Cleaning up empty OAuth callback URL');
      window.history.replaceState({}, document.title, '/');
    }
    
    if (hasAuthData) {
      console.log('OAuth callback detected with auth data, processing...');
      setIsOAuthCallback(true);
    }

    // Handle OAuth callback - extract session from URL
    const handleOAuthCallback = async () => {
      if (hasAuthData) {
        console.log('=== OAuth Callback Processing Started ===');
        try {
          // Set a timeout for OAuth processing
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OAuth timeout')), 8000)
          );
          
          // This extracts the session from the URL hash/params
          console.log('OAuth: Getting session from Supabase...');
          const sessionPromise = supabase.auth.getSession();
          
          const { data, error } = await Promise.race([sessionPromise, timeoutPromise.then(() => ({ data: null, error: { message: 'Timeout' } }))]);
          
          console.log('OAuth: Session response:', { 
            hasData: !!data, 
            hasSession: !!data?.session,
            hasUser: !!data?.session?.user,
            error: error?.message 
          });
          
          if (error) {
            console.error('OAuth: Error getting session:', error);
            setIsOAuthCallback(false); // Clear flag on error only
          } else if (data?.session) {
            console.log('OAuth: Session established successfully', {
              userId: data.session.user?.id,
              email: data.session.user?.email
            });
            setUser(data.session.user);
            
            // Try to fetch profile, but don't block on it
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
              // Don't fail the OAuth - profile will be retried later
            }
            
            // DON'T clear isOAuthCallback here - let App.jsx handle it after redirect
            console.log('OAuth: Callback processed successfully, waiting for App.jsx to handle redirect');
          } else {
            console.log('OAuth: No session in response');
            setIsOAuthCallback(false); // Clear flag when no session
          }
          
          // Clean up URL after processing
          console.log('OAuth: Cleaning up URL');
          window.history.replaceState({}, document.title, '/');
        } catch (err) {
          console.error('OAuth: Callback error:', err);
          setIsOAuthCallback(false); // Clear flag on error
          window.history.replaceState({}, document.title, '/');
        }
        console.log('=== OAuth Callback Processing Finished ===');
      }
    };

    // Get initial session
    const initAuth = async () => {
      console.log('=== Auth Init Started ===');
      
      // Check if we have cached profile data for instant loading
      const cached = loadCachedProfile();
      if (cached?.profile && !initialFetchDone.current) {
        console.log('Auth init: Using cached profile for instant display:', cached.profile.username);
        setProfile(cached.profile);
        // Don't show loading if we have cached data
        setLoading(false);
      }
      
      let timeoutCleared = false;
      
      // Shorter timeout since we have cached data as fallback
      const timeout = setTimeout(() => {
        if (!timeoutCleared) {
          console.log('Auth init: TIMEOUT - completing with current state');
          setSessionReady(true); // Mark as ready even on timeout
          setLoading(false);
        }
      }, cached?.profile ? 3000 : 8000); // 3s if cached, 8s if not
      
      const clearTimeoutSafe = () => {
        timeoutCleared = true;
        clearTimeout(timeout);
      };
      
      try {
        // First handle any OAuth callback
        console.log('Auth init: Handling OAuth callback (if any)...');
        await handleOAuthCallback();
        console.log('Auth init: OAuth callback handling complete');
        
        // Then get the current session
        console.log('Auth init: Getting current session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth init: Error getting session:', error);
          clearTimeoutSafe();
          setSessionReady(true); // Mark session check as complete even on error
          setLoading(false);
          return;
        }
        
        console.log('Auth init: Session result', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          email: session?.user?.email 
        });
        
        setUser(session?.user ?? null);
        setSessionReady(true); // Session has been verified with Supabase
        console.log('Auth init: User state set, isAuthenticated will be:', !!session?.user, ', sessionReady: true');
        
        // Validate cached data matches current session
        if (cached?.profile && session?.user) {
          if (cached.userId !== session.user.id) {
            console.log('Auth init: Cached profile is for different user, clearing');
            clearCachedProfile();
            setProfile(null);
          }
        }
        
        // If no session, clear any cached data
        if (!session?.user) {
          if (cached?.profile) {
            console.log('Auth init: No session but have cached profile, clearing');
            clearCachedProfile();
            setProfile(null);
          }
          clearTimeoutSafe();
          setSessionReady(true); // Mark session check as complete
          setLoading(false);
          return;
        }
        
        // Fetch fresh profile from server (in background if we have cache)
        console.log('Auth init: Fetching fresh profile for', session.user.id);
        initialFetchDone.current = true;
        
        const profileResult = await fetchProfile(session.user.id);
        console.log('Auth init: Profile fetch result', { 
          hasProfile: !!profileResult,
          username: profileResult?.username 
        });
        
        // Only retry if we don't have cached data and server fetch failed
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
        
        // Set sessionReady when we have a valid session from any auth event
        if (session?.user) {
          console.log('[AuthContext] Setting sessionReady=true from', event);
          setSessionReady(true);
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('[AuthContext] SIGNED_IN - fetching profile');
          await fetchProfile(session.user.id);
          // Don't set isOAuthCallback to false here - let App.jsx handle it after redirect
          
          // Clean up URL - always redirect to root after sign in
          const currentPath = window.location.pathname;
          if (currentPath.includes('/auth/callback') || window.location.hash || window.location.search) {
            window.history.replaceState({}, document.title, '/');
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token was refreshed (e.g., on app reopen) - always fetch profile to ensure it's loaded
          console.log('[AuthContext] TOKEN_REFRESHED - fetching profile for', session.user.id);
          const result = await fetchProfile(session.user.id);
          console.log('[AuthContext] TOKEN_REFRESHED - profile fetch result:', { 
            hasProfile: !!result, 
            username: result?.username 
          });
          
          // If profile fetch failed, retry a few times
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
          // Initial session restored from storage - always fetch profile
          console.log('[AuthContext] INITIAL_SESSION - fetching profile for', session.user.id);
          const result = await fetchProfile(session.user.id);
          console.log('[AuthContext] INITIAL_SESSION - profile fetch result:', { 
            hasProfile: !!result, 
            username: result?.username 
          });
          
          // If profile fetch failed, retry
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
          // No session - user is not logged in
          console.log('[AuthContext] INITIAL_SESSION - no session, user not logged in');
          setSessionReady(true);
          // Clear any stale cached profile
          if (loadCachedProfile()?.profile) {
            console.log('[AuthContext] Clearing stale cached profile');
            clearCachedProfile();
            setProfile(null);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsOAuthCallback(false);
          // Keep sessionReady true - we know the session state (logged out)
          setSessionReady(true);
          // Clear cached profile on sign out
          clearCachedProfile();
          console.log('[AuthContext] SIGNED_OUT - cleared profile and cache');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signUp = async (email, password, username) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    // Validate username format
    if (!username || username.length < 3 || username.length > 20) {
      return { error: { message: 'Username must be 3-20 characters' } };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return { error: { message: 'Username can only contain letters, numbers, and underscores' } };
    }

    // Check if username is taken - use maybeSingle to avoid 406 error
    const { data: existing, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[AuthContext] Username check error:', checkError);
    }

    if (existing) {
      return { error: { message: 'Username already taken' } };
    }

    console.log('[AuthContext] Creating account for:', email, 'username:', username);

    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          username: username.toLowerCase(), 
          display_name: username 
        },
        // Don't require email verification redirect
        emailRedirectTo: undefined
      }
    });

    console.log('[AuthContext] Signup response:', { 
      hasUser: !!data?.user, 
      hasSession: !!data?.session,
      userId: data?.user?.id,
      error: error?.message 
    });

    // If signup succeeded
    if (!error && data?.user) {
      // Wait a moment for the database trigger to run
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Check if profile was created by trigger - use maybeSingle to avoid 406
      const { data: profileCheck, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('id', data.user.id)
        .maybeSingle();
      
      console.log('[AuthContext] Profile check:', { 
        hasProfile: !!profileCheck, 
        username: profileCheck?.username,
        error: profileCheckError?.message 
      });
      
      // If no profile exists, create it manually
      if (!profileCheck) {
        console.log('[AuthContext] Profile not created by trigger, creating manually...');
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: data.user.id,
            username: username.toLowerCase(),
            display_name: username
          }, { onConflict: 'id' });
        
        if (profileError) {
          console.error('[AuthContext] Failed to create profile:', profileError);
        } else {
          console.log('[AuthContext] Profile created manually');
        }
      }
      
      // Check if we got a session (means email confirmation is disabled)
      if (data.session) {
        console.log('[AuthContext] Session received - user is logged in');
        setUser(data.user);
        await fetchProfile(data.user.id);
        setIsNewUser(true);
        
        return { 
          data, 
          error: null, 
          needsEmailConfirmation: false,
          isNewUser: true
        };
      }
      
      // No session - email confirmation might still be enabled in Supabase
      // Try to sign them in directly (works if email confirmation is disabled)
      console.log('[AuthContext] No session after signup, attempting direct sign-in...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        console.log('[AuthContext] Auto sign-in failed:', signInError.message);
        // Email confirmation is likely still enabled in Supabase
        if (signInError.message.includes('Email not confirmed')) {
          return { 
            data, 
            error: null, 
            needsEmailConfirmation: true,
            isNewUser: true
          };
        }
        // Other error - account created but can't sign in
        return { 
          data, 
          error: null, 
          needsEmailConfirmation: false,
          isNewUser: true,
          message: 'Account created! Please sign in with your credentials.'
        };
      }
      
      // Successfully signed in after signup
      console.log('[AuthContext] Auto sign-in successful');
      setUser(signInData.user);
      await fetchProfile(signInData.user.id);
      setIsNewUser(true);
      
      return { 
        data: signInData, 
        error: null, 
        needsEmailConfirmation: false,
        isNewUser: true
      };
    }

    // Handle specific error messages
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
  };

  const signIn = async (email, password) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    return { data, error };
  };

  const signInWithGoogle = async () => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    console.log('[AuthContext] Starting Google OAuth with redirect to:', `${window.location.origin}/auth/callback`);
    
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          skipBrowserRedirect: false, // Ensure redirect happens
        }
      });
      
      console.log('[AuthContext] Google OAuth result:', { data, error });
      
      if (error) {
        console.error('[AuthContext] Google OAuth error:', error);
        return { data, error };
      }
      
      // If we get here without redirect, there might be an issue
      // The browser should be redirecting, so wait a moment
      if (data?.url) {
        console.log('[AuthContext] OAuth URL received, redirecting to:', data.url);
        // Manually redirect if the auto-redirect didn't work
        window.location.href = data.url;
      }
      
      return { data, error };
    } catch (err) {
      console.error('[AuthContext] Google OAuth exception:', err);
      return { data: null, error: { message: err.message || 'Failed to start Google Sign In' } };
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    
    console.log('[AuthContext] signOut: Starting sign out...');
    
    try {
      // Add timeout to prevent hanging
      const signOutPromise = supabase.auth.signOut();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sign out timeout')), 5000)
      );
      
      const { error } = await Promise.race([signOutPromise, timeoutPromise])
        .catch(err => {
          console.warn('[AuthContext] signOut: Timeout or error, forcing local cleanup:', err.message);
          return { error: null }; // Continue with local cleanup even on timeout
        });
      
      // Always clear local state regardless of server response
      setUser(null);
      setProfile(null);
      setSessionReady(false);
      
      // Clear entry auth flag so user sees auth screen on next visit
      localStorage.removeItem('deadblock_entry_auth_passed');
      
      // Clear cached profile
      clearCachedProfile();
      
      console.log('[AuthContext] signOut: Cleared user, profile, and cache');
      
      return { error };
    } catch (err) {
      console.error('[AuthContext] signOut: Exception:', err);
      
      // Force cleanup on any error
      setUser(null);
      setProfile(null);
      setSessionReady(false);
      localStorage.removeItem('deadblock_entry_auth_passed');
      clearCachedProfile();
      
      console.log('[AuthContext] signOut: Forced cleanup after error');
      return { error: err };
    }
  };

  // Send password reset email
  const resetPassword = async (email) => {
    if (!supabase) return { error: { message: 'Online features not configured' } };

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`
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

  // Update user email (requires re-authentication)
  const updateEmail = async (newEmail) => {
    if (!supabase || !user) return { error: { message: 'Not authenticated' } };

    const { data, error } = await supabase.auth.updateUser({
      email: newEmail
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

  const updateProfile = async (updates) => {
    if (!supabase || !user) return { error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
      // Update cache with new profile data
      saveCachedProfile(user.id, data);
    }

    return { data, error };
  };

  // Check if username is available
  const checkUsernameAvailable = async (username) => {
    if (!supabase) return { available: false, error: { message: 'Not configured' } };
    
    // Don't check if it's the current user's username
    if (profile?.username?.toLowerCase() === username.toLowerCase()) {
      return { available: true, error: null };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .single();

    // If no data found (PGRST116 = no rows), username is available
    if (error?.code === 'PGRST116') {
      return { available: true, error: null };
    }
    
    if (error) {
      return { available: false, error };
    }

    // Data found = username taken
    return { available: false, error: null };
  };

  const clearOAuthCallback = () => {
    setIsOAuthCallback(false);
  };
  
  const clearNewUser = () => {
    setIsNewUser(false);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      sessionReady,
      isAuthenticated: !!user,
      isOnlineEnabled,
      isOAuthCallback,
      isNewUser,
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
      refreshProfile: async () => {
        if (user) {
          return await fetchProfile(user.id);
        }
        return null;
      },
      clearOAuthCallback,
      clearNewUser,
    }}>
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
