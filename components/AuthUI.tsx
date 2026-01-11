'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function AuthUI() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="text-sm text-theme-text-secondary">
        Loading...
      </div>
    );
  }

  if (!user) {
    return null; // Middleware will redirect to login
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-theme-text-secondary truncate max-w-[150px]" title={user.email ?? undefined}>
        {user.email}
      </span>
      <button
        onClick={handleSignOut}
        className="text-sm px-3 py-1 border border-theme-border-secondary rounded hover:bg-theme-bg-hover transition-colors text-theme-text-primary"
      >
        Sign out
      </button>
    </div>
  );
}
