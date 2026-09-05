'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function OnboardingWizard({ initialGithubUsername }: { initialGithubUsername: string | null }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [resumePreview, setResumePreview] = useState('');
  const [githubSummary, setGithubSummary] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setLoading(true);
    setError('');
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/profile/resume', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        setResumePreview(data.preview);
      } else {
        setError(data.error || 'Failed to upload resume');
      }
    } catch (err) {
      setError('An error occurred during upload');
    } finally {
      setLoading(false);
    }
  };

  const fetchGithub = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/profile/github', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        setGithubSummary(data.summary);
      } else {
        setError(data.message || 'Failed to fetch GitHub profile');
      }
    } catch (err) {
      setError('An error occurred during GitHub fetch');
    } finally {
      setLoading(false);
    }
  };

  const analyseProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/profile/analyse', { method: 'POST' });
      const data = await res.json();
      if (data.ok) {
        router.push('/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'Failed to analyse profile');
      }
    } catch (err) {
      setError('An error occurred during analysis');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-sm border mt-8">
      <div className="mb-8 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Setup your profile</h2>
        <div className="text-sm text-gray-500">Step {step} of 3</div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded border border-red-200">
          {error}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">1. Upload your resume</h3>
            <p className="text-gray-600 text-sm mb-4">We accept PDF and DOCX files. We'll extract the text to match against jobs.</p>
            
            <div className="mt-2 flex justify-center rounded-lg border border-dashed border-gray-900/25 px-6 py-10">
              <div className="text-center">
                <div className="mt-4 flex text-sm leading-6 text-gray-600 justify-center">
                  <label htmlFor="file-upload" className="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".pdf,.docx" onChange={handleResumeUpload} disabled={loading} />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs leading-5 text-gray-600">PDF, DOCX up to 10MB</p>
              </div>
            </div>
          </div>

          {resumePreview && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Preview</h4>
              <textarea readOnly className="w-full h-32 p-3 text-sm text-gray-700 bg-gray-50 border rounded-md" value={resumePreview} />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Skip</button>
            <button onClick={() => setStep(2)} disabled={loading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50">
              {resumePreview ? "Looks good" : "Continue"}
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">2. Connect GitHub</h3>
            <p className="text-gray-600 text-sm mb-4">We'll fetch your public repos and top languages to find technical roles that fit you perfectly.</p>
            {initialGithubUsername && (
              <p className="text-sm text-gray-700 mb-4">Signed in as: <span className="font-semibold">{initialGithubUsername}</span></p>
            )}
            
            <button 
              onClick={fetchGithub} 
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-900 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {loading ? "Fetching..." : "Fetch my GitHub profile"}
            </button>
          </div>

          {githubSummary && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">GitHub Summary</h4>
              <pre className="w-full p-4 text-sm text-gray-700 bg-gray-50 border rounded-md overflow-auto max-h-60 whitespace-pre-wrap">
                {githubSummary}
              </pre>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t">
            <button onClick={() => setStep(1)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Back</button>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Skip</button>
              <button onClick={() => setStep(3)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700">Continue</button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 text-center py-8">
          <h3 className="text-xl font-medium text-gray-900 mb-2">Ready to generate your profile</h3>
          <p className="text-gray-600 text-sm mb-8">We're combining your resume and GitHub data to find your best job matches using AI.</p>
          
          <button 
            onClick={analyseProfile} 
            disabled={loading}
            className="px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 shadow-sm"
          >
            {loading ? "Analysing... (this takes a few seconds)" : "Build my profile"}
          </button>
          
          <div className="mt-8 flex justify-start pt-4 border-t">
            <button onClick={() => setStep(2)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Back</button>
          </div>
        </div>
      )}
    </div>
  );
}
