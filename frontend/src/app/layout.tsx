import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata: Metadata = {
  title: "Coffee House CRM",
  description: "AI-native coffee shop CRM for customer outreach.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body className="font-sans h-screen overflow-hidden bg-surface text-coffee-text">
        <div className="page-shell h-screen overflow-hidden">
          <div className="page-content box-border h-full min-h-0 overflow-hidden px-4 py-6 text-coffee-text">
            <div className="mx-auto flex h-full min-h-0 w-full max-w-[1640px] flex-col gap-5 xl:flex-row">
              <Sidebar />
              <main className="min-w-0 h-full flex-1 flex flex-col overflow-hidden">
                <div className="border-b border-coffee-border px-4 py-3">
                  <div className="flex items-center justify-end gap-4">
                    <ThemeToggle />
                  </div>
                </div>
                <div className="flex-1 min-h-0 overflow-auto">{children}</div>
              </main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
