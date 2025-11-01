import { AuthProvider } from "@/context/AuthContext"; // import naseho Provideru zabezpeceni pristupu
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vytvořeno s Next.js 13",
  description: "Vygenerováno pomocí create next app",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="cs">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
