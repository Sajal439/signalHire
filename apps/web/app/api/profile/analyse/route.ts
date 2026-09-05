import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/ NextResponse';
import prisma from '../../../../lib/db';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ 
      where: { clerkId },
      include: { resumeProfile: true }
    });

    if (!user || !user.resumeProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const profile = user.resumeProfile;
    const combinedText = [profile.resumeText, profile.githubSummary].filter(Boolean).join('\n\n---\n\n');

    if (!combinedText.trim()) {
      return NextResponse.json({ error: 'No data to analyse' }, { status: 400 });
    }

    const textHash = crypto.createHash('sha256').update(combinedText).digest('hex');

    if (profile.textHash === textHash) {
      // Already up to date
      if (!profile.profileReady) {
        await prisma.resumeProfile.update({
          where: { id: profile.id },
          data: { profileReady: true }
        });
      }
      return NextResponse.json({ ok: true });
    }

    const embeddingModel = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    const embeddingResponse = await embeddingModel.embedContent(combinedText);
    const embedding = embeddingResponse.embedding.values;

    await prisma.resumeProfile.update({
      where: { id: profile.id },
      data: {
        combinedText,
        textHash,
        embedding,
        embeddedAt: new Date(),
        profileReady: true,
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error analysing profile:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
