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
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
    
    setProfile(data);
    return data;
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
          // This extracts the session from the URL hash/params
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session from callback:', error);
          } else if (data?.session) {
            console.log('Session established from OAuth callback');
            setUser(data.session.user);
            await fetchProfile(data.session.user.id);
          }
          
          // Clean up URL after processing
          window.history.replaceState({}, document.title, '/');
        } catch (err) {
          console.error('OAuth callback error:', err);
        }
      }
    };

    // Get initial session
    const initAuth = async () => {
      // First handle any OAuth callback
      await handleOAuthCallback();
      
      // Then get the current session
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setLoading(false);
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

    // Check if username is taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();

    if (existing) {
      return { error: { message: 'Username already taken' } };
    }

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
      refreshProfile: () => user && fetchProfile(user.id),
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
