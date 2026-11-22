// ==============================================================================
// NEXORA PRODUCTIVITY SUITE SCREEN
// Notes with pinning & categories, To-do task completion tracking with priorities
// ==============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useThemeStore } from '../stores/themeStore';
import { useProductivityStore } from '../stores/productivityStore';

export default function NotesTasksScreen() {
  const router = useRouter();
  const { theme } = useThemeStore();
  const {
    notes,
    tasks,
    addNote,
    deleteNote,
    togglePinNote,
    addTask,
    toggleTaskCompletion,
    deleteTask,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  } = useProductivityStore();

  const [activeSection, setActiveSection] = useState<'notes' | 'tasks'>('tasks');
  const [modalType, setModalType] = useState<'note' | 'task' | null>(null);

  // New Note State
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('General');

  // New Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('Personal');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');

  const categories = ['All', 'General', 'Architecture', 'Creative', 'Personal', 'Security', 'Development'];

  const filteredNotes = notes.filter(n => {
    const matchCat = selectedCategory === 'All' || n.category === selectedCategory;
    const matchQuery =
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQuery;
  });

  const filteredTasks = tasks.filter(t => {
    const matchCat = selectedCategory === 'All' || t.category === selectedCategory;
    const matchQuery =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchCat && matchQuery;
  });

  const handleSaveNote = async () => {
    if (newNoteTitle.trim()) {
      await addNote(newNoteTitle.trim(), newNoteContent.trim(), newNoteCategory);
      setNewNoteTitle('');
      setNewNoteContent('');
      setModalType(null);
    }
  };

  const handleSaveTask = async () => {
    if (newTaskTitle.trim()) {
      await addTask(newTaskTitle.trim(), newTaskCategory, newTaskPriority);
      setNewTaskTitle('');
      setModalType(null);
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return theme.danger;
      case 'high': return theme.warning;
      case 'medium': return theme.primary;
      default: return theme.textSubtle;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface }]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={[styles.headerSubtitle, { color: theme.textMuted }]}>WORKFLOW & FOCUS</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>PRODUCTIVITY</Text>
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            onPress={() => setModalType(activeSection === 'notes' ? 'note' : 'task')}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textSubtle} />
          <TextInput
            placeholder="Search notes and tasks..."
            placeholderTextColor={theme.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.text }]}
          />
        </View>

        {/* Section Tabs */}
        <View style={styles.sectionTabs}>
          <TouchableOpacity
            style={[
              styles.secTab,
              { borderBottomColor: activeSection === 'tasks' ? theme.primary : 'transparent' },
            ]}
            onPress={() => setActiveSection('tasks')}
          >
            <Text
              style={[
                styles.secTabLabel,
                { color: activeSection === 'tasks' ? theme.primary : theme.textMuted },
              ]}
            >
              Tasks ({tasks.filter(t => !t.isCompleted).length} pending)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secTab,
              { borderBottomColor: activeSection === 'notes' ? theme.primary : 'transparent' },
            ]}
            onPress={() => setActiveSection('notes')}
          >
            <Text
              style={[
                styles.secTabLabel,
                { color: activeSection === 'notes' ? theme.primary : theme.textMuted },
              ]}
            >
              Notes ({notes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScroll}>
          {categories.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.catPillText,
                    { color: isSelected ? '#FFF' : theme.textMuted },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeSection === 'tasks' ? (
          <View style={styles.tasksList}>
            {filteredTasks.map(task => (
              <View
                key={task.id}
                style={[
                  styles.taskCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: task.isCompleted ? theme.border : getPriorityColor(task.priority),
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => toggleTaskCompletion(task.id)}
                >
                  <Ionicons
                    name={task.isCompleted ? 'checkbox' : 'square-outline'}
                    size={24}
                    color={task.isCompleted ? theme.success : theme.primary}
                  />
                </TouchableOpacity>

                <View style={styles.taskMeta}>
                  <Text
                    style={[
                      styles.taskTitle,
                      {
                        color: task.isCompleted ? theme.textSubtle : theme.text,
                        textDecorationLine: task.isCompleted ? 'line-through' : 'none',
                      },
                    ]}
                  >
                    {task.title}
                  </Text>
                  {task.description ? (
                    <Text style={[styles.taskDesc, { color: theme.textMuted }]}>
                      {task.description}
                    </Text>
                  ) : null}

                  <View style={styles.taskBadgesRow}>
                    <View style={[styles.badgePill, { backgroundColor: theme.surface }]}>
                      <Text style={[styles.badgePillText, { color: theme.textSubtle }]}>
                        {task.category}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.badgePill,
                        { backgroundColor: getPriorityColor(task.priority) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgePillText,
                          { color: getPriorityColor(task.priority) },
                        ]}
                      >
                        {task.priority.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => deleteTask(task.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={theme.danger} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.notesGrid}>
            {filteredNotes.map(note => (
              <View
                key={note.id}
                style={[
                  styles.noteCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: note.isPinned ? theme.primary : theme.border,
                  },
                ]}
              >
                <View style={styles.noteTopRow}>
                  <View style={[styles.noteCatBadge, { backgroundColor: theme.surface }]}>
                    <Text style={[styles.noteCatText, { color: theme.primary }]}>
                      {note.category}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => togglePinNote(note.id)}>
                    <Ionicons
                      name={note.isPinned ? 'pin' : 'pin-outline'}
                      size={18}
                      color={note.isPinned ? theme.primary : theme.textSubtle}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.noteTitle, { color: theme.text }]}>{note.title}</Text>
                <Text style={[styles.noteContent, { color: theme.textMuted }]} numberOfLines={4}>
                  {note.content}
                </Text>

                <View style={styles.noteFooter}>
                  <Text style={[styles.noteDate, { color: theme.textSubtle }]}>
                    {new Date(note.createdAt).toLocaleDateString()}
                  </Text>
                  <TouchableOpacity onPress={() => deleteNote(note.id)}>
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Add Task/Note Modal */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                {modalType === 'note' ? 'CREATE NOTE' : 'NEW TO-DO TASK'}
              </Text>
              <TouchableOpacity onPress={() => setModalType(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={22} color={theme.textSubtle} />
              </TouchableOpacity>
            </View>

            {modalType === 'note' ? (
              <>
                <TextInput
                  placeholder="Note Title"
                  placeholderTextColor={theme.textSubtle}
                  value={newNoteTitle}
                  onChangeText={setNewNoteTitle}
                  style={[styles.modalInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                />
                <TextInput
                  placeholder="Note details, ideas, code snippets..."
                  placeholderTextColor={theme.textSubtle}
                  value={newNoteContent}
                  onChangeText={setNewNoteContent}
                  multiline
                  numberOfLines={4}
                  style={[
                    styles.modalInput,
                    { color: theme.text, backgroundColor: theme.card, borderColor: theme.border, height: 100 },
                  ]}
                />
                <TextInput
                  placeholder="Category (e.g. Architecture, Creative)"
                  placeholderTextColor={theme.textSubtle}
                  value={newNoteCategory}
                  onChangeText={setNewNoteCategory}
                  style={[styles.modalInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                />
              </>
            ) : (
              <>
                <TextInput
                  placeholder="Task Description / Objective"
                  placeholderTextColor={theme.textSubtle}
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  style={[styles.modalInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                />
                <TextInput
                  placeholder="Category (e.g. Security, Personal)"
                  placeholderTextColor={theme.textSubtle}
                  value={newTaskCategory}
                  onChangeText={setNewTaskCategory}
                  style={[styles.modalInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
                />
                <View style={styles.priorityRow}>
                  {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityPill,
                        {
                          backgroundColor: newTaskPriority === p ? getPriorityColor(p) : theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setNewTaskPriority(p)}
                    >
                      <Text
                        style={[
                          styles.priorityPillText,
                          { color: newTaskPriority === p ? '#FFF' : theme.textMuted },
                        ]}
                      >
                        {p.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalType(null)}>
                <Text style={{ color: theme.textMuted, fontWeight: '700' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
                onPress={modalType === 'note' ? handleSaveNote : handleSaveTask}
              >
                <Text style={{ color: '#FFF', fontWeight: '800' }}>SAVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtn: {
    padding: 6,
  },
  headerTitleBox: {
    alignItems: 'center',
  },
  headerSubtitle: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  sectionTabs: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 8,
  },
  secTab: {
    paddingVertical: 8,
    borderBottomWidth: 3,
  },
  secTabLabel: {
    fontSize: 13,
    fontWeight: '800',
  },
  catScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  tasksList: {
    gap: 10,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  checkbox: {
    paddingRight: 10,
    paddingTop: 2,
  },
  taskMeta: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  taskDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  taskBadgesRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  badgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgePillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  deleteBtn: {
    padding: 4,
  },
  notesGrid: {
    gap: 12,
  },
  noteCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  noteTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteCatBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  noteCatText: {
    fontSize: 10,
    fontWeight: '800',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 6,
  },
  noteContent: {
    fontSize: 13,
    lineHeight: 19,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  noteDate: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 16,
    letterSpacing: 1,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  priorityPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalConfirm: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
});

