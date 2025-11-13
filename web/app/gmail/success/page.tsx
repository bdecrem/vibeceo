'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const email = searchParams?.get('email') || 'your Gmail account';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '48px',
        maxWidth: '500px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>✓</div>
        <h1 style={{ fontSize: '32px', marginBottom: '16px', color: '#333' }}>
          Gmail Connected!
        </h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '32px' }}>
          {email} is now linked to your kochi.to account.
        </p>
        <div style={{
          background: '#f8f9fa',
          padding: '24px',
          borderRadius: '8px',
          marginBottom: '24px',
          textAlign: 'left',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#333' }}>
            Try these commands:
          </h3>
          <ul style={{ fontSize: '14px', color: '#666', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li><strong>GMAIL SEARCH [query]</strong> - Search your emails</li>
            <li><strong>GMAIL STATUS</strong> - Check connection status</li>
            <li><strong>GMAIL DISCONNECT</strong> - Revoke access</li>
          </ul>
        </div>
        <p style={{ fontSize: '14px', color: '#999' }}>
          You can close this window and return to SMS.
        </p>
      </div>
    </div>
  );
}

export default function GmailSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
