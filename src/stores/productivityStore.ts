// ==============================================================================
// NEXORA PRODUCTIVITY STORE (Notes, Tasks, Reminders)
// ==============================================================================

import { create } from 'zustand';
import { Note, TaskItem } from '../types';
import { supabase, isConfigured } from '../services/supabase';

interface ProductivityState {
  notes: Note[];
  tasks: TaskItem[];
  searchQuery: string;
  selectedCategory: string;
  isLoading: boolean;

  // Notes
  addNote: (title: string, content: string, category?: string, color?: string) => Promise<void>;
  updateNote: (id: string, updates: Partial<Note>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePinNote: (id: string) => Promise<void>;

  // Tasks
  addTask: (title: string, category?: string, priority?: 'low' | 'medium' | 'high' | 'urgent', dueDate?: string) => Promise<void>;
  toggleTaskCompletion: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string) => void;
}

const INITIAL_NOTES: Note[] = [
  {
    id: 'note-1',
    userId: 'current',
    title: 'Nexora Architecture Roadmap',
    content: 'Review PostgreSQL RLS policies and ensure client-side AES-256-GCM encryption is running in hardware Keystore.',
    category: 'Architecture',
    color: '#6366F1',
    isPinned: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'note-2',
    userId: 'current',
    title: 'Creative Audio Ideas',
    content: 'Explore low-latency FFT audio visualization bars and dynamic theme glow reactive to music playback.',
    category: 'Creative',
    color: '#EC4899',
    isPinned: false,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

const INITIAL_TASKS: TaskItem[] = [
  {
    id: 'task-1',
    userId: 'current',
    title: 'Verify Supabase Row-Level Security',
    description: 'Run SQL migration and confirm anon role has zero read access on private buckets.',
    category: 'Security',
    priority: 'urgent',
    isCompleted: true,
    dueDate: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    userId: 'current',
    title: 'Test Offline Mini-Games',
    description: 'Ensure Snake, Sudoku, and Memory matching work completely without internet connection.',
    category: 'Development',
    priority: 'high',
    isCompleted: false,
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    userId: 'current',
    title: 'Configure Hardware Biometric Keystore',
    description: 'Test Face ID and Fingerprint fallback for zero-knowledge vault unlock.',
    category: 'Security',
    priority: 'medium',
    isCompleted: false,
    dueDate: new Date(Date.now() + 172800000).toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const useProductivityStore = create<ProductivityState>((set, get) => ({
  notes: INITIAL_NOTES,
  tasks: INITIAL_TASKS,
  searchQuery: '',
  selectedCategory: 'All',
  isLoading: false,

  addNote: async (title, content, category = 'General', color = '#6366F1') => {
    const newNote: Note = {
      id: 'note-' + Date.now(),
      userId: 'current',
      title,
      content,
      category,
      color,
      isPinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(state => ({ notes: [newNote, ...state.notes] }));

    if (isConfigured) {
      await supabase.from('notes').insert({
        id: newNote.id,
        title,
        content,
        category,
        color,
      });
    }
  },

  updateNote: async (id, updates) => {
    set(state => ({
      notes: state.notes.map(n => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n)),
    }));
    if (isConfigured) {
      await supabase.from('notes').update(updates).eq('id', id);
    }
  },

  deleteNote: async (id) => {
    set(state => ({ notes: state.notes.filter(n => n.id !== id) }));
    if (isConfigured) {
      await supabase.from('notes').delete().eq('id', id);
    }
  },

  togglePinNote: async (id) => {
    const note = get().notes.find(n => n.id === id);
    if (!note) return;
    const isPinned = !note.isPinned;
    set(state => ({
      notes: state.notes.map(n => (n.id === id ? { ...n, isPinned } : n)),
    }));
    if (isConfigured) {
      await supabase.from('notes').update({ is_pinned: isPinned }).eq('id', id);
    }
  },

  addTask: async (title, category = 'Personal', priority = 'medium', dueDate) => {
    const newTask: TaskItem = {
      id: 'task-' + Date.now(),
      userId: 'current',
      title,
      category,
      priority,
      isCompleted: false,
      dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set(state => ({ tasks: [newTask, ...state.tasks] }));

    if (isConfigured) {
      await supabase.from('tasks').insert({
        id: newTask.id,
        title,
        category,
        priority,
        due_date: dueDate,
      });
    }
  },

  toggleTaskCompletion: async (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    const isCompleted = !task.isCompleted;
    set(state => ({
      tasks: state.tasks.map(t => (t.id === id ? { ...t, isCompleted } : t)),
    }));
    if (isConfigured) {
      await supabase.from('tasks').update({ is_completed: isCompleted }).eq('id', id);
    }
  },

  deleteTask: async (id) => {
    set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    if (isConfigured) {
      await supabase.from('tasks').delete().eq('id', id);
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
}));

