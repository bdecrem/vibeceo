'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Agent {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  status: 'draft' | 'pending_review' | 'approved' | 'disabled';
  created_at: string;
  updated_at: string;
  latestVersion: {
    id: string;
    version: number;
    created_at: string;
  } | null;
  totalVersions: number;
}

export default function AgentsDashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'draft' | 'pending_review' | 'approved' | 'disabled'>('all');

  useEffect(() => {
    fetchAgents();
  }, [filter]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const url = filter === 'all'
        ? '/api/agents'
        : `/api/agents?status=${filter}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setAgents(data.agents);
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      alert('Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const deleteAgent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('Agent deleted successfully');
        fetchAgents();
      } else {
        alert('Failed to delete agent: ' + data.message);
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
      alert('Failed to delete agent');
    }
  };

  const updateAgentStatus = async (id: string, name: string, currentStatus: string, newStatus: string) => {
    const action = newStatus === 'approved' ? 'activate' : newStatus === 'disabled' ? 'disable' : newStatus === 'pending_review' ? 'submit for review' : 'set to draft';

    if (!confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/agents/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        alert(`Agent ${action}d successfully`);
        fetchAgents();
      } else {
        alert('Failed to update agent status: ' + data.message);
      }
    } catch (error) {
      console.error('Failed to update agent status:', error);
      alert('Failed to update agent status');
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending_review': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      case 'disabled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      research: '🔬',
      news: '📰',
      finance: '💰',
      crypto: '₿',
      health: '🏥',
      technology: '💻',
      recruiting: '👥',
      education: '📚',
      entertainment: '🎬',
      other: '📋',
    };
    return icons[category] || '📋';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Agent Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your intelligent agents</p>
          </div>
          <Link
            href="/agents/new"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Create New Agent
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-2">
            {['all', 'draft', 'pending_review', 'approved', 'disabled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status as any)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status === 'pending_review' ? 'Pending Review' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Agents List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <p className="text-gray-600 text-lg mb-4">No agents found</p>
            <Link
              href="/agents/new"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create your first agent →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getCategoryIcon(agent.category)}</span>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {agent.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                          agent.status
                        )}`}
                      >
                        {agent.status}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-3">{agent.description}</p>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Category: {agent.category}</span>
                      <span>•</span>
                      <span>Slug: {agent.slug}</span>
                      <span>•</span>
                      <span>Versions: {agent.totalVersions}</span>
                      {agent.latestVersion && (
                        <>
                          <span>•</span>
                          <span>Latest: v{agent.latestVersion.version}</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-2">
                      Updated: {new Date(agent.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/agents/new?edit=${agent.id}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Edit
                    </Link>

                    {/* Status Toggle Buttons */}
                    {agent.status === 'draft' && (
                      <button
                        onClick={() => updateAgentStatus(agent.id, agent.name, agent.status, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Activate
                      </button>
                    )}
                    {agent.status === 'approved' && (
                      <button
                        onClick={() => updateAgentStatus(agent.id, agent.name, agent.status, 'disabled')}
                        className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                      >
                        Disable
                      </button>
                    )}
                    {agent.status === 'disabled' && (
                      <button
                        onClick={() => updateAgentStatus(agent.id, agent.name, agent.status, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Enable
                      </button>
                    )}
                    {agent.status === 'pending_review' && (
                      <button
                        onClick={() => updateAgentStatus(agent.id, agent.name, agent.status, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                      >
                        Approve
                      </button>
                    )}

                    <button
                      onClick={() => deleteAgent(agent.id, agent.name)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                    >
                      Delete
                    </button>
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
