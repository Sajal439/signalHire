import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { SignInButton } from '@clerk/nextjs';

export default function HomePage() {
  const { userId } = auth();
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold border border-blue-200">
          <span>📡</span> SignalHire
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight text-balance">
          Cut through the noise. Find your high-signal job matches.
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          Connect your GitHub, upload your resume, and get your daily digest of best-fit roles — scored and explained by AI.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 flex flex-col gap-4">
          <div className="text-center">
            <SignInButton mode="modal">
              <button className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900">
                🐙 Sign in with GitHub
              </button>
            </SignInButton>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SignInButton mode="modal">
              <button className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                Google
              </button>
            </SignInButton>
            <SignInButton mode="modal">
              <button className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                LinkedIn
              </button>
            </SignInButton>
          </div>
          
          <p className="mt-4 text-xs text-center text-gray-500">
            Note: Sign in with GitHub gives better match results — we use your repos and languages to find the right roles.
          </p>
        </div>
      </div>
    </div>
  );
}
