/**
 * Workflow Node Component
 * Professional n8n-style node design
 */

'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';
import type { WorkflowNodeData } from '@/lib/workflow-types';
import { useWorkflowStore } from '@/lib/stores/workflow-store';
import { X, Rss, Globe, Database, Book, Filter, Calendar, Search, Hash, Sparkles, Target, HelpCircle, Cpu, MessageSquare, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CATEGORY_COLORS = {
  source: {
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    badge: 'bg-blue-100 text-blue-700',
  },
  filter: {
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    badge: 'bg-purple-100 text-purple-700',
  },
  transform: {
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  output: {
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    badge: 'bg-orange-100 text-orange-700',
  },
};

export const WorkflowNode = memo(({ id, data, selected, type }: NodeProps<WorkflowNodeData>) => {
  const { selectNode, deleteNode } = useWorkflowStore();

  // Defensive check: fallback to gray colors if category is invalid
  const colors = CATEGORY_COLORS[data.category as keyof typeof CATEGORY_COLORS];

  if (!colors) {
    console.warn(`[WorkflowNode] Invalid or missing category for node type "${type}". Data:`, data);
  }

  const finalColors = colors || {
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-700',
  };

  const handleClick = () => {
    selectNode(id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id);
  };

  const Icon = getNodeIcon(type || '');

  return (
    <div
      onClick={handleClick}
      className={`
        group relative bg-white rounded-lg border-2 shadow-sm cursor-pointer
        transition-all duration-200 min-w-[220px] max-w-[220px]
        hover:shadow-md
        ${selected ? 'ring-2 ring-blue-500 border-blue-500' : finalColors.border}
        ${!data.configured ? 'opacity-80' : ''}
      `}
    >
      {/* Input Handle (not for source nodes) */}
      {data.category !== 'source' && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white hover:!bg-blue-500 !transition-colors"
        />
      )}

      {/* Node Header */}
      <div className="p-3 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          {/* Icon */}
          <div className={`p-1.5 rounded ${finalColors.iconBg}`}>
            <Icon className={`w-4 h-4 ${finalColors.iconColor}`} />
          </div>

          {/* Title */}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">{data.label}</div>
          </div>

          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-slate-100 rounded"
          >
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Node Body */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={`text-xs ${finalColors.badge} border-0`}>
            {data.category}
          </Badge>
          {!data.configured && (
            <span className="text-xs text-amber-600">⚠ Configure</span>
          )}
        </div>
      </div>

      {/* Output Handle (not for output nodes) */}
      {data.category !== 'output' && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white hover:!bg-blue-500 !transition-colors"
        />
      )}
    </div>
  );
});

WorkflowNode.displayName = 'WorkflowNode';

function getNodeIcon(type: string) {
  switch (type) {
    case 'rss_source':
      return Rss;
    case 'http_json_source':
      return Globe;
    case 'web_scraper_source':
      return Globe;
    case 'user_source':
      return Database;
    case 'arxiv_source':
      return Book;
    case 'dedupe_filter':
      return Filter;
    case 'date_filter':
      return Calendar;
    case 'keyword_filter':
      return Search;
    case 'limit_filter':
      return Hash;
    case 'llm_summarize':
      return Sparkles;
    case 'llm_extract':
      return Target;
    case 'llm_qa':
      return HelpCircle;
    case 'llm_custom':
      return Cpu;
    case 'sms_output':
      return MessageSquare;
    case 'report_output':
      return FileText;
    default:
      return Cpu;
  }
}
