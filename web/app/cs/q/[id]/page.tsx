'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface WaitlistEntry {
  id: string;
  phone: string;
  name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  requested_at: string;
}

export default function WaitlistApprovePage() {
  const params = useParams();
  const id = params?.id as string;

  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    async function fetchEntry() {
      const { data, error } = await supabase
        .from('cs_waitlist')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        setError('Request not found');
      } else {
        setEntry(data as WaitlistEntry);
        if (data.status === 'approved') {
          setApproved(true);
        }
      }
      setLoading(false);
    }

    if (id) fetchEntry();
  }, [id]);

  const handleApprove = async () => {
    if (!entry) return;
    setApproving(true);

    try {
      const res = await fetch('/api/cs/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      });

      if (res.ok) {
        setApproved(true);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to approve');
      }
    } catch {
      setError('Failed to approve');
    }
    setApproving(false);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.text}>Loading...</p>
      </div>
    );
  }

  if (error && !entry) {
    return (
      <div style={styles.container}>
        <p style={styles.text}>{error}</p>
      </div>
    );
  }

  if (!entry) return null;

  const displayName = entry.name || 'Anonymous';
  const requestDate = new Date(entry.requested_at).toLocaleString();

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>CS Invite Request</h1>

        <div style={styles.field}>
          <span style={styles.label}>Name:</span>
          <span style={styles.value}>{displayName}</span>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Phone:</span>
          <span style={styles.value}>{entry.phone}</span>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Requested:</span>
          <span style={styles.value}>{requestDate}</span>
        </div>

        <div style={styles.field}>
          <span style={styles.label}>Status:</span>
          <span style={{
            ...styles.value,
            color: approved ? '#4ade80' : entry.status === 'rejected' ? '#f87171' : '#fbbf24'
          }}>
            {approved ? 'Approved ✓' : entry.status}
          </span>
        </div>

        {!approved && entry.status === 'pending' && (
          <button
            onClick={handleApprove}
            disabled={approving}
            style={styles.button}
          >
            {approving ? 'Approving...' : 'Approve'}
          </button>
        )}

        {error && <p style={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#000',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    backgroundColor: '#111',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    color: '#fff',
    fontSize: '24px',
    marginBottom: '24px',
    fontWeight: 600,
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    color: '#888',
    fontSize: '14px',
    display: 'block',
    marginBottom: '4px',
  },
  value: {
    color: '#fff',
    fontSize: '18px',
  },
  button: {
    marginTop: '24px',
    width: '100%',
    padding: '12px',
    backgroundColor: '#4ade80',
    color: '#000',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    color: '#f87171',
    marginTop: '16px',
    fontSize: '14px',
  },
  text: {
    color: '#888',
  },
};
