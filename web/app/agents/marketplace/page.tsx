'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  is_featured: boolean;
  is_paid: boolean;
  isSubscribed?: boolean;
  current_version?: {
    version: number;
    created_at: string;
  };
}

interface Subscriber {
  id: string;
  phone_number: string;
  slug: string;
  email: string;
  role: string;
}

export default function AgentMarketplacePage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Verify magic link and load data
  useEffect(() => {
    if (!token) {
      setError('Missing authentication token. Please request a new link via SMS.');
      setLoading(false);
      return;
    }

    async function verifyAndLoad() {
      try {
        // Verify magic link token
        const verifyRes = await fetch(`/api/agents/verify-magic-link?token=${token}`);
        if (!verifyRes.ok) {
          throw new Error('Invalid or expired link');
        }

        const verifyData = await verifyRes.json();
        if (!verifyData.success) {
          throw new Error('Failed to verify link');
        }

        setSubscriber(verifyData.subscriber);

        // Load agents
        const agentsRes = await fetch(
          `/api/agents/marketplace?phone_number=${verifyData.subscriber.phone_number}`
        );
        if (!agentsRes.ok) {
          throw new Error('Failed to load agents');
        }

        const agentsData = await agentsRes.json();
        setAgents(agentsData.agents || []);
        setLoading(false);
      } catch (err: any) {
        console.error('Error:', err);
        setError(err.message || 'Failed to load marketplace');
        setLoading(false);
      }
    }

    verifyAndLoad();
  }, [token]);

  const handleSubscribe = async (agentId: string) => {
    if (!subscriber) return;

    try {
      const res = await fetch('/api/agents/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          phone_number: subscriber.phone_number
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to subscribe');
      }

      // Update local state
      setAgents(agents.map(a =>
        a.id === agentId ? { ...a, isSubscribed: true } : a
      ));

      alert('Successfully subscribed! You\'ll receive updates from this agent.');
    } catch (err: any) {
      alert(err.message || 'Failed to subscribe');
    }
  };

  const handleUnsubscribe = async (agentId: string) => {
    if (!subscriber) return;

    try {
      const res = await fetch('/api/agents/subscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          phone_number: subscriber.phone_number
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to unsubscribe');
      }

      // Update local state
      setAgents(agents.map(a =>
        a.id === agentId ? { ...a, isSubscribed: false } : a
      ));

      alert('Successfully unsubscribed.');
    } catch (err: any) {
      alert(err.message || 'Failed to unsubscribe');
    }
  };

  const categories = ['all', ...Array.from(new Set(agents.map(a => a.category).filter(Boolean)))];
  const filteredAgents = selectedCategory === 'all'
    ? agents
    : agents.filter(a => a.category === selectedCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading marketplace...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Failed</h1>
          <p className="text-white/80 mb-6">{error}</p>
          <p className="text-white/60 text-sm">
            Text AGENTS to get a new link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-white/5 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                🤖 Agent Marketplace
              </h1>
              <p className="text-white/60 mt-1">
                Welcome, @{subscriber?.slug}
              </p>
            </div>
            <Link
              href={`/agents/new?token=${token}`}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
            >
              Create Agent
            </Link>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-2 flex-wrap">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {cat === 'all' ? 'All' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Agents Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {filteredAgents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-white mb-2">No agents found</h2>
            <p className="text-white/60">
              {selectedCategory === 'all'
                ? 'No agents are available yet. Be the first to create one!'
                : `No agents in the ${selectedCategory} category.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map(agent => (
              <div
                key={agent.id}
                className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden border border-white/20 hover:border-purple-400 transition-all"
              >
                <div className="p-6">
                  {/* Featured badge */}
                  {agent.is_featured && (
                    <div className="inline-block px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full text-xs font-medium mb-3">
                      ⭐ Featured
                    </div>
                  )}

                  {/* Agent name */}
                  <h3 className="text-xl font-bold text-white mb-2">
                    {agent.name}
                  </h3>

                  {/* Category */}
                  {agent.category && (
                    <div className="inline-block px-2 py-1 bg-purple-500/20 text-purple-300 rounded text-xs font-medium mb-3">
                      {agent.category}
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-white/70 text-sm mb-4 line-clamp-3">
                    {agent.description || 'No description provided.'}
                  </p>

                  {/* Version info */}
                  {agent.current_version && (
                    <p className="text-white/40 text-xs mb-4">
                      v{agent.current_version.version} •{' '}
                      {new Date(agent.current_version.created_at).toLocaleDateString()}
                    </p>
                  )}

                  {/* Paid badge */}
                  {agent.is_paid && (
                    <div className="inline-block px-2 py-1 bg-green-500/20 text-green-300 rounded text-xs font-medium mb-4">
                      💳 Paid
                    </div>
                  )}

                  {/* Subscribe button */}
                  <div className="flex gap-2">
                    {agent.isSubscribed ? (
                      <>
                        <button
                          onClick={() => handleUnsubscribe(agent.id)}
                          className="flex-1 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg font-medium transition-colors border border-red-500/30"
                        >
                          Unsubscribe
                        </button>
                        <div className="flex items-center px-3 text-green-400 text-sm">
                          ✓ Subscribed
                        </div>
                      </>
                    ) : (
                      <button
                        onClick={() => handleSubscribe(agent.id)}
                        className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Subscribe
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
