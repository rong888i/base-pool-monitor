import localFont from "next/font/local";
import "./globals.css";
import { WalletProvider } from "@/providers/WalletProvider";
import MyTooltip from "@/components/MyTooltip";
import "react-tooltip/dist/react-tooltip.css";
import { ThemeProvider } from "@/providers/ThemeProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata = {
  title: "BASE 池子监控 - DeFi Pool Monitor",
  description: "实时监控 DeFi 池子数据、流动性和交易信息",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <WalletProvider>{children}</WalletProvider>
          <MyTooltip />
        </ThemeProvider>
      </body>
    </html>
  );
}
