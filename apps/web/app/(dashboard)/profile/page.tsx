import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import prisma from '../../../../lib/db';
import { ProfileClient } from '../../../components/ProfileClient';

export default async function ProfilePage() {
  const { userId: clerkId } = auth();
  if (!clerkId) redirect('/sign-in');

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: { resumeProfile: true }
  });

  if (!user) {
    return <div>User not found.</div>;
  }

  return (
    <ProfileClient initialProfile={user.resumeProfile} user={user} />
  );
}
