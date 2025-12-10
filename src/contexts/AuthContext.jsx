// Authentication Context
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  isAuthenticated: false,
  isOnlineEnabled: false,
  isOAuthCallback: false,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
  clearOAuthCallback: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOAuthCallback, setIsOAuthCallback] = useState(false);

  const isOnlineEnabled = isSupabaseConfigured();

  const fetchProfile = useCallback(async (userId) => {
    if (!supabase) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        // Try to create profile if it doesn't exist
        if (error.code === 'PGRST116') {
          console.log('Profile not found, may need to create one');
        }
        return null;
      }
      
      setProfile(data);
      return data;
    } catch (err) {
      console.error('Profile fetch exception:', err);
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
        try {
          // Set a timeout for OAuth processing
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('OAuth timeout')), 8000)
          );
          
          // This extracts the session from the URL hash/params
          const sessionPromise = supabase.auth.getSession();
          
          const { data, error } = await Promise.race([sessionPromise, timeoutPromise.then(() => ({ data: null, error: { message: 'Timeout' } }))]);
          
          if (error) {
            console.error('Error getting session from callback:', error);
            setIsOAuthCallback(false); // Clear flag on error
          } else if (data?.session) {
            console.log('Session established from OAuth callback');
            setUser(data.session.user);
            await fetchProfile(data.session.user.id);
          } else {
            console.log('No session in OAuth callback response');
            setIsOAuthCallback(false);
          }
          
          // Clean up URL after processing
          window.history.replaceState({}, document.title, '/');
        } catch (err) {
          console.error('OAuth callback error:', err);
          setIsOAuthCallback(false); // Clear flag on error
          window.history.replaceState({}, document.title, '/');
        }
      }
    };

    // Get initial session
    const initAuth = async () => {
      try {
        // Set a timeout to ensure loading completes even if there's an issue
        const timeout = setTimeout(() => {
          console.log('Auth initialization timeout - forcing loading to complete');
          setLoading(false);
        }, 5000); // 5 second timeout (reduced from 10)

        // First handle any OAuth callback
        await handleOAuthCallback();
        
        // Then get the current session
        console.log('Auth init: Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        clearTimeout(timeout);
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        console.log('Auth init: Session result', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          email: session?.user?.email 
        });
        
        setUser(session?.user ?? null);
        
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
        
        setLoading(false);
      } catch (err) {
        console.error('Auth initialization error:', err);
        setLoading(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event, session?.user?.email);
        setUser(session?.user ?? null);
        
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchProfile(session.user.id);
          // Don't set isOAuthCallback to false here - let App.jsx handle it after redirect
          
          // Clean up URL - always redirect to root after sign in
          const currentPath = window.location.pathname;
          if (currentPath.includes('/auth/callback') || window.location.hash || window.location.search) {
            window.history.replaceState({}, document.title, '/');
          }
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
        }
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
          // Don't return error - user is created, profile will sync eventually
        }
      }
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

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });

    return { data, error };
  };

  const signOut = async () => {
    if (!supabase) return;
    
    const { error } = await supabase.auth.signOut();
    if (!error) {
      setUser(null);
      setProfile(null);
    }
    return { error };
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

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isAuthenticated: !!user,
      isOnlineEnabled,
      isOAuthCallback,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile,
      checkUsernameAvailable,
      refreshProfile: async () => {
        if (user) {
          return await fetchProfile(user.id);
        }
        return null;
      },
      clearOAuthCallback,
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
