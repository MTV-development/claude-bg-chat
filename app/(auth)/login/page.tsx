'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome to GTD Todo
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sign in with your email to continue
          </p>
        </div>

        {success ? (
          <div className="rounded-md bg-green-50 p-4 text-center dark:bg-green-900/50">
            <p className="text-sm font-medium text-green-700 dark:text-green-200">
              Check your email!
            </p>
            <p className="mt-1 text-sm text-green-600 dark:text-green-300">
              We sent a magic link to <strong>{email}</strong>
            </p>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/50 dark:text-red-200">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:focus:border-white dark:focus:ring-white"
                placeholder="you@example.com"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-black px-4 py-2 text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:focus:ring-white"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-gray-500 dark:text-gray-400">
          We&apos;ll send you a magic link to sign in.
          <br />
          No password needed.
        </p>
      </div>
    </div>
  );
}
