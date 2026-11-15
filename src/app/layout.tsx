import type { Metadata, Viewport } from "next";
import "@fontsource/cormorant-garamond/300.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/300-italic.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/hanken-grotesk/400.css";
import "@fontsource/hanken-grotesk/500.css";
import "@fontsource/pinyon-script/400.css";
import "lenis/dist/lenis.css";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import BookingProvider from "@/components/BookingProvider";
import Preloader from "@/components/Preloader";
import Header from "@/components/Header";
import ReserveBar from "@/components/ReserveBar";

export const metadata: Metadata = {
  title: "Torre de Jardin — Villas, Resort & Event Place · Naguilian, Isabela",
  description:
    "A private garden resort in Naguilian, Isabela. Villas, cabins, a pool, a function hall and a tower that lights the night. The city is far. That is the point.",
  openGraph: {
    title: "Torre de Jardin — The city is far. That is the point.",
    description: "Villas, pool, gardens and events in Naguilian, Isabela. Reserve your dates.",
    images: ["/img/sunset-1200.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#15241C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BookingProvider>
          <SmoothScroll />
          <Preloader />
          <Header />
          <main>{children}</main>
          <ReserveBar />
        </BookingProvider>
      </body>
    </html>
  );
}
