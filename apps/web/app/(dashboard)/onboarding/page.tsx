import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '@/lib/db';
import { OnboardingWizard } from '@/components/OnboardingWizard';

export default async function OnboardingPage() {
  const { userId: clerkId } = auth();
  if (!clerkId) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { resumeProfile: true }
  });

  if (user?.resumeProfile?.profileReady) {
    redirect('/dashboard');
  }

  // Get GitHub username from Clerk if available
  let initialGithubUsername = null;
  try {
    const client = clerkClient();
    const externalAccounts = await client.users.getUserOauthAccessToken(clerkId, 'oauth_github');
    const tokens = Array.isArray(externalAccounts) ? externalAccounts : (externalAccounts as any)?.data || [];
    if (tokens.length > 0) {
      // Just a check to see if they linked it, but we can't easily get the username without decoding the token or looking at the user object
      const fullUser = await client.users.getUser(clerkId);
      const githubAccount = fullUser.externalAccounts.find(ea => ea.provider === 'oauth_github');
      if (githubAccount) {
        initialGithubUsername = githubAccount.username || null;
      }
    }
  } catch (e) {
    console.error('Error fetching external accounts', e);
  }

  return (
    <div>
      <OnboardingWizard initialGithubUsername={initialGithubUsername} />
    </div>
  );
}
