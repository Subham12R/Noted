import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NotesProvider } from "@/context/NotesContext";
import { SidebarProvider } from "@/context/SidebarContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SidebarProvider>
          <NotesProvider>
            {children}
          </NotesProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}
