import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '../../../../lib/db';
import { MatchCard } from '../../../components/MatchCard';
import { ProfileStatus } from '../../../components/ProfileStatus';

const DIGEST_TOP_N = 20;

export default async function DashboardPage() {
  const { userId: clerkId } = auth();
  if (!clerkId) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { resumeProfile: true }
  });

  if (!user) {
    return <div>User not found.</div>;
  }

  const profileReady = user.resumeProfile?.profileReady || false;

  const matches = await prisma.jobMatch.findMany({
    where: {
      userId: user.id,
      llmScore: { not: null }
    },
    include: {
      job: true
    },
    orderBy: {
      llmScore: 'desc'
    },
    take: DIGEST_TOP_N
  });

  return (
    <div>
      {!profileReady && <ProfileStatus />}

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Today's Matches</h1>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center text-gray-500">
          No matches yet. The pipeline runs daily and will populate your matches. Check back tomorrow!
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
