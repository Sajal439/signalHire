import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { DashboardPageClient } from '@/components/DashboardPageClient';

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
    <DashboardPageClient
      profileReady={profileReady}
      matches={matches.map((m) => ({
        id: m.id,
        llmScore: m.llmScore,
        llmReason: m.llmReason,
        fitScore: m.fitScore,
        job: {
          company: m.job.company,
          title: m.job.title,
          source: m.job.source,
          url: m.job.url,
          postedAt: m.job.postedAt,
        },
      }))}
    />
  );
}
