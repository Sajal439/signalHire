import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/ NextResponse';
import prisma from '../../../../lib/db';

export async function GET(req: Request) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const all = url.searchParams.get('all') === 'true';

    const user = await prisma.user.findUnique({ where: { clerkId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found in DB' }, { status: 404 });
    }

    const matches = await prisma.jobMatch.findMany({
      where: {
        userId: user.id,
        ...(all ? {} : { llmScore: { not: null } })
      },
      include: {
        job: true
      },
      orderBy: [
        { llmScore: 'desc' },
        { fitScore: 'desc' }
      ],
      take: all ? undefined : 50,
    });

    return NextResponse.json({ ok: true, matches });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
