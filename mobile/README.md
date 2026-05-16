# TaskFlow — Mobile (React Native + Expo)

Klient mobilny TaskFlow zbudowany w **React Native 0.76 + Expo SDK 52** z **Expo Router** (routing file-based) i **twrnc** (Tailwind for React Native). Działa **natywnie** na iOS / Android oraz **w przeglądarce** przez Expo Web — jeden codebase, trzy platformy.

## Spis treści

- [Stos technologiczny](#stos-technologiczny)
- [Wymagania](#wymagania)
- [Pierwsze uruchomienie](#pierwsze-uruchomienie)
- [Konfiguracja API](#konfiguracja-api)
- [Uruchomienie](#uruchomienie)
- [Struktura projektu](#struktura-projektu)
- [Architektura stylowania](#architektura-stylowania)
- [Skrypty](#skrypty)
- [Znane ograniczenia](#znane-ograniczenia)

## Stos technologiczny

| Warstwa | Pakiet |
|---|---|
| Framework | Expo SDK 52, React Native 0.76 |
| Routing | expo-router v4 (file-based, jak Next.js — folder `app/`) |
| Stylowanie | **twrnc** (Tailwind for RN) + własny wrapper z `withClassName()` w `src/lib/rn.tsx` |
| Tailwind config | tailwindcss 3.3 (kompatybilny z twrnc) |
| Stan serwerowy | TanStack Query v5 |
| HTTP | axios 1.7 (z interceptorem JWT) |
| Storage tokenu | `expo-secure-store` (native) / `AsyncStorage` (web) |
| Pliki | `expo-image-picker`, `expo-document-picker` |
| Schowek | `expo-clipboard` |
| Date picker | `@react-native-community/datetimepicker` |
| Toasty | `react-native-toast-message` |
| Ikony | `@expo/vector-icons` (Ionicons) |

## Wymagania

- **Node.js 18+** (zalecane 20+)
- Działający **backend TaskFlow** (`../backend/`) na `http://localhost:5156` **lub** wdrożona instancja Azure (`https://*.azurewebsites.net`)
- Dla testów na fizycznym telefonie: aplikacja **Expo Go** (sklep Android / App Store iOS)
- Dla emulatora: **Android Studio** (Android) lub **Xcode** (iOS, tylko macOS)

## Pierwsze uruchomienie

```powershell
cd C:\Dane\studia\projekt\mobile
npm install
```

## Konfiguracja API

Adres backendu jest rozwiązywany przez `src/lib/api-url.ts` w następującej kolejności:

1. `process.env.EXPO_PUBLIC_API_URL` (z `mobile/.env`) — **najwyższy priorytet**
2. `Constants.expoConfig?.extra?.apiUrl` (z `app.json`)
3. Fallback per platform:
   - **Android emulator** → `http://10.0.2.2:5156` (specjalny alias hosta z emulatora)
   - **iOS simulator** / **web** → `http://localhost:5156`

### Backend lokalny

W `mobile/.env`:

```ini
EXPO_PUBLIC_API_URL=http://localhost:5156
```

### Backend w chmurze (Azure)

W repozytorium jest plik `mobile/.env.production` z publicznym URL App Service:

```ini
EXPO_PUBLIC_API_URL=https://app-taskflow-dev-qjxiwfzt6ig3a.azurewebsites.net
```

Aby użyć go w trybie dev, skopiuj:

```powershell
copy .env.production .env
```

> **Uwaga**: Expo w trybie `expo start` (dev) czyta `.env`, **nie** `.env.production`. Plik `.env.production` jest używany dopiero przy `expo export` / `eas build --profile production`.

### Telefon fizyczny (Expo Go)

Telefon nie zna `localhost` Twojego komputera. Znajdź IP w sieci LAN:

```powershell
ipconfig | Select-String "IPv4"
```

W `mobile/.env`:

```ini
EXPO_PUBLIC_API_URL=http://192.168.X.X:5156
```

Upewnij się że backend nasłuchuje na wszystkich interfejsach:

```powershell
cd ../backend
dotnet run --project src/TaskFlow.Api --urls "http://0.0.0.0:5156"
```

Telefon i komputer muszą być w **tej samej sieci Wi-Fi**. Firewall Windows może wymagać reguły dla portu 5156.

## Uruchomienie

### W przeglądarce (najszybszy sposób)

```powershell
npm run web
```

Skrypt `web` wykonuje **dwa kroki**:
1. `npm run build:css` — generuje `public/tailwind.css` z `global.css` przez Tailwind CLI
2. `expo start --web` — uruchamia Metro bundler i otwiera `http://localhost:8081`

> CSS jest wstrzykiwany przez plik `app/+html.tsx`: `<link rel="stylesheet" href="/tailwind.css">`. Trick wymaga ustawienia `"web": { "output": "static" }` w `app.json`.

#### Testowanie widoku mobilnego w przeglądarce

W DevTools (`F12`) → **Toggle Device Toolbar** (`Ctrl+Shift+M`) → wybierz preset (iPhone 14, Pixel 7, …) albo wpisz wymiary ręcznie. Touch events są symulowane, `useWindowDimensions()` aktualizuje wymiary.

### Telefon fizyczny (Expo Go)

```powershell
npm start
```

Pojawi się QR code w terminalu. Zeskanuj go:
- **Android**: aparatem w aplikacji Expo Go
- **iOS**: zwykłym aparatem (otworzy się Expo Go)

### Emulator Android

```powershell
npm run android
```

Wymaga zainstalowanego Android Studio + aktywnego AVD. URL backendu zmapuje się automatycznie na `http://10.0.2.2:5156`.

### Symulator iOS

```powershell
npm run ios
```

Wymaga macOS + Xcode.

## Struktura projektu

```
mobile/
├── app/                              # File-based routing (expo-router)
│   ├── _layout.tsx                   # Root: QueryClientProvider + AuthProvider + Toast
│   ├── +html.tsx                     # Custom HTML wrapper dla web (wstrzykuje tailwind.css)
│   ├── index.tsx                     # Redirect: zalogowany → (app), niezalogowany → (auth)/login
│   ├── (auth)/
│   │   ├── _layout.tsx               # Stack bez headera + redirect (app) gdy zalogowany
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (app)/
│       ├── _layout.tsx               # Stack z headerem + AuthGuard
│       ├── index.tsx                 # Dashboard — lista projektów
│       ├── profile.tsx               # Preferencje powiadomień
│       ├── projects/[projectId].tsx  # Szczegóły projektu (zadania + członkowie + eksport)
│       └── tasks/[taskId].tsx        # Szczegóły zadania (edycja + załączniki + audit)
│
├── src/
│   ├── auth/
│   │   └── AuthContext.tsx           # JWT login/register/logout, SecureStore + AsyncStorage
│   ├── api/
│   │   ├── client.ts                 # axios + Bearer interceptor + 401 handler
│   │   └── endpoints.ts              # projectsApi, tasksApi, attachmentsApi, exportsApi
│   ├── types/
│   │   └── models.ts                 # Project, TaskItem, User, DTOs (kopia z frontendu)
│   ├── components/
│   │   ├── StatusBadge.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── AddMemberModal.tsx
│   │   ├── MembersPanel.tsx
│   │   ├── AttachmentItem.tsx        # thumbnail + AI tagi + copy + delete
│   │   └── AuditTimeline.tsx
│   └── lib/
│       ├── rn.tsx                    # Wrappery <View>/<Text>/... z prop `className` (twrnc)
│       ├── storage.ts                # SecureStore (native) / AsyncStorage (web) abstrakcja
│       └── api-url.ts                # Platform-aware base URL backendu
│
├── public/
│   └── tailwind.css                  # generowany przez `npm run build:css` (NIE commitowany)
├── tailwind.config.js                # paleta brand (zgodna z frontendem) — tailwindcss 3.3
├── global.css                        # @tailwind directives (źródło dla build:css)
├── app.json                          # Expo config (scheme, extra.apiUrl, plugins)
├── babel.config.js                   # tylko babel-preset-expo
├── metro.config.js                   # domyślny Expo metro
├── tsconfig.json
└── package.json
```

## Architektura stylowania

W odróżnieniu od frontendu webowego (gdzie Tailwind jest aplikowany przez PostCSS), w React Native Tailwind musi być **konwertowany na obiekty `style`** w runtime. Powody:
- W RN nie ma DOM ani CSS klas (są tylko `style={{...}}` z natywnymi propami)
- W RN Web `<View>` nie propaguje propa `className` do `<div>` — RN Web używa własnego stylesheetu

Rozwiązanie:
1. Pliki używają znajomej składni: `<View className="bg-white p-4">`
2. `src/lib/rn.tsx` definiuje wrappery (`View`, `Text`, `Pressable`, ...) które przechwytują `className` i konwertują go na `style` przez **twrnc** (`tw.style(...)`)
3. Na native: twrnc generuje natywny obiekt style → RN renderuje
4. Na web: RN Web zamienia `style={...}` na atomowe klasy CSS — efekt taki sam jak Tailwind

Dodatkowo na web wstrzykujemy gotowy `tailwind.css` (z preprocessingu `tailwindcss -i global.css`) przez `app/+html.tsx` — daje to fallback dla customowych klas i utilities, które twrnc nie zna.

## Skrypty

```powershell
npm start          # Metro Bundler + QR code do Expo Go
npm run web        # build:css + Metro web (otwiera http://localhost:8081)
npm run android    # Emulator Android (mapuje 10.0.2.2:5156)
npm run ios        # Symulator iOS (tylko macOS)
npm run build:css  # tailwindcss -i ./global.css -o ./public/tailwind.css
```

## Znane ograniczenia

- **HTTPS w dev**: backend musi nasłuchiwać na HTTP. Self-signed cert Kestrel nie jest akceptowany przez Expo Go na fizycznym telefonie.
- **Eksport CSV na native**: otwiera się jako `data:text/csv` w przeglądarce systemowej (na web pobiera plik przez `<a download>`).
- **Brak push notifications** (poza zakresem MVP). Powiadomienia idą przez backend (Service Bus → email / SMS / InApp).
- **Brak testów RN** — testy są w `../backend/tests/TaskFlow.UnitTests/` (46 testów). Mobile na razie pokrywa flow ręczny.
- **Node 32-bit**: w środowiskach z 32-bitowym Node `lightningcss` (wymagany przez NativeWind v4) nie ma binarki — stąd używamy twrnc zamiast NativeWind. Działa tak samo z punktu widzenia developera.

## Powiązane

- **Backend:** `../backend/README.md` — jak uruchomić REST API
- **Frontend:** `../frontend/README.md` — wersja webowa (React 19 + Vite)
- **Root:** `../README.md` — opis całego projektu i Azure
