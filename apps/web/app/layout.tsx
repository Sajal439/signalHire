import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const metadata = {
  title: 'SignalHire',
  description: 'AI-Powered High-Signal Job Matching for Developers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="antialiased min-h-screen bg-gray-50">{children}</body>
      </html>
    </ClerkProvider>
  );
}
