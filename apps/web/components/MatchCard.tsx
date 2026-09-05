import Link from 'next/link';

interface MatchCardProps {
  company: string;
  title: string;
  llmScore: number | null;
  llmReason: string | null;
  fitScore: number | null;
  source: string;
  url: string;
  postedAt: Date | null;
}

function timeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
}

export function MatchCard({ company, title, llmScore, llmReason, fitScore, source, url, postedAt }: MatchCardProps) {
  let badgeColor = 'bg-gray-200 text-gray-800';
  if (llmScore !== null) {
    if (llmScore >= 75) badgeColor = 'bg-green-100 text-green-800';
    else if (llmScore >= 50) badgeColor = 'bg-yellow-100 text-yellow-800';
    else badgeColor = 'bg-red-100 text-red-800';
  }

  const sourceName = source === 'hn_whoishiring' ? "HN Who's Hiring" : "RemoteOK";

  return (
    <div className="border rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col h-full">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-lg text-gray-900">{company}</h3>
          <p className="text-gray-700 font-medium">{title}</p>
        </div>
        {llmScore !== null && (
          <span className={`px-2 py-1 rounded text-sm font-semibold ${badgeColor}`}>
            {llmScore}/100
          </span>
        )}
      </div>

      {llmReason && (
        <p className="text-gray-600 text-sm mt-2 mb-4 italic">"{llmReason}"</p>
      )}

      <div className="mt-auto space-y-4">
        {fitScore !== null && (
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Cosine Similarity</span>
              <span>{Math.round(fitScore * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.max(0, Math.min(100, fitScore * 100))}%` }}></div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-2 items-center">
            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">{sourceName}</span>
            {postedAt && <span className="text-gray-500 text-xs">{timeAgo(new Date(postedAt))}</span>}
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm inline-flex items-center"
          >
            View job →
          </a>
        </div>
      </div>
    </div>
  );
}
