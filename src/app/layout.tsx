import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task List",
  description: "A small task list with CSV import",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
