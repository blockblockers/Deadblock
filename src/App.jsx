// App.jsx - ATLASassist v2.1 - COMPREHENSIVE ROUTE FIX
// FIXED: All missing routes that were causing apps to redirect to hub
// FIXED: Full auth implementation for EntryAuthScreen compatibility

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext, lazy, Suspense } from 'react';

// ============================================
// EAGER IMPORTS - Only what's needed immediately
// ============================================
import EntryAuthScreen from './pages/EntryAuthScreen';
import { ToastProvider } from './components/ThemedToast';
import { supabase, isSupabaseConfigured } from './services/supabase';
import { initNotifications } from './services/notifications';

// ============================================
// LAZY IMPORTS - Loaded on demand
// ============================================

// Main Hub (loaded after login)
const AppHub = lazy(() => import('./pages/AppHub'));
const Settings = lazy(() => import('./pages/Settings'));

// Core Features
const VisualSchedule = lazy(() => import('./pages/VisualSchedule'));
const PointToTalk = lazy(() => import('./pages/PointToTalk'));

// Tools Hub
const Tools = lazy(() => import('./pages/Tools'));
const VisualTimer = lazy(() => import('./pages/VisualTimer'));
const FirstThen = lazy(() => import('./pages/FirstThen'));
const Counter = lazy(() => import('./pages/Counter'));
const SoundBoard = lazy(() => import('./pages/SoundBoard'));
const DailyRoutines = lazy(() => import('./pages/DailyRoutines'));
const MilestoneGuide = lazy(() => import('./pages/MilestoneGuide'));

// Emotional Wellness Hub
const EmotionalWellnessHub = lazy(() => import('./pages/EmotionalWellnessHub'));
const CalmDown = lazy(() => import('./pages/CalmDown'));
const SensoryBreaks = lazy(() => import('./pages/SensoryBreaks'));
const FeelingsTracker = lazy(() => import('./pages/FeelingsTracker'));
const EmotionChart = lazy(() => import('./pages/EmotionChart'));
const CopingSkillsChart = lazy(() => import('./pages/CopingSkillsChart'));
const CirclesOfControl = lazy(() => import('./pages/CirclesOfControl'));
const GrowthMindset = lazy(() => import('./pages/GrowthMindset'));
const BodyCheckIn = lazy(() => import('./pages/BodyCheckIn'));

// Care Team / Services Hub
const Services = lazy(() => import('./pages/Services'));
const AppointmentTracker = lazy(() => import('./pages/AppointmentTracker'));
const GoalTracker = lazy(() => import('./pages/GoalTracker'));
const MyTeam = lazy(() => import('./pages/MyTeam'));
const QuickNotes = lazy(() => import('./pages/QuickNotes'));
const Reminders = lazy(() => import('./pages/Reminders'));

// Health Hub
const Health = lazy(() => import('./pages/Health'));
const Nutrition = lazy(() => import('./pages/Nutrition'));
const WaterTracker = lazy(() => import('./pages/WaterTracker'));
const SleepTracker = lazy(() => import('./pages/SleepTracker'));
const MoveExercise = lazy(() => import('./pages/MoveExercise'));
const OTExercises = lazy(() => import('./pages/OTExercises'));
const HealthyChoices = lazy(() => import('./pages/HealthyChoices'));

// Games Hub - ALL GAMES
const Games = lazy(() => import('./pages/Games'));
const MatchingGame = lazy(() => import('./pages/MatchingGame'));
const EmotionMatch = lazy(() => import('./pages/EmotionMatch'));
const BubblePop = lazy(() => import('./pages/BubblePop'));
const ColorSort = lazy(() => import('./pages/ColorSort'));
const ShapeMatch = lazy(() => import('./pages/ShapeMatch'));
const SimplePuzzles = lazy(() => import('./pages/SimplePuzzles'));
const PatternSequence = lazy(() => import('./pages/PatternSequence'));
const SoundMatch = lazy(() => import('./pages/SoundMatch'));

// Activities Hub
const Activities = lazy(() => import('./pages/Activities'));
const SocialStories = lazy(() => import('./pages/SocialStories'));
const ColoringBook = lazy(() => import('./pages/ColoringBook'));
const PronunciationPractice = lazy(() => import('./pages/PronunciationPractice'));
const ChoiceBoard = lazy(() => import('./pages/ChoiceBoard'));
const MusicSounds = lazy(() => import('./pages/MusicSounds'));
const PhotoJournal = lazy(() => import('./pages/PhotoJournal'));
const RewardChart = lazy(() => import('./pages/RewardChart'));

// Planning Hub
const PlanningHub = lazy(() => import('./pages/PlanningHub'));
const StudentProfile = lazy(() => import('./pages/StudentProfile'));
const FileOfLife = lazy(() => import('./pages/FileOfLife'));
const PersonCenteredPlan = lazy(() => import('./pages/PersonCenteredPlan'));
const MemorandumOfIntent = lazy(() => import('./pages/MemorandumOfIntent'));

// Resources Hub
const ResourcesHub = lazy(() => import('./pages/ResourcesHub'));
const PrintablesLibrary = lazy(() => import('./pages/PrintablesLibrary'));
const ResearchHub = lazy(() => import('./pages/ResearchHub'));
const RecommendedProducts = lazy(() => import('./pages/RecommendedProducts'));
const Knowledge = lazy(() => import('./pages/Knowledge'));
const TherapyTypes = lazy(() => import('./pages/TherapyTypes'));
const Definitions = lazy(() => import('./pages/Definitions'));
const FAQ = lazy(() => import('./pages/FAQ'));

// Community
const Community = lazy(() => import('./pages/Community'));
const CommunityProfileSetup = lazy(() => import('./pages/CommunityProfileSetup'));
const CommunityNewThread = lazy(() => import('./pages/CommunityNewThread'));
const CommunityThread = lazy(() => import('./pages/CommunityThread'));

// ============================================
// LOADING FALLBACK COMPONENT
// ============================================
const PageLoader = () => (
  <div className="min-h-screen bg-[#FFFEF5] flex items-center justify-center">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="absolute inset-0 border-4 border-[#4A9FD4]/20 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-transparent border-t-[#4A9FD4] rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">✨</span>
        </div>
      </div>
      <p className="font-crayon text-gray-500 text-sm">Loading...</p>
    </div>
  </div>
);

// ============================================
// AUTH CONTEXT
// ============================================
export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Format Supabase user to app user format
const formatSupabaseUser = (supabaseUser) => {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    displayName: supabaseUser.user_metadata?.full_name || 
                 supabaseUser.user_metadata?.name || 
                 supabaseUser.email?.split('@')[0] || 
                 'Friend',
    photoURL: supabaseUser.user_metadata?.avatar_url || null,
    provider: supabaseUser.app_metadata?.provider || 'email',
  };
};

// ============================================
// AUTH PROVIDER COMPONENT
// ============================================
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('checking');

  useEffect(() => {
    const initAuth = async () => {
      if (isSupabaseConfigured()) {
        setAuthMode('supabase');
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            setUser(formatSupabaseUser(session.user));
          }
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('Auth event:', event);
              if (session?.user) {
                setUser(formatSupabaseUser(session.user));
                
                if (event === 'SIGNED_IN') {
                  setTimeout(() => {
                    initNotifications().catch(console.error);
                  }, 2000);
                }
              } else {
                setUser(null);
              }
            }
          );
          
          setLoading(false);
          return () => subscription.unsubscribe();
        } catch (error) {
          console.error('Auth init error:', error);
          setLoading(false);
        }
      } else {
        setAuthMode('guest');
        const savedGuest = localStorage.getItem('snw_guest_user');
        if (savedGuest) {
          try {
            setUser(JSON.parse(savedGuest));
          } catch (e) {
            console.error('Error parsing guest user:', e);
          }
        }
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Sign in with email/password
  const signIn = async (email, password) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured. Use guest mode.' } };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sign-in error:', error);
      return { error: { message: error.message || 'Failed to sign in' } };
    }
  };

  // Sign up with email/password
  const signUp = async (email, password, displayName) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured. Use guest mode.' } };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName,
            name: displayName,
          },
        },
      });

      if (error) throw error;

      if (data?.user && !data?.session) {
        return {
          data,
          error: null,
          requiresConfirmation: true,
        };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Sign-up error:', error);
      let message = error.message;
      if (message.includes('already registered')) {
        message = 'This email is already registered. Try signing in instead.';
      }
      return { error: { message } };
    }
  };

  // Sign in with Google
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured.' } };
    }

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/hub`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Google sign-in error:', error);
      return { error: { message: error.message || 'Failed to sign in with Google' } };
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    if (!isSupabaseConfigured()) {
      return { error: { message: 'Supabase not configured.' } };
    }

    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Password reset error:', error);
      return { error: { message: error.message } };
    }
  };

  // Sign in as guest
  const signInAsGuest = (name = 'Friend') => {
    const guestUser = {
      id: `guest_${Date.now()}`,
      email: null,
      displayName: name,
      photoURL: null,
      provider: 'guest',
      isGuest: true,
    };
    localStorage.setItem('snw_guest_user', JSON.stringify(guestUser));
    setUser(guestUser);
    return { data: guestUser, error: null };
  };

  // Sign out
  const signOut = async () => {
    if (authMode === 'supabase' && isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error('Sign out error:', error);
      }
    }
    localStorage.removeItem('snw_guest_user');
    setUser(null);
  };

  const value = {
    user,
    loading,
    authMode,
    signIn,
    signUp,
    signInWithGoogle,
    signInAsGuest,
    signOut,
    resetPassword,
    isAuthenticated: !!user,
    isGuest: user?.isGuest || user?.provider === 'guest',
    isSupabaseConfigured: isSupabaseConfigured(),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
};

// ============================================
// RESET PASSWORD PAGE
// ============================================
const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#FFFEF5] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="font-display text-2xl text-[#5CB85C] mb-4">Password Updated!</h1>
          <p className="font-crayon text-gray-600 mb-6">
            Your password has been successfully reset.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-[#8E6BBF] text-white rounded-xl font-crayon hover:bg-[#7B5AA6] transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFEF5] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-lg max-w-md w-full">
        <h1 className="font-display text-2xl text-[#8E6BBF] mb-6 text-center">
          Set New Password
        </h1>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700 font-crayon text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-crayon focus:border-[#8E6BBF] focus:outline-none"
            required
            minLength={6}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl font-crayon focus:border-[#8E6BBF] focus:outline-none"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#8E6BBF] text-white rounded-xl font-crayon hover:bg-[#7B5AA6] disabled:opacity-50 transition-colors"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

// ============================================
// MAIN APP COMPONENT
// ============================================
function App() {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<EntryAuthScreen />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Main Hub */}
            <Route path="/hub" element={<ProtectedRoute><AppHub /></ProtectedRoute>} />

            {/* Settings */}
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

            {/* Core Features */}
            <Route path="/visual-schedule" element={<ProtectedRoute><VisualSchedule /></ProtectedRoute>} />
            <Route path="/point-to-talk" element={<ProtectedRoute><PointToTalk /></ProtectedRoute>} />

            {/* ============================================ */}
            {/* TOOLS HUB */}
            {/* ============================================ */}
            <Route path="/tools" element={<ProtectedRoute><Tools /></ProtectedRoute>} />
            <Route path="/tools/timer" element={<ProtectedRoute><VisualTimer /></ProtectedRoute>} />
            <Route path="/tools/first-then" element={<ProtectedRoute><FirstThen /></ProtectedRoute>} />
            <Route path="/tools/counter" element={<ProtectedRoute><Counter /></ProtectedRoute>} />
            <Route path="/tools/soundboard" element={<ProtectedRoute><SoundBoard /></ProtectedRoute>} />
            <Route path="/tools/daily-routines" element={<ProtectedRoute><DailyRoutines /></ProtectedRoute>} />
            <Route path="/tools/milestones" element={<ProtectedRoute><MilestoneGuide /></ProtectedRoute>} />

            {/* ============================================ */}
            {/* EMOTIONAL WELLNESS HUB */}
            {/* ============================================ */}
            <Route path="/wellness" element={<ProtectedRoute><EmotionalWellnessHub /></ProtectedRoute>} />
            <Route path="/wellness/calm-down" element={<ProtectedRoute><CalmDown /></ProtectedRoute>} />
            <Route path="/wellness/feelings" element={<ProtectedRoute><FeelingsTracker /></ProtectedRoute>} />
            <Route path="/wellness/emotion-chart" element={<ProtectedRoute><EmotionChart /></ProtectedRoute>} />
            <Route path="/wellness/coping-skills" element={<ProtectedRoute><CopingSkillsChart /></ProtectedRoute>} />
            <Route path="/wellness/sensory-breaks" element={<ProtectedRoute><SensoryBreaks /></ProtectedRoute>} />
            <Route path="/wellness/circles-control" element={<ProtectedRoute><CirclesOfControl /></ProtectedRoute>} />
            <Route path="/wellness/growth-mindset" element={<ProtectedRoute><GrowthMindset /></ProtectedRoute>} />
            <Route path="/wellness/body-check-in" element={<ProtectedRoute><BodyCheckIn /></ProtectedRoute>} />
            
            {/* Legacy routes redirect */}
            <Route path="/emotional-wellness" element={<Navigate to="/wellness" replace />} />
            <Route path="/emotional-wellness/*" element={<Navigate to="/wellness" replace />} />

            {/* ============================================ */}
            {/* CARE TEAM / SERVICES HUB */}
            {/* ============================================ */}
            <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
            <Route path="/services/appointments" element={<ProtectedRoute><AppointmentTracker /></ProtectedRoute>} />
            <Route path="/services/goals" element={<ProtectedRoute><GoalTracker /></ProtectedRoute>} />
            <Route path="/services/my-team" element={<ProtectedRoute><MyTeam /></ProtectedRoute>} />
            <Route path="/services/notes" element={<ProtectedRoute><QuickNotes /></ProtectedRoute>} />
            <Route path="/services/reminders" element={<ProtectedRoute><Reminders /></ProtectedRoute>} />
            <Route path="/services/routines" element={<ProtectedRoute><DailyRoutines /></ProtectedRoute>} />
            
            {/* Legacy care-team redirect */}
            <Route path="/care-team" element={<Navigate to="/services" replace />} />

            {/* ============================================ */}
            {/* HEALTH HUB */}
            {/* ============================================ */}
            <Route path="/health" element={<ProtectedRoute><Health /></ProtectedRoute>} />
            <Route path="/health/nutrition" element={<ProtectedRoute><Nutrition /></ProtectedRoute>} />
            <Route path="/health/feelings" element={<ProtectedRoute><FeelingsTracker /></ProtectedRoute>} />
            <Route path="/health/water" element={<ProtectedRoute><WaterTracker /></ProtectedRoute>} />
            <Route path="/health/sleep" element={<ProtectedRoute><SleepTracker /></ProtectedRoute>} />
            <Route path="/health/exercise" element={<ProtectedRoute><MoveExercise /></ProtectedRoute>} />
            <Route path="/health/ot-exercises" element={<ProtectedRoute><OTExercises /></ProtectedRoute>} />
            <Route path="/health/healthy-choices" element={<ProtectedRoute><HealthyChoices /></ProtectedRoute>} />

            {/* ============================================ */}
            {/* GAMES HUB - ALL ROUTES FIXED */}
            {/* ============================================ */}
            <Route path="/games" element={<ProtectedRoute><Games /></ProtectedRoute>} />
            <Route path="/games/matching" element={<ProtectedRoute><MatchingGame /></ProtectedRoute>} />
            <Route path="/games/memory" element={<ProtectedRoute><MatchingGame /></ProtectedRoute>} />
            <Route path="/games/emotion-match" element={<ProtectedRoute><EmotionMatch /></ProtectedRoute>} />
            <Route path="/games/emotions" element={<ProtectedRoute><EmotionMatch /></ProtectedRoute>} />
            <Route path="/activities/emotion-match" element={<ProtectedRoute><EmotionMatch /></ProtectedRoute>} />
            <Route path="/games/bubble-pop" element={<ProtectedRoute><BubblePop /></ProtectedRoute>} />
            <Route path="/games/bubbles" element={<ProtectedRoute><BubblePop /></ProtectedRoute>} />
            <Route path="/games/color-sort" element={<ProtectedRoute><ColorSort /></ProtectedRoute>} />
            <Route path="/games/sorting" element={<ProtectedRoute><ColorSort /></ProtectedRoute>} />
            <Route path="/games/shape-match" element={<ProtectedRoute><ShapeMatch /></ProtectedRoute>} />
            <Route path="/games/shapes" element={<ProtectedRoute><ShapeMatch /></ProtectedRoute>} />
            <Route path="/games/puzzles" element={<ProtectedRoute><SimplePuzzles /></ProtectedRoute>} />
            <Route path="/games/patterns" element={<ProtectedRoute><PatternSequence /></ProtectedRoute>} />
            <Route path="/games/pattern" element={<ProtectedRoute><PatternSequence /></ProtectedRoute>} />
            <Route path="/games/sound-match" element={<ProtectedRoute><SoundMatch /></ProtectedRoute>} />

            {/* ============================================ */}
            {/* ACTIVITIES HUB */}
            {/* ============================================ */}
            <Route path="/activities" element={<ProtectedRoute><Activities /></ProtectedRoute>} />
            <Route path="/activities/social-stories" element={<ProtectedRoute><SocialStories /></ProtectedRoute>} />
            <Route path="/activities/coloring" element={<ProtectedRoute><ColoringBook /></ProtectedRoute>} />
            <Route path="/activities/pronunciation" element={<ProtectedRoute><PronunciationPractice /></ProtectedRoute>} />
            <Route path="/activities/choice-board" element={<ProtectedRoute><ChoiceBoard /></ProtectedRoute>} />
            <Route path="/activities/sensory-breaks" element={<ProtectedRoute><SensoryBreaks /></ProtectedRoute>} />
            <Route path="/activities/music" element={<ProtectedRoute><MusicSounds /></ProtectedRoute>} />
            <Route path="/activities/photo-journal" element={<ProtectedRoute><PhotoJournal /></ProtectedRoute>} />
            <Route path="/activities/rewards" element={<ProtectedRoute><RewardChart /></ProtectedRoute>} />

            {/* ============================================ */}
            {/* PLANNING HUB */}
            {/* ============================================ */}
            <Route path="/planning" element={<ProtectedRoute><PlanningHub /></ProtectedRoute>} />
            <Route path="/planning/student-profile" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
            <Route path="/planning/file-of-life" element={<ProtectedRoute><FileOfLife /></ProtectedRoute>} />
            <Route path="/planning/person-centered" element={<ProtectedRoute><PersonCenteredPlan /></ProtectedRoute>} />
            <Route path="/planning/memorandum" element={<ProtectedRoute><MemorandumOfIntent /></ProtectedRoute>} />

            {/* ============================================ */}
            {/* RESOURCES HUB */}
            {/* ============================================ */}
            <Route path="/resources" element={<ProtectedRoute><ResourcesHub /></ProtectedRoute>} />
            <Route path="/resources/knowledge" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
            <Route path="/resources/knowledge/:regionId" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
            <Route path="/resources/knowledge/:regionId/:articleSlug" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
            <Route path="/resources/research" element={<ProtectedRoute><ResearchHub /></ProtectedRoute>} />
            <Route path="/resources/printables" element={<ProtectedRoute><PrintablesLibrary /></ProtectedRoute>} />
            <Route path="/resources/products" element={<ProtectedRoute><RecommendedProducts /></ProtectedRoute>} />
            <Route path="/resources/therapy-types" element={<ProtectedRoute><TherapyTypes /></ProtectedRoute>} />
            <Route path="/resources/definitions" element={<ProtectedRoute><Definitions /></ProtectedRoute>} />
            <Route path="/resources/faq" element={<ProtectedRoute><FAQ /></ProtectedRoute>} />

            {/* ============================================ */}
            {/* COMMUNITY */}
            {/* ============================================ */}
            <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
            <Route path="/community/setup" element={<ProtectedRoute><CommunityProfileSetup /></ProtectedRoute>} />
            <Route path="/community/new" element={<ProtectedRoute><CommunityNewThread /></ProtectedRoute>} />
            <Route path="/community/thread/:id" element={<ProtectedRoute><CommunityThread /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/hub" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
}

export default App;
