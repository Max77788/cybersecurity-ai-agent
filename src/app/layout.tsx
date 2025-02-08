// app/layout.tsx
import './globals.css';
import dotenv from "dotenv";
dotenv.config()

import OpenHomeButton from "@/app/components/OpenHomeButton";

export const metadata = {
  title: `${process.env.NODE_ENV === "development" ? "Local ": ""}CS AI Agent`,
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
        <header className="bg-foregroundColor text-white p-4 shadow-lg sticky top-0 z-50 flex justify-center items-center relative">
          {/* Button positioned absolutely to the left */}
          <div className="absolute left-4">
            <OpenHomeButton />
          </div>

          {/* Centered title */}
          <h1 className="text-2xl font-bold text-center">CyberSecurity AI Agent</h1>
        </header>
        {children}
      </body>
    </html>
  );
}

