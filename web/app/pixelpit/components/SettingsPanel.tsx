'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Group, ScoreFlowColors } from './types';

interface SettingsPanelProps {
  colors: ScoreFlowColors;
  onClose: () => void;
}

export function SettingsPanel({ colors, onClose }: SettingsPanelProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const editRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  // Phone alerts state
  const [phoneState, setPhoneState] = useState<'loading' | 'none' | 'code-sent' | 'verified'>('loading');
  const [phoneInput, setPhoneInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [phoneBusy, setPhoneBusy] = useState(false);

  const fontFamily = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

  const currentUserId = typeof window !== 'undefined'
    ? window.PixelpitSocial?.getUser()?.id ?? null
    : null;

  useEffect(() => {
    const load = async () => {
      if (!window.PixelpitSocial) { setLoading(false); return; }
      try {
        const result = await window.PixelpitSocial.getGroups();
        setGroups(result.groups || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load phone status
  useEffect(() => {
    if (!currentUserId) { setPhoneState('none'); return; }
    const loadPhone = async () => {
      try {
        const res = await fetch(`/api/pixelpit/phone?userId=${currentUserId}`);
        const data = await res.json();
        if (data.phone && data.verified) {
          setMaskedPhone(data.phone);
          setPhoneState('verified');
        } else if (data.phone && !data.verified) {
          setMaskedPhone(data.phone);
          setPhoneState('code-sent');
        } else {
          setPhoneState('none');
        }
      } catch {
        setPhoneState('none');
      }
    };
    loadPhone();
  }, [currentUserId]);

  useEffect(() => {
    if (editingId !== null && editRef.current) {
      editRef.current.focus();
      editRef.current.select();
    }
  }, [editingId]);

  const startEdit = (group: Group) => {
    setEditingId(group.id);
    setEditName(group.name);
    setConfirmDeleteId(null);
  };

  const saveEdit = async () => {
    if (savingRef.current) return;
    if (!editingId || !currentUserId) return;
    const trimmed = editName.trim();
    if (!trimmed) { setEditingId(null); return; }

    savingRef.current = true;
    try {
      const res = await fetch(`/api/pixelpit/groups/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId, name: trimmed }),
      });
      const result = await res.json();
      if (result.success) {
        setGroups(prev => prev.map(g => g.id === editingId ? { ...g, name: trimmed } : g));
        window.PixelpitSocial?.showToast?.('Renamed!');
      } else {
        window.PixelpitSocial?.showToast?.(result.error || 'Failed');
      }
    } catch {
      window.PixelpitSocial?.showToast?.('Failed');
    }
    setEditingId(null);
    savingRef.current = false;
  };

  const doDelete = async (groupId: number) => {
    if (!currentUserId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/pixelpit/groups/${groupId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });
      const result = await res.json();
      if (result.success) {
        setGroups(prev => prev.filter(g => g.id !== groupId));
        window.PixelpitSocial?.showToast?.('Group deleted');
      } else {
        window.PixelpitSocial?.showToast?.(result.error || 'Failed');
      }
    } catch {
      window.PixelpitSocial?.showToast?.('Failed');
    }
    setConfirmDeleteId(null);
    setDeleting(false);
  };

  const isOwner = (group: Group) => currentUserId !== null && group.createdBy === currentUserId;

  const sendPhoneCode = async () => {
    if (!currentUserId || !phoneInput.trim()) return;
    setPhoneBusy(true);
    setPhoneError('');
    try {
      const res = await fetch('/api/pixelpit/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send-code', userId: currentUserId, phone: phoneInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setPhoneState('code-sent');
        window.PixelpitSocial?.showToast?.('Code sent!');
      } else {
        setPhoneError(data.error || 'Failed to send code');
      }
    } catch {
      setPhoneError('Failed to send code');
    }
    setPhoneBusy(false);
  };

  const verifyPhoneCode = async () => {
    if (!currentUserId || !codeInput.trim()) return;
    setPhoneBusy(true);
    setPhoneError('');
    try {
      const res = await fetch('/api/pixelpit/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', userId: currentUserId, code: codeInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setPhoneState('verified');
        // Refresh masked phone
        const statusRes = await fetch(`/api/pixelpit/phone?userId=${currentUserId}`);
        const statusData = await statusRes.json();
        if (statusData.phone) setMaskedPhone(statusData.phone);
        setCodeInput('');
        window.PixelpitSocial?.showToast?.('Phone verified!');
      } else {
        setPhoneError(data.error || 'Invalid code');
      }
    } catch {
      setPhoneError('Verification failed');
    }
    setPhoneBusy(false);
  };

  const removePhone = async () => {
    if (!currentUserId) return;
    setPhoneBusy(true);
    try {
      const res = await fetch('/api/pixelpit/phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove', userId: currentUserId }),
      });
      const data = await res.json();
      if (data.success) {
        setPhoneState('none');
        setPhoneInput('');
        setCodeInput('');
        setMaskedPhone('');
        window.PixelpitSocial?.showToast?.('Phone removed');
      }
    } catch {
      // silent
    }
    setPhoneBusy(false);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        zIndex: 200,
        padding: '60px 20px 20px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: colors.surface,
          borderRadius: 16,
          padding: '28px 28px',
          width: '100%',
          maxWidth: 380,
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 24,
        }}>
          <h3 style={{
            fontFamily,
            fontSize: 14,
            fontWeight: 600,
            color: colors.primary,
            letterSpacing: 2,
            margin: 0,
          }}>
            SETTINGS
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: colors.muted,
              fontSize: 20,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            &times;
          </button>
        </div>

        {/* Groups Section */}
        <label style={{
          fontFamily,
          fontSize: 11,
          color: colors.muted,
          letterSpacing: 1,
          display: 'block',
          marginBottom: 12,
        }}>
          YOUR GROUPS
        </label>

        {loading ? (
          <p style={{ fontFamily, fontSize: 12, color: colors.muted, textAlign: 'center', padding: '16px 0' }}>
            loading...
          </p>
        ) : groups.length === 0 ? (
          <p style={{ fontFamily, fontSize: 12, color: colors.muted, textAlign: 'center', padding: '16px 0' }}>
            No groups yet
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groups.map((group) => (
              <div
                key={group.id}
                style={{
                  padding: '12px 14px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {editingId === group.id ? (
                    <input
                      ref={editRef}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onBlur={saveEdit}
                      maxLength={50}
                      style={{
                        flex: 1,
                        background: colors.bg,
                        border: `1px solid ${colors.primary}66`,
                        borderRadius: 4,
                        padding: '4px 8px',
                        fontFamily,
                        fontSize: 12,
                        color: colors.text,
                        outline: 'none',
                        marginRight: 8,
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => { if (isOwner(group)) startEdit(group); }}
                      style={{
                        flex: 1,
                        fontFamily,
                        fontSize: 12,
                        color: colors.text,
                        cursor: isOwner(group) ? 'pointer' : 'default',
                        overflow: 'hidden',
                      }}
                    >
                      {group.name}
                      <span style={{
                        display: 'inline-block',
                        marginLeft: 8,
                        padding: '1px 5px',
                        background: group.type === 'streak' ? `${colors.primary}22` : `${colors.secondary}22`,
                        color: group.type === 'streak' ? colors.primary : colors.secondary,
                        borderRadius: 3,
                        fontSize: 9,
                        fontWeight: 600,
                        letterSpacing: 0.5,
                        verticalAlign: 'middle',
                      }}>
                        {group.type}
                      </span>
                      <span style={{ color: colors.muted, marginLeft: 8, fontSize: 10 }}>
                        {group.members.length}p
                      </span>
                    </div>
                  )}

                  {isOwner(group) && editingId !== group.id && confirmDeleteId !== group.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(group.id);
                      }}
                      style={{
                        background: 'none',
                        color: colors.muted,
                        border: 'none',
                        borderRadius: 4,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  )}
                </div>

                {confirmDeleteId === group.id && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    gap: 8,
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: `1px solid ${colors.error}33`,
                  }}>
                    <span style={{ fontFamily, fontSize: 11, color: colors.error, marginRight: 'auto' }}>
                      Delete this group?
                    </span>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      style={{
                        background: 'none',
                        color: colors.muted,
                        border: 'none',
                        borderRadius: 4,
                        padding: '6px 12px',
                        fontFamily,
                        fontSize: 11,
                        cursor: 'pointer',
                      }}
                    >
                      cancel
                    </button>
                    <button
                      onClick={() => doDelete(group.id)}
                      disabled={deleting}
                      style={{
                        background: colors.error,
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        padding: '6px 12px',
                        fontFamily,
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: deleting ? 'default' : 'pointer',
                        opacity: deleting ? 0.6 : 1,
                      }}
                    >
                      {deleting ? '...' : 'delete'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Phone Alerts Section */}
        {currentUserId && phoneState !== 'loading' && (
          <div style={{ marginTop: 24, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
            <label style={{
              fontFamily,
              fontSize: 11,
              color: colors.muted,
              letterSpacing: 1,
              display: 'block',
              marginBottom: 12,
            }}>
              PHONE ALERTS
            </label>

            {phoneState === 'none' && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="tel"
                  placeholder="Phone number"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendPhoneCode(); }}
                  style={{
                    flex: 1,
                    background: colors.bg,
                    border: `1px solid rgba(255,255,255,0.1)`,
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontFamily,
                    fontSize: 12,
                    color: colors.text,
                    outline: 'none',
                  }}
                />
                <button
                  onClick={sendPhoneCode}
                  disabled={phoneBusy || !phoneInput.trim()}
                  style={{
                    background: colors.primary,
                    color: colors.bg,
                    border: 'none',
                    borderRadius: 6,
                    padding: '8px 14px',
                    fontFamily,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: phoneBusy ? 'default' : 'pointer',
                    opacity: phoneBusy || !phoneInput.trim() ? 0.5 : 1,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {phoneBusy ? '...' : 'Send Code'}
                </button>
              </div>
            )}

            {phoneState === 'code-sent' && (
              <div>
                <p style={{ fontFamily, fontSize: 11, color: colors.muted, margin: '0 0 8px' }}>
                  Enter the 6-digit code we sent you
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="123456"
                    maxLength={6}
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    onKeyDown={(e) => { if (e.key === 'Enter') verifyPhoneCode(); }}
                    style={{
                      flex: 1,
                      background: colors.bg,
                      border: `1px solid rgba(255,255,255,0.1)`,
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontFamily,
                      fontSize: 14,
                      color: colors.text,
                      outline: 'none',
                      letterSpacing: 4,
                      textAlign: 'center',
                    }}
                  />
                  <button
                    onClick={verifyPhoneCode}
                    disabled={phoneBusy || codeInput.length !== 6}
                    style={{
                      background: colors.primary,
                      color: colors.bg,
                      border: 'none',
                      borderRadius: 6,
                      padding: '8px 14px',
                      fontFamily,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: phoneBusy ? 'default' : 'pointer',
                      opacity: phoneBusy || codeInput.length !== 6 ? 0.5 : 1,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {phoneBusy ? '...' : 'Verify'}
                  </button>
                </div>
                <button
                  onClick={() => { setPhoneState('none'); setCodeInput(''); setPhoneError(''); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: colors.muted,
                    fontFamily,
                    fontSize: 10,
                    cursor: 'pointer',
                    padding: '6px 0',
                    marginTop: 4,
                  }}
                >
                  cancel
                </button>
              </div>
            )}

            {phoneState === 'verified' && (
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: 8,
              }}>
                <span style={{ fontFamily, fontSize: 12, color: colors.text }}>
                  {maskedPhone}
                  <span style={{
                    display: 'inline-block',
                    marginLeft: 8,
                    padding: '1px 5px',
                    background: `${colors.secondary}22`,
                    color: colors.secondary,
                    borderRadius: 3,
                    fontSize: 9,
                    fontWeight: 600,
                  }}>
                    verified
                  </span>
                </span>
                <button
                  onClick={removePhone}
                  disabled={phoneBusy}
                  style={{
                    background: 'none',
                    color: colors.muted,
                    border: 'none',
                    fontFamily,
                    fontSize: 10,
                    cursor: 'pointer',
                    padding: '4px 8px',
                  }}
                >
                  remove
                </button>
              </div>
            )}

            {phoneError && (
              <p style={{ fontFamily, fontSize: 11, color: colors.error, margin: '8px 0 0' }}>
                {phoneError}
              </p>
            )}

            <p style={{ fontFamily, fontSize: 10, color: colors.muted, margin: '8px 0 0', opacity: 0.6 }}>
              Get notified when your streak group plays
            </p>
          </div>
        )}

        {/* Logout */}
        <div style={{ marginTop: 32, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 20 }}>
          <button
            onClick={() => {
              window.PixelpitSocial?.logout();
              window.location.reload();
            }}
            style={{
              width: '100%',
              padding: '12px 20px',
              background: 'transparent',
              color: colors.muted,
              border: `1px solid rgba(255,255,255,0.08)`,
              borderRadius: 8,
              fontFamily,
              fontSize: 11,
              cursor: 'pointer',
              letterSpacing: 1,
            }}
          >
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
