import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSessionUser } from "@/lib/auth";
import NavBar from "@/components/nav-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Nameless Pages Fellowship",
  description: "A place to release creative work",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* h-full flex flex-col: fills screen, never scrolls at viewport level */}
      <body className="h-full flex flex-col overflow-hidden">
        <NavBar user={user ? { username: user.username, display_name: user.display_name ?? null, role: user.role } : null} />
        {/* flex-1 + min-h-0 lets children set their own scroll */}
        <div className="flex-1 min-h-0">
          {children}
        </div>
      </body>
    </html>
  );
}
