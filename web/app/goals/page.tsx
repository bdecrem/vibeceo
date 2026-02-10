'use client';

import { useEffect, useState } from 'react';

interface GoalItem {
  name: string;
  completed: boolean;
}

interface Goal {
  id: string;
  week: string;
  title: string;
  items: GoalItem[];
  completed: boolean;
  created_at: string;
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Calculate current ISO week
    const now = new Date();
    const year = now.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const days = Math.floor((now.getTime() - oneJan.getTime()) / 86400000);
    const weekNum = Math.ceil((days + oneJan.getDay() + 1) / 7);
    const week = `${year}-W${String(weekNum).padStart(2, '0')}`;
    setCurrentWeek(week);

    // Fetch goals
    fetch(`/api/goals?week=${week}`)
      .then(res => res.json())
      .then(data => {
        setGoals(data.goals || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleItem = async (goalId: string, itemIndex: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newItems = [...goal.items];
    newItems[itemIndex] = { ...newItems[itemIndex], completed: !newItems[itemIndex].completed };

    // Optimistic update
    setGoals(goals.map(g => g.id === goalId ? { ...g, items: newItems } : g));

    // Persist
    await fetch('/api/goals', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: goalId, items: newItems }),
    });
  };

  const getWeekDateRange = (week: string) => {
    const [year, w] = week.split('-W').map(Number);
    const jan1 = new Date(year, 0, 1);
    const days = (w - 1) * 7 - jan1.getDay() + 1;
    const start = new Date(year, 0, days + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const completedCount = (goal: Goal) => goal.items.filter(i => i.completed).length;
  const totalProgress = goals.length > 0 
    ? goals.reduce((acc, g) => acc + completedCount(g), 0) / goals.reduce((acc, g) => acc + g.items.length, 0) * 100
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-zinc-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Weekly Goals</h1>
          <p className="text-zinc-500 font-mono text-sm">
            {currentWeek} · {getWeekDateRange(currentWeek)}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-zinc-400">Progress</span>
            <span className="text-zinc-400">{Math.round(totalProgress)}%</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
        </div>

        {/* Goals */}
        <div className="space-y-6">
          {goals.map(goal => (
            <div 
              key={goal.id} 
              className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{goal.title}</h2>
                <span className="text-sm text-zinc-500 font-mono">
                  {completedCount(goal)}/{goal.items.length}
                </span>
              </div>
              <div className="space-y-2">
                {goal.items.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleItem(goal.id, idx)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left
                      ${item.completed 
                        ? 'bg-emerald-500/10 border border-emerald-500/20' 
                        : 'bg-zinc-800/50 border border-zinc-700/50 hover:border-zinc-600'
                      }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                      ${item.completed 
                        ? 'bg-emerald-500 border-emerald-500' 
                        : 'border-zinc-600'
                      }`}
                    >
                      {item.completed && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={item.completed ? 'text-zinc-400 line-through' : 'text-white'}>
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {goals.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            No goals for this week yet.<br />
            Chat with Mave to add some!
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-zinc-800 text-center text-zinc-600 text-sm">
          Chat with Mave to add or update goals
        </div>
      </div>
    </div>
  );
}
