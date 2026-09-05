import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { parseResume } from '@/lib/resumeParser';

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

    let textToSave = '';

    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      textToSave = await parseResume(buffer, file.type);
    } else {
      const body = await req.json();
      if (!body.text) {
        return NextResponse.json({ error: 'No text provided' }, { status: 400 });
      }
      textToSave = body.text;
    }

    await prisma.resumeProfile.upsert({
      where: { userId: user.id },
      update: {
        resumeText: textToSave,
        profileReady: false,
      },
      create: {
        userId: user.id,
        resumeText: textToSave,
        profileReady: false,
      }
    });

    return NextResponse.json({ ok: true, preview: textToSave.slice(0, 500) });
  } catch (error) {
    console.error('Error in resume upload:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
