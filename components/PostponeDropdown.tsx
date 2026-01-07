'use client';

import { useState, useRef, useEffect } from 'react';

interface PostponeDropdownProps {
  itemId: string;
  postponeCount: number;
  onPostpone: (itemId: string, days: number) => Promise<{ needsConfirmation?: boolean }>;
  onRequestConfirmation: (itemId: string) => void;
}

const postponeOptions = [
  { days: 1, label: '+1 day' },
  { days: 2, label: '+2 days' },
  { days: 3, label: '+3 days' },
  { days: 7, label: '+1 week' },
  { days: 14, label: '+2 weeks' },
  { days: 30, label: '+1 month' },
];

export default function PostponeDropdown({
  itemId,
  postponeCount,
  onPostpone,
  onRequestConfirmation,
}: PostponeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePostpone = async (days: number) => {
    setIsLoading(true);
    try {
      const result = await onPostpone(itemId, days);
      if (result.needsConfirmation) {
        onRequestConfirmation(itemId);
      }
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className={`text-xs px-2 py-1 rounded transition-colors ${
          postponeCount >= 3
            ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        title="Postpone task"
      >
        {isLoading ? (
          <span className="flex items-center gap-1">
            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </span>
        ) : (
          <>
            ⏰ Postpone
            {postponeCount > 0 && (
              <span className={`ml-1 px-1 rounded text-xs ${
                postponeCount >= 3 ? 'bg-orange-200' : 'bg-gray-200'
              }`}>
                {postponeCount}
              </span>
            )}
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          {postponeOptions.map((option) => (
            <button
              key={option.days}
              onClick={() => handlePostpone(option.days)}
              className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
