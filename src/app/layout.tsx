import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Arvo, Caveat, DM_Sans, Geist_Mono } from "next/font/google";
import { ClerkOauthReturnRecovery } from "@/components/ClerkOauthReturnRecovery";
import { GuestTripProvider } from "@/context/guest-trip-context";
import { JournalTripsProvider } from "@/context/journal-trips-context";
import { Header } from "@/components/Header";
import "./globals.css";

const arvo = Arvo({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-arvo",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-field-notes",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Wild roads",
  description: "Plan your next trail adventure—ranger-approved vibes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${dmSans.variable} ${arvo.variable} ${geistMono.variable} ${caveat.variable} h-full antialiased`}
      >
        <body className="flex min-h-full flex-col">
          <ClerkOauthReturnRecovery />
          <GuestTripProvider>
            <JournalTripsProvider>
              <Header />
              {children}
            </JournalTripsProvider>
          </GuestTripProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
