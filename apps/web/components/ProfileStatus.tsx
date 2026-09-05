import Link from 'next/link';

export function ProfileStatus() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="text-blue-800">
        <strong className="font-semibold">Your profile isn't ready yet.</strong> Complete your profile to start seeing matches.
      </div>
      <Link 
        href="/onboarding" 
        className="whitespace-nowrap px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
      >
        Complete profile →
      </Link>
    </div>
  );
}
