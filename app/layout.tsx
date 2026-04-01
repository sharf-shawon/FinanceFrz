import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000"),
  title: "FinanceFrz - Personal Finance",
  description: "Track your personal finances with ease",
  manifest: "/manifest.json",
  authors: [{ name: "Sharfuddin Shawon" }],
  creator: "Sharfuddin Shawon",
  openGraph: {
    type: "website",
    siteName: "FinanceFrz",
    url: "/",
    title: "FinanceFrz - Personal Finance",
    description: "Track your personal finances with ease",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "FinanceFrz - Personal Finance Tracker",
      },
    ],
  },
  facebook:{
    appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || "",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinanceFrz - Personal Finance",
    description: "Track your personal finances with ease",
    images: ["/og-image.png"],
    creator: "@sharf_shawon",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "FinanceFrz",
  },
  icons: {
    shortcut: "/icons/favicon.ico",
    icon: [
      { url: "/icons/android-icon-36x36.png", sizes: "36x36", type: "image/png" },
      { url: "/icons/android-icon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/android-icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/android-icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/android-icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-icon-57x57.png", sizes: "57x57", type: "image/png" },
      { url: "/icons/apple-icon-60x60.png", sizes: "60x60", type: "image/png" },
      { url: "/icons/apple-icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/icons/apple-icon-76x76.png", sizes: "76x76", type: "image/png" },
      { url: "/icons/apple-icon-114x114.png", sizes: "114x114", type: "image/png" },
      { url: "/icons/apple-icon-120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/icons/apple-icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/icons/apple-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/icons/apple-icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "manifest", url: "/icons/manifest.json" },
      { rel: "apple-touch-icon-precomposed", url: "/icons/apple-icon-precomposed.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", url: "/splash_screens/iPhone_17_Pro_Max__iPhone_16_Pro_Max_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", url: "/splash_screens/iPhone_17_Pro__iPhone_17__iPhone_16_Pro_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", url: "/splash_screens/iPhone_16_Plus__iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", url: "/splash_screens/iPhone_Air_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", url: "/splash_screens/iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", url: "/splash_screens/iPhone_14_Plus__iPhone_13_Pro_Max__iPhone_12_Pro_Max_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", url: "/splash_screens/iPhone_17e__iPhone_16e__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", url: "/splash_screens/iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", url: "/splash_screens/iPhone_11_Pro_Max__iPhone_XS_Max_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/iPhone_11__iPhone_XR_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)", url: "/splash_screens/iPhone_8_Plus__iPhone_7_Plus__iPhone_6s_Plus__iPhone_6_Plus_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/iPhone_8__iPhone_7__iPhone_6s__iPhone_6__4.7__iPhone_SE_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/4__iPhone_SE__iPod_touch_5th_generation_and_later_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/13__iPad_Pro_M4_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/12.9__iPad_Pro_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 834px) and (device-height: 1210px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/11__iPad_Pro_M4_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/11__iPad_Pro__10.5__iPad_Pro_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/10.9__iPad_Air_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/10.5__iPad_Air_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/10.2__iPad_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/9.7__iPad_Pro__7.9__iPad_mini__9.7__iPad_Air__9.7__iPad_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)", url: "/splash_screens/8.3__iPad_Mini_landscape.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", url: "/splash_screens/iPhone_17_Pro_Max__iPhone_16_Pro_Max_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", url: "/splash_screens/iPhone_17_Pro__iPhone_17__iPhone_16_Pro_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", url: "/splash_screens/iPhone_16_Plus__iPhone_15_Pro_Max__iPhone_15_Plus__iPhone_14_Pro_Max_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", url: "/splash_screens/iPhone_Air_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", url: "/splash_screens/iPhone_16__iPhone_15_Pro__iPhone_15__iPhone_14_Pro_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", url: "/splash_screens/iPhone_14_Plus__iPhone_13_Pro_Max__iPhone_12_Pro_Max_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", url: "/splash_screens/iPhone_17e__iPhone_16e__iPhone_14__iPhone_13_Pro__iPhone_13__iPhone_12_Pro__iPhone_12_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", url: "/splash_screens/iPhone_13_mini__iPhone_12_mini__iPhone_11_Pro__iPhone_XS__iPhone_X_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", url: "/splash_screens/iPhone_11_Pro_Max__iPhone_XS_Max_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/iPhone_11__iPhone_XR_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)", url: "/splash_screens/iPhone_8_Plus__iPhone_7_Plus__iPhone_6s_Plus__iPhone_6_Plus_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/iPhone_8__iPhone_7__iPhone_6s__iPhone_6__4.7__iPhone_SE_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/4__iPhone_SE__iPod_touch_5th_generation_and_later_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 1032px) and (device-height: 1376px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/13__iPad_Pro_M4_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/12.9__iPad_Pro_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 834px) and (device-height: 1210px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/11__iPad_Pro_M4_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/11__iPad_Pro__10.5__iPad_Pro_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/10.9__iPad_Air_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/10.5__iPad_Air_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/10.2__iPad_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/9.7__iPad_Pro__7.9__iPad_mini__9.7__iPad_Air__9.7__iPad_portrait.png" },
      { rel: "apple-touch-startup-image", media: "screen and (device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)", url: "/splash_screens/8.3__iPad_Mini_portrait.png" },
    ],
  },
  other: {
    "msapplication-TileColor": "#18181b",
    "msapplication-TileImage": "/icons/ms-icon-144x144.png",
    "msapplication-config": "/browserconfig.xml",
  },
};

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js'); }`}
        </Script>
      </body>
    </html>
  );
}
