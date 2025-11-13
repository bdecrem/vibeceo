'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ErrorContent() {
  const searchParams = useSearchParams();
  const message = searchParams?.get('message') || 'Authorization failed';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
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
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>✗</div>
        <h1 style={{ fontSize: '32px', marginBottom: '16px', color: '#333' }}>
          Connection Failed
        </h1>
        <p style={{ fontSize: '18px', color: '#666', marginBottom: '32px' }}>
          {message}
        </p>
        <div style={{
          background: '#f8f9fa',
          padding: '24px',
          borderRadius: '8px',
          marginBottom: '24px',
          textAlign: 'left',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#333' }}>
            What you can do:
          </h3>
          <ul style={{ fontSize: '14px', color: '#666', lineHeight: '1.8', paddingLeft: '20px' }}>
            <li>Try sending <strong>GMAIL CONNECT</strong> again via SMS</li>
            <li>Make sure you authorize Gmail access when prompted</li>
            <li>Contact support if the issue persists</li>
          </ul>
        </div>
        <p style={{ fontSize: '14px', color: '#999' }}>
          You can close this window and return to SMS.
        </p>
      </div>
    </div>
  );
}

export default function GmailErrorPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ErrorContent />
    </Suspense>
  );
}
