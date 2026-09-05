'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ProfileClient({ initialProfile, user }: { initialProfile: any, user: any }) {
  const [resumeText, setResumeText] = useState(initialProfile?.resumeText || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const handleSaveResume = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/profile/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: resumeText })
      });
      if (res.ok) {
        setMessage('Resume saved successfully. Needs re-analysis.');
        router.refresh();
      }
    } catch (e) {
      setMessage('Error saving resume.');
    }
    setLoading(false);
  };

  const handleResyncGithub = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/profile/github', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setMessage('GitHub synced successfully. Needs re-analysis.');
        router.refresh();
      } else {
        setMessage(data.message || 'Error syncing GitHub.');
      }
    } catch (e) {
      setMessage('Error syncing GitHub.');
    }
    setLoading(false);
  };

  const handleReanalyse = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/profile/analyse', { method: 'POST' });
      if (res.ok) {
        setMessage('Profile re-analysed successfully.');
        router.refresh();
      } else {
        setMessage('Error analysing profile.');
      }
    } catch (e) {
      setMessage('Error analysing profile.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
      
      {message && (
        <div className="p-4 bg-blue-50 text-blue-800 rounded-md border border-blue-200">
          {message}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block">Profile Ready</span>
            <span className="font-medium text-gray-900">{initialProfile?.profileReady ? 'Yes' : 'No (Needs Analysis)'}</span>
          </div>
          <div>
            <span className="text-gray-500 block">Last Embedded</span>
            <span className="font-medium text-gray-900">{initialProfile?.embeddedAt ? new Date(initialProfile.embeddedAt).toLocaleString() : 'Never'}</span>
          </div>
        </div>
        <button 
          onClick={handleReanalyse} 
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          Re-analyse Profile
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">GitHub Connection</h2>
          <button 
            onClick={handleResyncGithub}
            disabled={loading}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
          >
            Re-sync GitHub
          </button>
        </div>
        <div className="text-sm">
          <span className="text-gray-500 block">Username</span>
          <span className="font-medium text-gray-900">{initialProfile?.githubUsername || 'Not connected'}</span>
        </div>
        {initialProfile?.githubSummary && (
          <div>
            <span className="text-gray-500 block mb-1 text-sm">Summary Preview</span>
            <pre className="text-xs text-gray-700 bg-gray-50 p-3 rounded overflow-auto max-h-40 border">
              {initialProfile.githubSummary}
            </pre>
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Resume Text</h2>
          <button 
            onClick={handleSaveResume}
            disabled={loading}
            className="px-4 py-2 bg-gray-900 text-white rounded hover:bg-gray-800 text-sm font-medium disabled:opacity-50"
          >
            Save Changes
          </button>
        </div>
        <textarea 
          className="w-full h-64 p-3 border rounded text-sm font-mono bg-gray-50"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border space-y-4">
        <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
        <div className="space-y-2">
          <label className="text-sm text-gray-700 block font-medium">Telegram Chat ID (Optional)</label>
          <input 
            type="text" 
            className="w-full p-2 border rounded text-sm"
            placeholder="e.g. 123456789"
            defaultValue={user?.telegramChatId || ''}
            disabled
          />
          <p className="text-xs text-gray-500">
            Send a message to our bot on Telegram and type /start to get your Chat ID. (Editing via UI coming soon)
          </p>
        </div>
      </div>
    </div>
  );
}
