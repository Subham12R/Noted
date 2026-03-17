import type { Metadata } from "next";
import { Geist, Geist_Mono, Grandstander } from "next/font/google";
import { NotesProvider } from "@/context/NotesContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { AuthProvider } from "@/context/AuthContext";
import { AIProvider } from "@/context/AIContext";
import { StudyToolbarProvider } from "@/context/StudyToolbarContext";
import { PomodoroProvider } from "@/context/PomodoroContext";
import { FlashcardProvider } from "@/context/FlashcardContext";
import { QuizProvider } from "@/context/QuizContext";
import { FileLibraryProvider } from "@/context/FileLibraryContext";
import { TagProvider } from "@/context/TagContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "sonner";
import { FloatingPomodoro } from "@/components/pomodoro";
import { FlashcardModal } from "@/components/flashcards";
import { QuizModal } from "@/components/quiz";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const grandstander = Grandstander({
  variable: "--font-grandstander",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Noted",
  description: "AI Generated Notes App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${grandstander.variable} antialiased bg-white dark:bg-[#121212]`}
      >
        <ThemeProvider>
        <AuthProvider>
          <AIProvider>
            <SidebarProvider>
              <NotesProvider>
                <StudyToolbarProvider>
                  <PomodoroProvider>
                    <FlashcardProvider>
                      <QuizProvider>
                        <FileLibraryProvider>
                          <TagProvider>
                            {children}
                            <FloatingPomodoro />
                            <FlashcardModal />
                            <QuizModal />
                            <Toaster
                              position="bottom-right"
                              expand={false}
                              richColors
                              closeButton
                              toastOptions={{
                                style: {
                                  background: "rgba(24, 24, 27, 0.95)",
                                  backdropFilter: "blur(12px)",
                                  border: "1px solid rgba(255, 255, 255, 0.1)",
                                  color: "#fafafa",
                                },
                                classNames: {
                                  toast: "group",
                                  title: "text-sm font-medium",
                                  description: "text-xs text-zinc-400",
                                  actionButton: "bg-white text-zinc-900 text-xs font-medium px-3 py-1.5 rounded-md hover:bg-zinc-100 transition-colors",
                                  cancelButton: "bg-zinc-800 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-md hover:bg-zinc-700 transition-colors",
                                  closeButton: "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-zinc-400 hover:text-white",
                                },
                              }}
                            />
                          </TagProvider>
                        </FileLibraryProvider>
                      </QuizProvider>
                    </FlashcardProvider>
                  </PomodoroProvider>
                </StudyToolbarProvider>
              </NotesProvider>
            </SidebarProvider>
          </AIProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
