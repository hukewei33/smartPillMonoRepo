'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { hello } from '@/lib/api';
import { getToken } from '@/lib/session';
import { useSession } from '@/lib/SessionContext';

export default function HomePage() {
  const { isLoggedIn, logout } = useSession();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isLoggedIn === false) {
      router.replace('/');
      return;
    }
    if (isLoggedIn !== true) return;

    const token = getToken();
    if (!token) {
      router.replace('/');
      return;
    }
    hello(token)
      .then((r) => setMessage(r.message))
      .catch(() => router.replace('/'))
      .finally(() => setLoading(false));
  }, [isLoggedIn, router]);

  function handleLogout() {
    logout();
    router.replace('/');
  }

  if (isLoggedIn === null || isLoggedIn === false) {
    return <p>Loading...</p>;
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <main style={{ padding: 20, maxWidth: 400, margin: '0 auto' }}>
      <h1>Home</h1>
      {message != null && <p>{message}</p>}
      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </main>
  );
}
