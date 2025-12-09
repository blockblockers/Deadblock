// Authentication Context
import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../utils/supabase';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  isAuthenticated: false,
  isOnlineEnabled: false,
  signUp: async () => {},
  signIn: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
  updateProfile: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
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

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      isAuthenticated: !!user,
      isOnlineEnabled,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
      updateProfile,
      refreshProfile: () => user && fetchProfile(user.id),
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
