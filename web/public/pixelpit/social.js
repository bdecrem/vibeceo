/**
 * Pixelpit Social Library
 *
 * Unified social backend for Pixelpit games: authentication, leaderboards,
 * score submission, and shareable creations.
 *
 * Usage:
 *   <script src="/pixelpit/social.js"></script>
 *
 *   // Check if user is logged in
 *   const user = PixelpitSocial.getUser();
 *
 *   // Submit a score
 *   await PixelpitSocial.submitScore('g1', 1250, { nickname: 'speedrunner' });
 *
 *   // Get leaderboard
 *   const leaderboard = await PixelpitSocial.getLeaderboard('g1', 10);
 */

window.PixelpitSocial = (function() {
  const STORAGE_KEY = 'pixelpit_user';
  const API_BASE = '/api/pixelpit';

  // ============ State ============

  /**
   * Get current logged-in user from localStorage
   * @returns {{ id: number, handle: string } | null}
   */
  function getUser() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('PixelpitSocial: Error reading user from storage', e);
    }
    return null;
  }

  /**
   * Save user to localStorage
   * @param {{ id: number, handle: string }} user
   */
  function setUser(user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  // ============ Auth ============

  /**
   * Check if a handle is already taken
   * @param {string} handle
   * @returns {Promise<{ exists: boolean }>}
   */
  async function checkHandle(handle) {
    const res = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check', handle }),
    });
    return res.json();
  }

  /**
   * Register a new account
   * @param {string} handle - 3-20 alphanumeric chars or underscores
   * @param {string} code - 4 alphanumeric chars (case sensitive)
   * @returns {Promise<{ success: boolean, user?: { id: number, handle: string }, error?: string }>}
   */
  async function register(handle, code) {
    const res = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', handle, code }),
    });
    const data = await res.json();
    if (data.success && data.user) {
      setUser(data.user);
    }
    return data;
  }

  /**
   * Login to existing account
   * @param {string} handle
   * @param {string} code - 4 alphanumeric chars (case sensitive)
   * @returns {Promise<{ success: boolean, user?: { id: number, handle: string }, error?: string }>}
   */
  async function login(handle, code) {
    const res = await fetch(`${API_BASE}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', handle, code }),
    });
    const data = await res.json();
    if (data.success && data.user) {
      setUser(data.user);
    }
    return data;
  }

  /**
   * Logout and clear stored user
   */
  function logout() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ============ Scores ============

  /**
   * Submit a score to the leaderboard
   * @param {string} gameId - Game identifier (e.g., 'g1', 'tap-tempo')
   * @param {number} score
   * @param {{ nickname?: string }} [opts] - If not logged in, provide nickname
   * @returns {Promise<{ success: boolean, rank?: number, entry?: object, error?: string }>}
   */
  async function submitScore(gameId, score, opts = {}) {
    const user = getUser();
    const body = {
      game: gameId,
      score: score,
    };

    if (user) {
      body.userId = user.id;
    } else if (opts.nickname) {
      body.nickname = opts.nickname;
    } else {
      return { success: false, error: 'Must be logged in or provide nickname' };
    }

    const res = await fetch(`${API_BASE}/leaderboard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  /**
   * Get leaderboard for a game
   * @param {string} gameId
   * @param {number} [limit=10]
   * @returns {Promise<Array<{ rank: number, name: string, score: number, isRegistered: boolean, created_at: string }>>}
   */
  async function getLeaderboard(gameId, limit = 10) {
    const res = await fetch(`${API_BASE}/leaderboard?game=${encodeURIComponent(gameId)}&limit=${limit}`);
    const data = await res.json();
    return data.leaderboard || [];
  }

  // ============ Creations ============

  /**
   * Save a creation (music, drawing, etc.)
   * @param {string} gameId
   * @param {string} contentType - 'music', 'drawing', etc.
   * @param {object} contentData - The creation data
   * @param {{ nickname?: string, metadata?: object }} [opts]
   * @returns {Promise<{ success: boolean, slug?: string, url?: string, error?: string }>}
   */
  async function saveCreation(gameId, contentType, contentData, opts = {}) {
    const user = getUser();
    const body = {
      game: gameId,
      contentType: contentType,
      contentData: contentData,
    };

    if (user) {
      body.userId = user.id;
    } else if (opts.nickname) {
      body.nickname = opts.nickname;
    }

    if (opts.metadata) {
      body.metadata = opts.metadata;
    }

    const res = await fetch(`${API_BASE}/creation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }

  /**
   * Fetch a creation by slug
   * @param {string} slug
   * @returns {Promise<object>}
   */
  async function getCreation(slug) {
    const res = await fetch(`${API_BASE}/creation/${encodeURIComponent(slug)}`);
    return res.json();
  }

  // ============ Share ============

  /**
   * Share game/creation using native share or clipboard fallback
   * @param {string} url - URL to share
   * @param {string} text - Share text
   * @returns {Promise<{ success: boolean, method: 'native' | 'clipboard' }>}
   */
  async function share(url, text) {
    const shareData = {
      title: 'Pixelpit',
      text: text,
      url: url,
    };

    // Try native share first
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        return { success: true, method: 'native' };
      } catch (e) {
        if (e.name === 'AbortError') {
          return { success: false, method: 'native' };
        }
        // Fall through to clipboard
      }
    }

    // Fallback to clipboard
    try {
      await navigator.clipboard.writeText(url);
      return { success: true, method: 'clipboard' };
    } catch (e) {
      console.error('PixelpitSocial: Failed to copy to clipboard', e);
      return { success: false, method: 'clipboard' };
    }
  }

  /**
   * Share a game link
   * @param {string} gameId
   * @param {string} [text]
   */
  async function shareGame(gameId, text) {
    const url = `${window.location.origin}/pixelpit/${gameId}`;
    return share(url, text || `Check out ${gameId} on Pixelpit!`);
  }

  // ============ UI Helpers ============

  /**
   * Format a leaderboard entry for display
   * @param {{ name: string, score: number, isRegistered: boolean }} entry
   * @returns {{ displayName: string, formattedScore: string }}
   */
  function formatLeaderboardEntry(entry) {
    return {
      displayName: entry.isRegistered ? `@${entry.name}` : entry.name,
      formattedScore: entry.score.toLocaleString(),
    };
  }

  /**
   * Render a leaderboard to a container element
   * @param {HTMLElement} container
   * @param {Array} leaderboard
   * @param {{ highlightUser?: boolean }} [opts]
   */
  function renderLeaderboard(container, leaderboard, opts = {}) {
    const user = opts.highlightUser ? getUser() : null;

    container.innerHTML = leaderboard.map(entry => {
      const { displayName, formattedScore } = formatLeaderboardEntry(entry);
      const isCurrentUser = user && entry.isRegistered && entry.name === user.handle;
      const guestClass = entry.isRegistered ? '' : ' guest';
      const currentClass = isCurrentUser ? ' current-user' : '';

      return `
        <div class="leaderboard-row${guestClass}${currentClass}">
          <span class="rank">${entry.rank}</span>
          <span class="name">${displayName}</span>
          <span class="score">${formattedScore}</span>
        </div>
      `;
    }).join('');
  }

  // ============ Public API ============

  return {
    // State
    getUser,

    // Auth
    checkHandle,
    register,
    login,
    logout,

    // Scores
    submitScore,
    getLeaderboard,

    // Creations
    saveCreation,
    getCreation,

    // Share
    share,
    shareGame,

    // UI Helpers
    formatLeaderboardEntry,
    renderLeaderboard,
  };
})();
