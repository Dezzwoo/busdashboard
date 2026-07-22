import "./globals.css";
import AppShell from "../components/AppShell";

export const metadata = {
  title: "Bus Control Dashboard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}