// app/layout.tsx
import './globals.css';
import dotenv from "dotenv";
dotenv.config()

import { ToastContainer, toast } from 'react-toastify';

import OpenHomeButton from "@/app/components/header/OpenHomeButton";

import OpenTasksButton from "@/app/components/header/OpenTasksButton";

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
        <header className="bg-foregroundColor text-white p-4 shadow-lg fixed top-0 left-0 right-0 z-50 flex justify-center items-center min-h-[64px]">
          {/* Button positioned absolutely to the left */}
          <div className="absolute left-16">
            <OpenHomeButton />
          </div>
          <div className="absolute right-4 sm:right-8 md:right-12 lg:right-16 xl:right-20">
            <OpenTasksButton />
          </div>
          {/* Centered title */}
          <h1 className="hidden md:block text-2xl animate-[pulse_3s_ease-in-out_infinite] font-bold text-center">
            <button>
              <a href="/">Bami CyberSecurity AI Agent</a>
            </button>
          </h1>
        </header>

        <ToastContainer />

        <main className="">
          {children}
        </main>
      </body>
    </html>
  );
}

