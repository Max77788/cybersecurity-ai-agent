// app/layout.tsx
import './globals.css';

export const metadata = {
  title: 'CS AI Agent',
  description: 'Cybersecurity AI-Agent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-backgroundColor flex flex-col">
        {children}
      </body>
    </html>
  );
}
