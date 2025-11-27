/**
 * Workflow Builder Store (Zustand)
 * Manages workflow state for the n8n-style builder
 */

import { create } from 'zustand';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from 'reactflow';
import type { WorkflowNode, WorkflowEdge, WorkflowDefinition, WorkflowNodeType } from '../workflow-types';
import { getNodePaletteItem } from '../node-palette';

interface WorkflowStore {
  // Workflow metadata
  name: string;
  description: string;
  category: string;
  icon: string;
  commandKeyword: string;
  scheduleEnabled: boolean;
  scheduleCron: string;

  // Graph state
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];

  // Selected node for configuration
  selectedNodeId: string | null;

  // Actions
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setCategory: (category: string) => void;
  setIcon: (icon: string) => void;
  setCommandKeyword: (keyword: string) => void;
  setScheduleEnabled: (enabled: boolean) => void;
  setScheduleCron: (cron: string) => void;

  // Node operations
  addNode: (type: string, position: { x: number; y: number }) => void;
  updateNode: (id: string, data: Partial<any>) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;

  // Edge operations
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // Workflow operations
  loadWorkflow: (workflow: WorkflowDefinition) => void;
  loadFromAgentDefinition: (agentDef: any) => void;
  resetWorkflow: () => void;
  exportWorkflow: () => WorkflowDefinition;

  // Validation
  validate: () => { valid: boolean; errors: string[] };
}

let nodeIdCounter = 1;

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // Initial metadata
  name: 'Untitled Agent',
  description: '',
  category: 'news',
  icon: '🤖',
  commandKeyword: '',
  scheduleEnabled: false,
  scheduleCron: '0 9 * * *',

  // Initial graph state
  nodes: [],
  edges: [],
  selectedNodeId: null,

  // Metadata setters
  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setCategory: (category) => set({ category }),
  setIcon: (icon) => set({ icon }),
  setCommandKeyword: (keyword) => set({ commandKeyword: keyword }),
  setScheduleEnabled: (enabled) => set({ scheduleEnabled: enabled }),
  setScheduleCron: (cron) => set({ scheduleCron: cron }),

  // Node operations
  addNode: (type, position) => {
    const paletteItem = getNodePaletteItem(type);
    if (!paletteItem) return;

    const newNode: WorkflowNode = {
      id: `node_${nodeIdCounter++}`,
      type: type as WorkflowNodeType,
      position,
      data: {
        ...paletteItem.defaultData,
      } as any,
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      selectedNodeId: newNode.id,
    }));
  },

  updateNode: (id, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id
          ? {
              ...node,
              data: {
                ...node.data,
                ...data,
                configured: true, // Mark as configured when updated
              },
            }
          : node
      ),
    }));
  },

  deleteNode: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== id),
      edges: state.edges.filter((edge) => edge.source !== id && edge.target !== id),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    }));
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  // React Flow handlers
  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as WorkflowNode[],
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  onConnect: (connection) => {
    set((state) => ({
      edges: addEdge(connection, state.edges),
    }));
  },

  // Workflow operations
  loadWorkflow: (workflow) => {
    // Find the highest node ID number to update the counter
    const maxNodeId = workflow.nodes.reduce((max, node) => {
      const match = node.id.match(/node_(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);
    nodeIdCounter = maxNodeId + 1;

    set({
      name: workflow.name,
      description: workflow.description || '',
      category: workflow.category || 'news',
      icon: workflow.icon || '🤖',
      commandKeyword: workflow.metadata?.commandKeyword || '',
      scheduleEnabled: workflow.metadata?.schedule?.enabled || false,
      scheduleCron: workflow.metadata?.schedule?.cron || '0 9 * * *',
      nodes: workflow.nodes,
      edges: workflow.edges,
      selectedNodeId: null,
    });
  },

  loadFromAgentDefinition: (agentDef: any) => {
    // Convert agent definition back to workflow format using reverse converter
    const { agentDefinitionToWorkflow } = require('../workflow-converter');

    try {
      const workflow = agentDefinitionToWorkflow(agentDef);

      // Find the highest node ID number to update the counter
      const maxNodeId = workflow.nodes.reduce((max, node) => {
        const match = node.id.match(/node_(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          return num > max ? num : max;
        }
        return max;
      }, 0);
      nodeIdCounter = maxNodeId + 1;

      set({
        name: workflow.name,
        description: workflow.description || '',
        category: workflow.category || 'news',
        icon: workflow.icon || '🤖',
        commandKeyword: workflow.metadata?.commandKeyword || '',
        scheduleEnabled: workflow.metadata?.schedule?.enabled || false,
        scheduleCron: workflow.metadata?.schedule?.cron || '0 9 * * *',
        nodes: workflow.nodes,
        edges: workflow.edges,
        selectedNodeId: null,
      });

      console.log(`Agent definition loaded successfully with ${workflow.nodes.length} nodes and ${workflow.edges.length} edges`);
    } catch (error) {
      console.error('Failed to load agent definition:', error);

      // Fallback: Load metadata only
      nodeIdCounter = 1;
      set({
        name: agentDef.metadata.name,
        description: agentDef.metadata.description,
        category: agentDef.metadata.category,
        icon: agentDef.metadata.icon || '🤖',
        commandKeyword: agentDef.triggers?.commands?.[0]?.keyword || '',
        scheduleEnabled: agentDef.triggers?.schedule?.enabled || false,
        scheduleCron: agentDef.triggers?.schedule?.cron || '0 9 * * *',
        nodes: [],
        edges: [],
        selectedNodeId: null,
      });
    }
  },

  resetWorkflow: () => {
    set({
      name: 'Untitled Agent',
      description: '',
      category: 'news',
      icon: '🤖',
      commandKeyword: '',
      scheduleEnabled: false,
      scheduleCron: '0 9 * * *',
      nodes: [],
      edges: [],
      selectedNodeId: null,
    });
    nodeIdCounter = 1;
  },

  exportWorkflow: () => {
    const state = get();
    return {
      name: state.name,
      description: state.description,
      category: state.category,
      icon: state.icon,
      nodes: state.nodes,
      edges: state.edges,
      metadata: {
        commandKeyword: state.commandKeyword,
        schedule: {
          enabled: state.scheduleEnabled,
          cron: state.scheduleCron,
        },
      },
    };
  },

  // Validation
  validate: () => {
    const state = get();
    const errors: string[] = [];

    // Check for at least one source
    const sourceNodes = state.nodes.filter((n) => n.data.category === 'source');
    if (sourceNodes.length === 0) {
      errors.push('Workflow must have at least one source node');
    }

    // Check for at least one output
    const outputNodes = state.nodes.filter((n) => n.data.category === 'output');
    if (outputNodes.length === 0) {
      errors.push('Workflow must have at least one output node');
    }

    // Check all nodes are configured
    const unconfiguredNodes = state.nodes.filter((n) => !n.data.configured);
    if (unconfiguredNodes.length > 0) {
      errors.push(
        `${unconfiguredNodes.length} node(s) need configuration: ${unconfiguredNodes
          .map((n) => n.data.label)
          .join(', ')}`
      );
    }

    // Check workflow has connections
    if (state.edges.length === 0 && state.nodes.length > 1) {
      errors.push('Nodes must be connected');
    }

    // Check metadata
    if (!state.name || state.name === 'Untitled Agent') {
      errors.push('Agent must have a name');
    }

    if (!state.commandKeyword && state.scheduleEnabled === false) {
      errors.push('Agent must have either a command keyword or schedule');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
}));
