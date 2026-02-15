'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { login, register } from '@/lib/api';
import { useSession } from '@/lib/SessionContext';

export default function LandingPage() {
  const { isLoggedIn, setToken } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn === true) router.replace('/home');
  }, [isLoggedIn, router]);

  if (isLoggedIn === null) {
    return <p>Loading...</p>;
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await login(email, password);
      setToken(token);
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password);
      const { token } = await login(email, password);
      setToken(token);
      router.replace('/home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ padding: 20, maxWidth: 400, margin: '0 auto' }}>
      <h1>SmartPill</h1>
      <p>Log in or create an account.</p>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 10 }}>
          <label>
            Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ display: 'block', marginTop: 4 }} />
          </label>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>
            Password <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} style={{ display: 'block', marginTop: 4 }} />
          </label>
        </div>
        {error && <p style={{ color: 'red', marginBottom: 10 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="submit" disabled={loading}>
            Log in
          </button>
          <button type="button" onClick={handleRegister} disabled={loading}>
            Sign up
          </button>
        </div>
      </form>
    </main>
  );
}
