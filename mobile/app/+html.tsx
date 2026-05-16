import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Custom HTML wrapper dla web build. Expo Router uzywa tego pliku jako szablon strony.
// Wstrzykujemy precompiled Tailwind CSS z public/tailwind.css (build:css generuje go z global.css).
// NativeWind v2 dziala na native przez babel transform - na web ta sama transformacja nie
// wstrzykuje CSS, wiec dostarczamy go staticly.
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pl">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <link rel="stylesheet" href="/tailwind.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
