'use client';

import { useState } from 'react';

export default function RivalAlertLanding() {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [competitors, setCompetitors] = useState(['', '', '']);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateCompetitor = (index: number, value: string) => {
    const newCompetitors = [...competitors];
    newCompetitors[index] = value;
    setCompetitors(newCompetitors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Need at least one competitor URL
    const validCompetitors = competitors.filter(c => c.trim());
    if (validCompetitors.length === 0) {
      setError('Please enter at least one competitor URL');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/rivalalert/trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          companyName: companyName.trim() || undefined,
          competitors: validCompetitors,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
      } else {
        const data = await response.json();
        setError(data.error || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔔</span>
          <span className="text-xl font-bold text-orange-400">RivalAlert</span>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Get alerted when your{' '}
            <span className="text-orange-400">rivals</span> move
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-8">
            Stop manually checking competitor websites. We monitor pricing,
            features, and job postings—and tell you when something changes.
          </p>

          {/* Pricing Preview */}
          <div className="inline-flex items-center gap-2 bg-gray-800/50 border border-gray-700 rounded-full px-4 py-2 mb-8">
            <span className="text-green-400 font-semibold">30 days free</span>
            <span className="text-gray-400">then</span>
            <span className="text-green-400 font-semibold">$29/mo</span>
            <span className="text-gray-400">for 3 competitors</span>
          </div>

          {/* CTA Form */}
          {!submitted ? (
            <form onSubmit={handleSubmit} className="max-w-lg mx-auto">
              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                  required
                />
                <input
                  type="text"
                  placeholder="Your company name (e.g., Acme Inc)"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:border-orange-400"
                />
                <div className="space-y-2">
                  <p className="text-sm text-gray-400 text-left">Competitor URLs to monitor:</p>
                  {competitors.map((comp, i) => (
                    <input
                      key={i}
                      type="url"
                      placeholder={`https://competitor${i + 1}.com`}
                      value={comp}
                      onChange={(e) => updateCompetitor(i, e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-white/10 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 text-sm"
                    />
                  ))}
                </div>
                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Starting trial...' : 'Start Free Trial'}
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-3">
                Get your first report instantly. No credit card required.
              </p>
            </form>
          ) : (
            <div className="max-w-md mx-auto bg-green-500/20 border border-green-500/50 rounded-lg p-6">
              <p className="text-green-400 font-semibold text-lg mb-2">
                Your trial has started!
              </p>
              <p className="text-gray-300">
                Check your email — your first competitor report is on the way.
                You&apos;ll get daily updates for the next 30 days.
              </p>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto mt-24">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-semibold mb-2">Pricing Changes</h3>
            <p className="text-gray-400">
              Know instantly when competitors raise or lower prices. Never be
              caught off guard.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="text-4xl mb-4">✨</div>
            <h3 className="text-lg font-semibold mb-2">Feature Updates</h3>
            <p className="text-gray-400">
              Track new features and messaging changes. See what they&apos;re
              building before customers do.
            </p>
          </div>

          <div className="text-center p-6">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold mb-2">Hiring Signals</h3>
            <p className="text-gray-400">
              Monitor job postings to predict their roadmap. ML engineers? AI
              features incoming.
            </p>
          </div>
        </div>

        {/* How it Works */}
        <div className="max-w-3xl mx-auto mt-24">
          <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>

          <div className="space-y-8">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Add your competitors</h3>
                <p className="text-gray-400">
                  Enter the URLs of up to 10 competitor websites you want to
                  track.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">We monitor daily</h3>
                <p className="text-gray-400">
                  Our AI scans their websites every day, detecting changes in
                  pricing, features, and hiring.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Get alerted</h3>
                <p className="text-gray-400">
                  Receive a daily digest email with any changes, plus AI
                  analysis explaining what it means.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof / Comparison */}
        <div className="max-w-3xl mx-auto mt-24 text-center">
          <h2 className="text-2xl font-bold mb-8">
            Enterprise intelligence, startup pricing
          </h2>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-8">
            <div className="grid md:grid-cols-3 gap-6 text-left">
              <div className="border-r border-gray-700 pr-6">
                <p className="text-gray-400 text-sm mb-2">Enterprise tools</p>
                <p className="text-2xl font-bold text-red-400">$1,000+/mo</p>
                <p className="text-sm text-gray-500">Klue, Crayon, etc.</p>
              </div>
              <div className="border-r border-gray-700 pr-6">
                <p className="text-gray-400 text-sm mb-2">Per-competitor tools</p>
                <p className="text-2xl font-bold text-yellow-400">$20/competitor</p>
                <p className="text-sm text-gray-500">Adds up fast</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm mb-2">RivalAlert</p>
                <p className="text-2xl font-bold text-green-400">$29-49/mo</p>
                <p className="text-sm text-gray-500">Flat rate, up to 10</p>
              </div>
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="max-w-xl mx-auto mt-24 text-center">
          <h2 className="text-2xl font-bold mb-4">
            Stop checking manually. Start getting alerts.
          </h2>
          <p className="text-gray-400 mb-6">
            Start your 30-day free trial — no credit card required.
          </p>

          {!submitted ? (
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-block px-8 py-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
            >
              Start Free Trial
            </a>
          ) : (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-green-400 font-semibold">
                Your trial is active! Check your email.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔔</span>
            <span className="font-bold text-orange-400">RivalAlert</span>
          </div>
          <p className="text-gray-500 text-sm">
            A{' '}
            <a
              href="https://tokentank.io"
              className="text-gray-400 hover:text-white"
            >
              Token Tank
            </a>{' '}
            experiment
          </p>
        </div>
      </footer>
    </div>
  );
}
