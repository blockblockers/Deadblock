// Authentication Context
import { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
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
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

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
      try {
        // Set a timeout to ensure loading completes even if there's an issue
        const timeout = setTimeout(() => {
          console.log('Auth init: TIMEOUT - forcing loading to complete');
          setLoading(false);
        }, 5000); // 5 second timeout (reduced from 10)

        // First handle any OAuth callback
        console.log('Auth init: Handling OAuth callback (if any)...');
        await handleOAuthCallback();
        console.log('Auth init: OAuth callback handling complete');
        
        // Then get the current session
        console.log('Auth init: Getting current session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        clearTimeout(timeout);
        
        if (error) {
          console.error('Auth init: Error getting session:', error);
          setLoading(false);
          return;
        }
        
        console.log('Auth init: Session result', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          email: session?.user?.email 
        });
        
        setUser(session?.user ?? null);
        console.log('Auth init: User state set, isAuthenticated will be:', !!session?.user);
        
        if (session?.user) {
          console.log('Auth init: Fetching profile for', session.user.id);
          const profileResult = await fetchProfile(session.user.id);
          console.log('Auth init: Profile fetch result', { 
            hasProfile: !!profileResult,
            username: profileResult?.username 
          });
          
          // If profile fetch failed, try once more after a delay
          if (!profileResult) {
            console.log('Auth init: Profile not found, retrying in 500ms...');
            await new Promise(r => setTimeout(r, 500));
            const retryResult = await fetchProfile(session.user.id);
            console.log('Auth init: Retry result', { hasProfile: !!retryResult });
          }
        }
        
        console.log('Auth init: Setting loading to false');
        setLoading(false);
        console.log('=== Auth Init Complete ===');
      } catch (err) {
        console.error('Auth init: Error:', err);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth event:', event, session?.user?.email);
        setUser(session?.user ?? null);
        
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
          console.log('[AuthContext] TOKEN_REFRESHED - fetching profile');
          await fetchProfile(session.user.id);
        } else if (event === 'INITIAL_SESSION' && session?.user) {
          // Initial session restored from storage - always fetch profile
          console.log('[AuthContext] INITIAL_SESSION - fetching profile');
          await fetchProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsOAuthCallback(false);
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

    // Check if username is taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existing) {
      return { error: { message: 'Username already taken' } };
    }

    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { 
          username, 
          display_name: username 
        },
        // Don't require email verification redirect
        emailRedirectTo: undefined
      }
    });

    // If signup succeeded but we got a database error, try to manually create profile
    if (!error && data?.user) {
      // Wait a moment for the trigger to run
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if profile was created
      const { data: profileCheck } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();
      
      // If no profile exists, create it manually
      if (!profileCheck) {
        console.log('Profile not created by trigger, creating manually...');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: username,
            display_name: username
          });
        
        if (profileError) {
          console.error('Failed to create profile manually:', profileError);
        }
      }
      
      // Check if email confirmation is required
      // If session exists, user is auto-confirmed
      const needsEmailConfirmation = !data.session;
      
      // Mark as new user to show welcome modal
      setIsNewUser(true);
      
      return { 
        data, 
        error: null, 
        needsEmailConfirmation,
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
    
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setProfile(null);
      // Clear entry auth flag so user sees auth screen on next visit
      localStorage.removeItem('deadblock_entry_auth_passed');
    }
    return { error };
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
