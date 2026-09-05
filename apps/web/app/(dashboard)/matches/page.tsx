import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '../../../../lib/db';
import { MatchCard } from '../../../components/MatchCard';

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: { sort?: string }
}) {
  const { userId: clerkId } = auth();
  if (!clerkId) redirect('/sign-in');

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) return <div>User not found.</div>;

  const sortParam = searchParams.sort || 'llmScore';

  let orderBy: any = {};
  if (sortParam === 'llmScore') orderBy = { llmScore: 'desc' };
  else if (sortParam === 'fitScore') orderBy = { fitScore: 'desc' };
  else if (sortParam === 'postedAt') orderBy = { job: { postedAt: 'desc' } };

  const matches = await prisma.jobMatch.findMany({
    where: { userId: user.id },
    include: { job: true },
    orderBy,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">All Matches</h1>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Sort by:</span>
          <a href="?sort=llmScore" className={`px-2 py-1 rounded ${sortParam === 'llmScore' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}>LLM Score</a>
          <a href="?sort=fitScore" className={`px-2 py-1 rounded ${sortParam === 'fitScore' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}>Fit Score</a>
          <a href="?sort=postedAt" className={`px-2 py-1 rounded ${sortParam === 'postedAt' ? 'bg-gray-200 font-medium' : 'hover:bg-gray-100'}`}>Posted Date</a>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          No matches found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              company={match.job.company}
              title={match.job.title}
              llmScore={match.llmScore}
              llmReason={match.llmReason}
              fitScore={match.fitScore}
              source={match.job.source}
              url={match.job.url}
              postedAt={match.job.postedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
