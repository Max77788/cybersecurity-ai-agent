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
        <header className="bg-foregroundColor text-white p-4 shadow-lg sticky top-0 z-50">
            <h1 className="text-2xl font-bold text-center">CyberSecurity AI Agent</h1>
            {/*
            <nav>
              <ul className="flex space-x-4">
                <li>
                  <a href="/" className="hover:underline">
                    Home
                  </a>
                </li>
                <li>
                  <a href="/about" className="hover:underline">
                    About
                  </a>
                </li>
                <li>
                  <a href="/contact" className="hover:underline">
                    Contact
                  </a>
                </li>
              </ul>
            </nav>
            */}
        </header>
        {children}
      </body>
    </html>
  );
}

