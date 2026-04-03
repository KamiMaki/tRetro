'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function JoinPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;

  const [roomName, setRoomName] = useState<string>('');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingRoom, setIsFetchingRoom] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) return;
    fetch(`/api/rooms/${roomId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Room not found');
        return res.json();
      })
      .then((data) => setRoomName(data.name ?? roomId))
      .catch(() => setError('Room not found or no longer available.'))
      .finally(() => setIsFetchingRoom(false));
  }, [roomId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/rooms/${roomId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nickname.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to join room');
      }

      const data = await res.json();

      sessionStorage.setItem('sessionToken', data.sessionToken);
      sessionStorage.setItem('participantId', data.participantId);
      sessionStorage.setItem('roomId', roomId);
      sessionStorage.setItem('nickname', nickname.trim());
      sessionStorage.setItem('isScrumMaster', String(data.isScrumMaster ?? false));

      router.push(`/room/${roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-indigo-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">tRetro</h1>
          {isFetchingRoom ? (
            <p className="text-gray-400 dark:text-gray-500 animate-pulse">Loading room...</p>
          ) : (
            <p className="text-gray-600 dark:text-gray-300 text-xl font-medium">{roomName}</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-5">
            Join the Retro
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="nickname"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Your Nickname
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Alice"
                maxLength={40}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                disabled={isLoading || isFetchingRoom}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !nickname.trim() || isFetchingRoom}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 text-white font-semibold rounded-lg transition focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {isLoading ? 'Joining...' : 'Join'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
