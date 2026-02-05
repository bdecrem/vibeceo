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
      // Auto-join pending group from invite link
      const pendingGroup = getStoredGroupCode();
      if (pendingGroup) {
        await joinGroup(pendingGroup);
        clearStoredGroupCode();
      }
      // Record magic streak connection if came via referral link
      const refUserId = getStoredRefUserId();
      if (refUserId) {
        await recordConnection(data.user.id, refUserId);
        clearStoredRefUserId();
      }
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
      // Auto-join pending group from invite link
      const pendingGroup = getStoredGroupCode();
      if (pendingGroup) {
        await joinGroup(pendingGroup);
        clearStoredGroupCode();
      }
      // Record magic streak connection if came via referral link
      const refUserId = getStoredRefUserId();
      if (refUserId) {
        await recordConnection(data.user.id, refUserId);
        clearStoredRefUserId();
      }
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
   * @param {{ nickname?: string, xpDivisor?: number, groupCode?: string }} [opts] - If not logged in, provide nickname. xpDivisor controls XP (default 100, use 1 for full score as XP). groupCode for auto-join.
   * @returns {Promise<{ success: boolean, rank?: number, entry?: object, progression?: object, joinedGroup?: object, magicPair?: object, error?: string }>}
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

    if (opts.xpDivisor !== undefined) {
      body.xpDivisor = opts.xpDivisor;
    }

    // Include group code for auto-join (from opts or sessionStorage)
    const groupCode = opts.groupCode || getStoredGroupCode();
    if (groupCode) {
      body.groupCode = groupCode;
    }

    // Include referrer user ID for magic streaks (from URL or sessionStorage)
    const refUserId = getRefFromUrl() || getStoredRefUserId();
    if (refUserId && user && refUserId !== user.id) {
      body.refUserId = refUserId;
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
   * @param {{ nickname?: string, entryId?: number }} [opts] - Pass entryId to get that specific entry's rank
   * @returns {Promise<{ leaderboard: Array<{ rank: number, name: string, score: number, isRegistered: boolean }>, playerEntry?: object }>}
   */
  async function getLeaderboard(gameId, limit = 10, opts = {}) {
    const user = getUser();
    let url = `${API_BASE}/leaderboard?game=${encodeURIComponent(gameId)}&limit=${limit}`;

    // Pass current player info to get their rank if not in top
    if (user) {
      url += `&userId=${user.id}`;
    } else if (opts.entryId) {
      url += `&entryId=${opts.entryId}`;
    }

    const res = await fetch(url);
    const data = await res.json();
    return {
      leaderboard: data.leaderboard || [],
      playerEntry: data.playerEntry || null,
    };
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

  // ============ Profile ============

  /**
   * Fetch user profile with progression data
   * @param {number} userId
   * @returns {Promise<{ handle: string, xp: number, level: number, levelProgress: number, levelNeeded: number, streak: number, maxStreak: number } | null>}
   */
  async function getProfile(userId) {
    try {
      const res = await fetch(`${API_BASE}/profile?userId=${userId}`);
      if (!res.ok) return null;
      return res.json();
    } catch (e) {
      console.error('PixelpitSocial: Error fetching profile', e);
      return null;
    }
  }

  // ============ Groups ============

  /**
   * Get all groups the current user is a member of
   * @returns {Promise<{ groups: Array<{ id: number, code: string, name: string, type: 'streak' | 'leaderboard', streak?: number, members: Array<{ userId: number, handle: string, lastPlayAt: string | null }> }> }>}
   */
  async function getGroups() {
    const user = getUser();
    if (!user) return { groups: [] };

    try {
      const res = await fetch(`${API_BASE}/groups?userId=${user.id}`);
      return res.json();
    } catch (e) {
      console.error('PixelpitSocial: Error fetching groups', e);
      return { groups: [] };
    }
  }

  /**
   * Create a new group
   * @param {string} name - Group name (max 50 chars)
   * @param {'streak' | 'leaderboard'} type - Group type
   * @param {{ phones?: string[], gameUrl?: string, score?: number }} [opts] - Optional SMS invite params
   * @returns {Promise<{ success: boolean, group?: { id: number, code: string, name: string, type: string }, xpEarned?: number, smsLink?: string, error?: string }>}
   */
  async function createGroup(name, type, opts = {}) {
    const user = getUser();
    if (!user) return { success: false, error: 'Must be logged in to create group' };

    try {
      const res = await fetch(`${API_BASE}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          name,
          type,
          phones: opts.phones,
          gameUrl: opts.gameUrl,
          score: opts.score,
        }),
      });
      return res.json();
    } catch (e) {
      console.error('PixelpitSocial: Error creating group', e);
      return { success: false, error: 'Failed to create group' };
    }
  }

  /**
   * Join a group by code
   * @param {string} code - 4-char group code
   * @returns {Promise<{ success: boolean, group?: { id: number, code: string, name: string, type: string }, alreadyMember?: boolean, error?: string }>}
   */
  async function joinGroup(code) {
    const user = getUser();
    if (!user) return { success: false, error: 'Must be logged in to join group' };

    try {
      const res = await fetch(`${API_BASE}/groups/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, code }),
      });
      return res.json();
    } catch (e) {
      console.error('PixelpitSocial: Error joining group', e);
      return { success: false, error: 'Failed to join group' };
    }
  }

  /**
   * Get leaderboard filtered to a specific group
   * @param {string} gameId
   * @param {string} groupCode - 4-char group code
   * @param {number} [limit=10]
   * @returns {Promise<{ leaderboard: Array, playerEntry?: object, group?: { id: number, type: string, name: string } }>}
   */
  async function getGroupLeaderboard(gameId, groupCode, limit = 10) {
    const user = getUser();
    let url = `${API_BASE}/leaderboard?game=${encodeURIComponent(gameId)}&limit=${limit}&groupCode=${encodeURIComponent(groupCode)}`;
    if (user) {
      url += `&userId=${user.id}`;
    }

    try {
      const res = await fetch(url);
      const data = await res.json();
      return {
        leaderboard: data.leaderboard || [],
        playerEntry: data.playerEntry || null,
        group: data.group || null,
      };
    } catch (e) {
      console.error('PixelpitSocial: Error fetching group leaderboard', e);
      return { leaderboard: [], playerEntry: null, group: null };
    }
  }

  /**
   * Generate an SMS invite link for a group
   * @param {string[]} phones - Phone numbers to invite
   * @param {string} groupCode - Group code to include in link
   * @param {string} gameUrl - Base game URL
   * @param {number} [score] - Optional score to include in message
   * @returns {string} SMS link (sms:/open?addresses=...&body=...)
   */
  function getSmsInviteLink(phones, groupCode, gameUrl, score) {
    const user = getUser();
    const handle = user ? user.handle : 'Someone';
    const url = `${gameUrl}?pg=${groupCode}`;
    const scoreText = score ? ` of ${score}` : '';
    const msg = `${handle} wants you to beat their score${scoreText}! ${url}`;
    const nums = phones
      .map(p => p.replace(/\D/g, ''))
      .filter(p => p.length >= 10)
      .join(',');
    return `sms:/open?addresses=${nums}&body=${encodeURIComponent(msg)}`;
  }

  /**
   * Get the group code from URL if present
   * @returns {string | null}
   */
  function getGroupCodeFromUrl() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('pg');
  }

  /**
   * Store group code in sessionStorage for use during score submission
   * @param {string} code
   */
  function storeGroupCode(code) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pixelpit_group_code', code);
    }
  }

  /**
   * Get stored group code from sessionStorage
   * @returns {string | null}
   */
  function getStoredGroupCode() {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem('pixelpit_group_code');
  }

  /**
   * Clear stored group code
   */
  function clearStoredGroupCode() {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('pixelpit_group_code');
    }
  }

  // ============ Referrals (Magic Streaks) ============

  /**
   * Get the referrer user ID from URL if present (?ref=123)
   * Auto-stores in sessionStorage so it survives until registration
   * @returns {number | null}
   */
  function getRefFromUrl() {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      const refId = parseInt(ref, 10);
      storeRefUserId(refId); // Auto-store for later use during registration
      return refId;
    }
    return null;
  }

  /**
   * Store ref user ID in sessionStorage
   * @param {number} refUserId
   */
  function storeRefUserId(refUserId) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('pixelpit_ref_user', String(refUserId));
    }
  }

  /**
   * Get stored ref user ID from sessionStorage
   * @returns {number | null}
   */
  function getStoredRefUserId() {
    if (typeof sessionStorage === 'undefined') return null;
    const stored = sessionStorage.getItem('pixelpit_ref_user');
    return stored ? parseInt(stored, 10) : null;
  }

  /**
   * Clear stored ref user ID
   */
  function clearStoredRefUserId() {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('pixelpit_ref_user');
    }
  }

  /**
   * Record a magic streak connection after registration/login
   * @param {number} userId - The newly logged in user
   * @param {number} refUserId - The user who referred them
   */
  async function recordConnection(userId, refUserId) {
    if (!refUserId || refUserId === userId) return;
    try {
      await fetch(`${API_BASE}/connections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, refUserId }),
      });
    } catch (e) {
      // Silent fail - not critical
    }
  }

  // ============ Share ============

  /**
   * Share game/creation using native share or clipboard fallback
   * Automatically appends ?ref=<userId> for magic streaks if user is logged in
   * @param {string} url - URL to share
   * @param {string} text - Share text
   * @returns {Promise<{ success: boolean, method: 'native' | 'clipboard' }>}
   */
  async function share(url, text) {
    // Append ref parameter for magic streaks if user is logged in
    const user = getUser();
    let shareUrl = url;
    if (user && user.id) {
      // Simple string append to avoid URL parsing issues
      const separator = url.includes('?') ? '&' : '?';
      shareUrl = `${url}${separator}ref=${user.id}`;
    }

    const shareData = {
      title: 'Pixelpit',
      text: text,
      url: shareUrl,
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
      await navigator.clipboard.writeText(shareUrl);
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

  // Track if styles have been injected
  let stylesInjected = false;

  /**
   * Inject Pixelpit Social CSS (once)
   */
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;

    const css = `
      .pp-share-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #0ff;
        color: #000;
        border: none;
        border-radius: 6px;
        padding: 10px 18px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
        position: relative;
      }
      .pp-share-btn:hover {
        background: #5ff;
        transform: translateY(-1px);
      }
      .pp-share-btn:active {
        transform: translateY(0);
      }
      .pp-share-btn.pp-style-icon {
        padding: 10px;
        border-radius: 50%;
      }
      .pp-share-btn.pp-style-icon .pp-share-text {
        display: none;
      }
      .pp-share-btn.pp-style-minimal {
        background: transparent;
        color: #0ff;
        padding: 6px 12px;
        border: 1px solid #0ff;
      }
      .pp-share-btn.pp-style-minimal:hover {
        background: rgba(0, 255, 255, 0.1);
      }
      .pp-share-icon {
        width: 16px;
        height: 16px;
        fill: currentColor;
      }
      .pp-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #222;
        color: #0ff;
        padding: 12px 24px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        opacity: 0;
        transition: all 0.3s ease;
        pointer-events: none;
      }
      .pp-toast.pp-toast-visible {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    `;

    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Show a toast notification
   * @param {string} message
   * @param {number} [duration=2000]
   */
  function showToast(message, duration = 2000) {
    injectStyles();

    // Remove existing toast
    const existing = document.querySelector('.pp-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'pp-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.classList.add('pp-toast-visible');
    });

    // Remove after duration
    setTimeout(() => {
      toast.classList.remove('pp-toast-visible');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Create a share button in a container
   * @param {string} containerId - ID of the container element
   * @param {{ url: string, text: string, style?: 'icon' | 'button' | 'minimal' }} opts
   * @returns {HTMLButtonElement | null}
   */
  function ShareButton(containerId, opts) {
    injectStyles();

    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`PixelpitSocial: Container #${containerId} not found`);
      return null;
    }

    const { url, text, style = 'button' } = opts;

    // Share icon SVG
    const shareIcon = `<svg class="pp-share-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
    </svg>`;

    const btn = document.createElement('button');
    btn.className = `pp-share-btn pp-style-${style}`;
    btn.innerHTML = `${shareIcon}<span class="pp-share-text">Share</span>`;

    btn.addEventListener('click', async () => {
      const result = await share(url, text);
      if (result.success) {
        if (result.method === 'clipboard') {
          showToast('Copied!');
        }
        // Native share handles its own UI
      } else {
        showToast('Failed to share');
      }
    });

    container.appendChild(btn);
    return btn;
  }

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

    // Profile
    getProfile,

    // Groups
    getGroups,
    createGroup,
    joinGroup,
    getGroupLeaderboard,
    getSmsInviteLink,
    getGroupCodeFromUrl,
    storeGroupCode,
    getStoredGroupCode,
    clearStoredGroupCode,

    // Referrals (Magic Streaks)
    getRefFromUrl,
    storeRefUserId,
    getStoredRefUserId,
    clearStoredRefUserId,

    // Creations
    saveCreation,
    getCreation,

    // Share
    share,
    shareGame,

    // UI Helpers
    formatLeaderboardEntry,
    renderLeaderboard,
    ShareButton,
    showToast,
  };
})();
