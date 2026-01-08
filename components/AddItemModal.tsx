'use client';

import { useState, useEffect } from 'react';

type AddMode = 'task' | 'project';

interface AddItemModalProps {
  isOpen: boolean;
  mode: AddMode;
  defaultProject?: string | null;
  defaultToToday?: boolean;
  onClose: () => void;
  onAdd: () => void;
}

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AddItemModal({
  isOpen,
  mode,
  defaultProject,
  defaultToToday = false,
  onClose,
  onAdd,
}: AddItemModalProps) {
  const [title, setTitle] = useState('');
  
  const [hasDeadline, setHasDeadline] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [canDoAnytime, setCanDoAnytime] = useState(false);
  const [project, setProject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setHasDeadline(defaultToToday);
      setDueDate(defaultToToday ? getTodayString() : '');
      setCanDoAnytime(false);
      setProject(defaultProject || '');
    }
  }, [isOpen, defaultProject, defaultToToday]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      if (mode === 'task') {
        await fetch('/api/todos/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title.trim(),
            hasDeadline,
            dueDate: hasDeadline && dueDate ? dueDate : null,
            canDoAnytime,
            project: project.trim() || null,
          }),
        });
      } else {
        // For project mode, create a task with the project name
        await fetch('/api/todos/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Set up ${title.trim()}`,
            project: title.trim(),

            status: 'inbox',
          }),
        });
      }
      onAdd();
      onClose();
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {mode === 'task' ? 'Add Task' : 'Add Project'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {mode === 'task' ? 'Task' : 'Project Name'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder={mode === 'task' ? 'What needs to be done?' : 'Project name'}
              autoFocus
            />
          </div>

          {mode === 'task' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Does this have a deadline?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHasDeadline(true)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      hasDeadline
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => { setHasDeadline(false); setDueDate(''); }}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      !hasDeadline
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>

              {hasDeadline && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              )}

              {!hasDeadline && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Can this be done anytime?
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCanDoAnytime(true)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        canDoAnytime
                          ? 'bg-green-100 text-green-700 border-2 border-green-300'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      Yes (Optional)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCanDoAnytime(false)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                        !canDoAnytime
                          ? 'bg-orange-100 text-orange-700 border-2 border-orange-300'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      No (Inbox)
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {canDoAnytime
                      ? 'Task will go to Optional tab'
                      : 'Task will go to Inbox for clarification'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project (optional)
                </label>
                <input
                  type="text"
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Assign to project"
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="flex-1 py-2 px-4 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
