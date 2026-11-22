import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AWS GenAI Developer',
  description: 'Animated study tutorial for the AWS Certified Generative AI Developer course.',
  icons: { icon: '/assets/aws-icons/architecture-service/AmazonBedrock.svg' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="/css/style.css" />
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('ai-learning-theme');if(t)document.documentElement.dataset.theme=t}catch(e){}" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
