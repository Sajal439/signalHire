import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/ NextResponse';
import prisma from '../../../../lib/db';
import { fetchGithubProfile } from '../../../../lib/github';

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });
    }

    // Get GitHub OAuth token
    const client = clerkClient();
    const response = await client.users.getUserOauthAccessToken(clerkId, 'oauth_github');
    
    // clerkClient returns a paginated response in v5 (an object with data array), or array directly in some versions.
    // Handling both array and data array structures:
    const tokens = Array.isArray(response) ? response : (response.data || []);
    
    if (tokens.length === 0) {
      return NextResponse.json({ 
        ok: false, 
        message: 'No GitHub connection found. Sign in with GitHub to enable this.' 
      }, { status: 400 });
    }

    const token = tokens[0].token;

    const { summary, username } = await fetchGithubProfile(token);

    await prisma.resumeProfile.upsert({
      where: { userId: user.id },
      update: {
        githubSummary: summary,
        githubUsername: username,
        profileReady: false,
      },
      create: {
        userId: user.id,
        githubSummary: summary,
        githubUsername: username,
        profileReady: false,
      }
    });

    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error('Error fetching GitHub profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
