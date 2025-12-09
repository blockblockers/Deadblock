-- =====================================================
-- DEADBLOCK - Supabase Database Schema
-- =====================================================
-- Run this SQL in your Supabase SQL Editor to set up
-- all required tables, policies, and functions.
-- =====================================================

-- =====================================================
-- PROFILES TABLE
-- Extends Supabase auth.users with game-specific data
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  rating INT DEFAULT 1000,
  games_played INT DEFAULT 0,
  games_won INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
  CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]+$')
);

-- Index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON profiles(rating DESC);

-- =====================================================
-- MATCHMAKING QUEUE TABLE
-- Players waiting for a match
-- =====================================================
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating INT NOT NULL,
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  
  -- Only one entry per user
  CONSTRAINT unique_user_in_queue UNIQUE (user_id)
);

-- Index for finding matches
CREATE INDEX IF NOT EXISTS idx_matchmaking_status ON matchmaking_queue(status, rating);
CREATE INDEX IF NOT EXISTS idx_matchmaking_queued ON matchmaking_queue(queued_at);

-- =====================================================
-- GAMES TABLE
-- Active and completed games
-- =====================================================
CREATE TABLE IF NOT EXISTS games (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID REFERENCES profiles(id) NOT NULL,
  player2_id UUID REFERENCES profiles(id) NOT NULL,
  
  -- Game state (stored as JSON for flexibility)
  board JSONB NOT NULL DEFAULT '[]',
  board_pieces JSONB NOT NULL DEFAULT '{}',
  used_pieces JSONB NOT NULL DEFAULT '[]',
  current_player INT DEFAULT 1 CHECK (current_player IN (1, 2)),
  
  -- Game status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  winner_id UUID REFERENCES profiles(id),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure different players
  CONSTRAINT different_players CHECK (player1_id != player2_id)
);

-- Indexes for game queries
CREATE INDEX IF NOT EXISTS idx_games_player1 ON games(player1_id);
CREATE INDEX IF NOT EXISTS idx_games_player2 ON games(player2_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_updated ON games(updated_at DESC);

-- =====================================================
-- GAME MOVES TABLE
-- History of moves for replay/analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS game_moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES profiles(id) NOT NULL,
  
  -- Move details
  piece_type TEXT NOT NULL,
  row INT NOT NULL CHECK (row >= 0 AND row < 8),
  col INT NOT NULL CHECK (col >= 0 AND col < 8),
  rotation INT NOT NULL DEFAULT 0 CHECK (rotation >= 0 AND rotation < 4),
  flipped BOOLEAN DEFAULT FALSE,
  move_number INT NOT NULL,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for move queries
CREATE INDEX IF NOT EXISTS idx_game_moves_game ON game_moves(game_id, move_number);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
-- Everyone can view profiles
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- MATCHMAKING QUEUE POLICIES
-- Users can view queue (for count display)
CREATE POLICY "Queue is viewable by authenticated users" ON matchmaking_queue
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can manage their own queue entries
CREATE POLICY "Users can insert own queue entry" ON matchmaking_queue
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own queue entry" ON matchmaking_queue
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own queue entry" ON matchmaking_queue
  FOR DELETE USING (auth.uid() = user_id);

-- GAMES POLICIES
-- Players can view their own games
CREATE POLICY "Players can view their games" ON games
  FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Players can update their active games
CREATE POLICY "Players can update their active games" ON games
  FOR UPDATE USING (
    (auth.uid() = player1_id OR auth.uid() = player2_id) 
    AND status = 'active'
  );

-- Authenticated users can create games (for matchmaking)
CREATE POLICY "Authenticated users can create games" ON games
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- GAME MOVES POLICIES
-- Players can view moves of their games
CREATE POLICY "Players can view their game moves" ON game_moves
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = game_moves.game_id 
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
    )
  );

-- Players can insert moves in their games
CREATE POLICY "Players can insert moves" ON game_moves
  FOR INSERT WITH CHECK (
    auth.uid() = player_id AND
    EXISTS (
      SELECT 1 FROM games 
      WHERE games.id = game_id 
      AND (games.player1_id = auth.uid() OR games.player2_id = auth.uid())
      AND games.status = 'active'
    )
  );

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to automatically create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username', 
      'player_' || substr(NEW.id::text, 1, 8)
    ),
    COALESCE(
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'username',
      'New Player'
    )
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- If username taken, append random suffix
    INSERT INTO profiles (id, username, display_name)
    VALUES (
      NEW.id,
      'player_' || substr(gen_random_uuid()::text, 1, 8),
      COALESCE(NEW.raw_user_meta_data->>'display_name', 'New Player')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update player stats after game
CREATE OR REPLACE FUNCTION increment_player_stats(
  player_id UUID,
  won BOOLEAN
)
RETURNS VOID AS $$
DECLARE
  rating_change INT;
BEGIN
  -- Simple rating change: +25 for win, -20 for loss
  IF won THEN
    rating_change := 25;
  ELSE
    rating_change := -20;
  END IF;

  UPDATE profiles
  SET 
    games_played = games_played + 1,
    games_won = games_won + CASE WHEN won THEN 1 ELSE 0 END,
    rating = GREATEST(100, rating + rating_change), -- Minimum rating of 100
    last_seen = NOW()
  WHERE id = player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update last_seen
CREATE OR REPLACE FUNCTION update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET last_seen = NOW() WHERE id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean up old queue entries (run periodically)
CREATE OR REPLACE FUNCTION cleanup_stale_queue()
RETURNS VOID AS $$
BEGIN
  DELETE FROM matchmaking_queue
  WHERE status = 'waiting' 
  AND queued_at < NOW() - INTERVAL '10 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to abandon inactive games (run periodically)
CREATE OR REPLACE FUNCTION cleanup_inactive_games()
RETURNS VOID AS $$
BEGIN
  UPDATE games
  SET status = 'abandoned'
  WHERE status = 'active'
  AND updated_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- REALTIME SUBSCRIPTIONS
-- Enable realtime for necessary tables
-- =====================================================

-- Enable realtime for games table (for live game updates)
ALTER PUBLICATION supabase_realtime ADD TABLE games;

-- Enable realtime for matchmaking queue (for match notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;

-- =====================================================
-- OPTIONAL: Create indexes for performance
-- =====================================================

-- Composite index for finding active games by player
CREATE INDEX IF NOT EXISTS idx_games_active_player1 
ON games(player1_id, status) WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_games_active_player2 
ON games(player2_id, status) WHERE status = 'active';

-- =====================================================
-- DONE!
-- =====================================================
-- Your database is now set up for Deadblock multiplayer.
-- 
-- Next steps:
-- 1. Enable Google OAuth in Authentication > Providers
-- 2. Set Site URL in Authentication > URL Configuration
-- 3. Add redirect URLs for your domain
-- =====================================================
