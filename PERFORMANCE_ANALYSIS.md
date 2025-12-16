# Performance Analysis Report

**Date:** December 16, 2025
**Analyzed by:** Claude Code

## Executive Summary

Found **25+ performance issues** across the codebase affecting:
- Database query efficiency (N+1 patterns)
- React rendering performance (missing memoization)
- Algorithm complexity (O(n²) to O(n⁵) operations)

---

## Critical Issues

### 1. N+1 Query in replayService.js

**File:** `src/services/replayService.js:112-124`

```javascript
const replaysWithCounts = await Promise.all(
  games.map(async (game) => {
    const { count } = await dbCount('game_moves', { eq: { game_id: game.id } });
    return { ...game, moveCount: count || 0 };
  })
);
```

**Impact:** Loading 20 replays triggers 21 database queries (1 + N)
**Fix:** Batch count query using SQL aggregation or pre-aggregate move counts in database

---

### 2. AuthContext Provider Not Memoized

**File:** `src/contexts/AuthContext.jsx:721-748`

```javascript
<AuthContext.Provider value={{
  user, profile, loading,
  // 20+ properties
  refreshProfile: async () => { ... }, // inline function!
}}>
```

**Impact:** Creates new object on EVERY render, causing all context consumers to re-render
**Fix:** Wrap value object with `useMemo`, extract functions with `useCallback`

---

### 3. O(n⁵) Nested Loops in Game Logic

**Files affected:**
- `src/utils/gameLogic.js:75-87` - `canAnyPieceBePlaced()`
- `src/utils/aiLogic.js:36-54` - `getAllPossibleMoves()`
- `src/utils/puzzleGenerator.js:38-52` - `getAllValidMoves()`

**Structure:** 5 nested loops (pieces → flip → rotation → row → col)

**Impact:** Exponential complexity in move generation, noticeable on mobile devices

---

### 4. Array.includes() Inside Loops (O(n²))

| File | Line | Pattern |
|------|------|---------|
| `src/utils/aiLogic.js` | 32, 60, 81 | `!usedPieces.includes(p)` |
| `src/utils/gameLogic.js` | 76 | `safeUsedPieces.includes(pieceType)` |
| `src/utils/puzzleGenerator.js` | 35 | `!usedPieces.includes(p)` |
| `src/hooks/useGameState.js` | 456 | `usedPieces.includes(piece)` |
| `src/components/PieceTray.jsx` | 59, 72 | `safeUsedPieces.includes(pieceName)` |

**Fix:** Convert `usedPieces` array to a `Set` before filtering/looping

---

### 5. JSON.stringify in Performance-Critical Code

| File | Line | Context | Impact |
|------|------|---------|--------|
| `src/services/realtimeManager.js` | 422 | Polling every 2s | Serializes 8×8 board |
| `src/utils/memoization.js` | 38, 163, 185, 204 | Every render | Deep comparison |
| `src/utils/api.js` | 26 | Every API call | Cache key generation |

**Fix:** Use shallow comparison or hash-based comparison instead

---

## High Priority Issues

### 6. Missing React.memo (0 components use it)

**Components that need memoization:**
- `src/components/TierIcon.jsx` - Used in 20+ places
- `src/components/RatingDisplay.jsx` - Frequent updates
- `src/components/NotificationBell.jsx` - Frequent updates
- `src/components/PlayerIndicator.jsx` - Online games
- `src/components/AchievementsDisplay.jsx` - List rendering
- `src/components/FloatingPiecesBackground.jsx` - Animation

---

### 7. Inline Functions in JSX (50+ instances)

**Worst offenders:**

| File | Count | Example Lines |
|------|-------|---------------|
| `src/components/FriendsList.jsx` | 15+ | 297, 324, 332, 349, 399, 505, 526 |
| `src/components/EntryAuthScreen.jsx` | 12+ | 262, 271, 359, 408, 448, 533 |
| `src/components/GameOverModal.jsx` | 10+ | 339, 346, 355, 362, 369 |
| `src/components/SettingsModal.jsx` | 8+ | 110, 131, 152, 169, 184 |
| `src/components/Achievements.jsx` | 4+ | 125, 147, 179, 274 |

**Fix:** Extract to `useCallback` hooks

---

### 8. Inline Style Objects (50+ instances)

**Worst offenders:**
- `src/components/SpeedPuzzleScreen.jsx` - 37+ inline styles
- `src/components/GameOverModal.jsx` - 6+ inline styles
- `src/components/MenuScreen.jsx` - 4+ inline styles

**Fix:** Move to `useMemo` or extract to CSS/Tailwind classes

---

### 9. Sequential Queries Instead of Parallel

**File:** `src/components/ViewPlayerProfile.jsx:49-55`

```javascript
const areFriends = await friendsService.areFriends(...);
const { data: sentRequests } = await friendsService.getSentRequests(...);
const { data: receivedRequests } = await friendsService.getPendingRequests(...);
```

**Fix:** Use `Promise.all()` for parallel execution:
```javascript
const [areFriends, sentRequests, receivedRequests] = await Promise.all([
  friendsService.areFriends(...),
  friendsService.getSentRequests(...),
  friendsService.getPendingRequests(...)
]);
```

---

## Medium Priority Issues

### 10. indexOf + splice (O(n) each)

**File:** `src/utils/api.js:271`
```javascript
executing.splice(executing.indexOf(promise), 1);
```
**Fix:** Use `Set<Promise>` instead of array for O(1) operations

---

### 11. String Concatenation in Loop

**File:** `src/utils/puzzleGenerator.js:24-28`
```javascript
let result = '';
for (...) { result += boardPieces[row][col] || 'G'; }
```
**Fix:** Use array and `join()`:
```javascript
const cells = [];
for (...) { cells.push(boardPieces[row][col] || 'G'); }
return cells.join('');
```

---

### 12. DPad Dynamic Handler Object

**File:** `src/components/DPad.jsx:51-55`
```javascript
const getButtonHandlers = (direction) => ({
  onTouchStart: (e) => handleTouchStart(direction, e),
  onClick: (e) => handleClick(direction, e),
});
```
**Fix:** Pre-compute handlers for each direction using `useMemo`

---

## Good Patterns Found

1. **Proper batch loading** in `replayService.js:35-47` - Uses Set for deduplication
2. **Promise.all** in `FriendsList.jsx:36-40` - Parallel data loading
3. **Event listener cleanup** in `useCommon.js`, `useScrollContainer.js`
4. **Set usage for deduplication** in `spectatorService.js:190`

---

## Recommended Fix Priority

| Priority | Issue | File(s) | Estimated Impact |
|----------|-------|---------|------------------|
| 1 | Memoize AuthContext value | AuthContext.jsx | -50% re-renders app-wide |
| 2 | Convert usedPieces to Set | aiLogic.js, gameLogic.js, puzzleGenerator.js | -80% move calculation time |
| 3 | Fix N+1 in getUserReplays | replayService.js | -95% database queries |
| 4 | Add React.memo to common components | TierIcon.jsx, RatingDisplay.jsx | -30% component re-renders |
| 5 | Remove JSON.stringify from polling | realtimeManager.js | -20% CPU usage on mobile |
| 6 | Convert inline functions to useCallback | FriendsList.jsx, EntryAuthScreen.jsx | -20% re-renders |
| 7 | Parallelize ViewPlayerProfile queries | ViewPlayerProfile.jsx | -66% load time |
| 8 | Use Set instead of array in api.js | api.js | Improved scalability |

---

## Quick Wins (Low Effort, High Impact)

1. **Add `React.memo` wrapper** to TierIcon, RatingDisplay components
2. **Convert `usedPieces` to Set** - single line change in each file
3. **Use `Promise.all`** in ViewPlayerProfile.jsx
4. **Replace `indexOf+splice`** with Set in api.js

---

## Implementation Notes

### Converting usedPieces to Set

**Before:**
```javascript
Object.keys(pieces).filter(p => !usedPieces.includes(p))
```

**After:**
```javascript
const usedSet = new Set(usedPieces);
Object.keys(pieces).filter(p => !usedSet.has(p))
```

### Memoizing AuthContext

**Before:**
```javascript
<AuthContext.Provider value={{ user, profile, loading, ... }}>
```

**After:**
```javascript
const contextValue = useMemo(() => ({
  user, profile, loading, ...
}), [user, profile, loading, /* other deps */]);

<AuthContext.Provider value={contextValue}>
```

### Adding React.memo

**Before:**
```javascript
export default function TierIcon({ tier, size }) { ... }
```

**After:**
```javascript
export default React.memo(function TierIcon({ tier, size }) { ... });
```
