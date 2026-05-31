import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IntelliDocs AI - OCR Pipeline',
  description: 'Multi-language OCR with CER/WER Evaluation',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
