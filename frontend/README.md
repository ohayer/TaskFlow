# TaskFlow — Frontend (React + Vite)

Webowy klient aplikacji TaskFlow zbudowany w **React 19 + Vite 5 + TypeScript + Tailwind CSS + Headless UI**. Komunikuje się z backendem (`../backend/`) przez REST API z JWT Bearer auth.

## Spis treści

- [Stos technologiczny](#stos-technologiczny)
- [Wymagania](#wymagania)
- [Pierwsze uruchomienie](#pierwsze-uruchomienie)
- [Konfiguracja API](#konfiguracja-api)
- [Uruchomienie](#uruchomienie)
- [Build produkcyjny](#build-produkcyjny)
- [Testy](#testy)
- [Struktura projektu](#struktura-projektu)
- [Strony i routing](#strony-i-routing)

## Stos technologiczny

| Warstwa | Pakiet |
|---|---|
| Framework | React 19.2 |
| Bundler | Vite 5.4 |
| Język | TypeScript 6 |
| Stylowanie | Tailwind CSS 3.4 + Headless UI 2.2 + Heroicons 2.2 |
| Routing | React Router v6 |
| Stan serwerowy | TanStack Query v5 (z cache + invalidacjami) |
| HTTP | axios 1.7 (z interceptorem JWT) |
| Auth | własny JWT (kontroler `/api/auth` w backendzie) |
| Testy | Vitest 2.1 + React Testing Library + happy-dom |
| Linting | ESLint 10 + typescript-eslint |

## Wymagania

- **Node.js 18+** (zalecane 20+) — `node --version`
- Działający **backend TaskFlow** (`../backend/`) na `http://localhost:5156` **lub** wdrożona instancja Azure (zob. niżej).

## Pierwsze uruchomienie

```powershell
cd C:\Dane\studia\projekt\frontend
npm install
```

## Konfiguracja API

Frontend czyta adres backendu z **zmiennej środowiskowej Vite** `VITE_API_BASE_URL`.

### Tryb dev (lokalny backend)

Stwórz plik `frontend/.env` (lub `.env.development.local`):

```ini
VITE_API_BASE_URL=http://localhost:5156
```

> Domyślny fallback w kodzie (`src/api/client.ts`) to `https://localhost:7071`, ale projekt używa portu 5156 — ustaw zmienną wprost.

### Tryb produkcyjny (backend w chmurze)

Plik `frontend/.env.production` (jest w repo) zawiera URL App Service na Azure:

```ini
VITE_API_BASE_URL=https://app-taskflow-dev-qjxiwfzt6ig3a.azurewebsites.net
```

Ten plik jest używany automatycznie przy `npm run build`.

## Uruchomienie

```powershell
cd C:\Dane\studia\projekt\frontend
npm run dev
```

Vite wystartuje na `http://localhost:5173`. Wbudowany Hot Module Replacement działa.

### CORS

Backend (`Program.cs`) ma w allow list `http://localhost:5173` oraz `:3000`, `:8081`, `:19006`. Jeśli uruchomisz Vite na innym porcie, dorzuć go w backend.

## Build produkcyjny

```powershell
cd C:\Dane\studia\projekt\frontend
npm run build
```

Output trafi do `dist/`. Sprawdź lokalnie podgląd:

```powershell
npm run preview
```

Otworzy `http://localhost:4173`. Bundle wskazuje na URL z `.env.production`.

## Testy

```powershell
npm test         # watch mode
npm run test:run # single run (CI-friendly)
```

Vitest z happy-dom (lekki DOM zamiast jsdom). Testy w `src/**/__tests__/` lub `src/**/*.test.{ts,tsx}`.

## Struktura projektu

```
frontend/
├── public/                          # static assets
├── src/
│   ├── main.tsx                     # entry point — montuje React + Providery
│   ├── App.tsx                      # router + układ
│   ├── index.css                    # @tailwind directives
│   ├── auth/
│   │   └── AuthContext.tsx          # JWT login/register/logout + storage
│   ├── api/
│   │   ├── client.ts                # axios + Bearer interceptor + 401 handler
│   │   └── endpoints.ts             # projectsApi, tasksApi, attachmentsApi, exportsApi, usersApi
│   ├── types/
│   │   └── models.ts                # Project, TaskItem, User, DTOs
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx        # lista projektów + utworzenie nowego
│   │   ├── ProjectDetailPage.tsx    # zadania + filtry + członkowie + eksport
│   │   ├── TaskDetailPage.tsx       # edycja, załączniki (z AI tagami), audit
│   │   └── ProfilePage.tsx          # preferencje powiadomień
│   ├── components/
│   │   ├── Layout.tsx               # sidebar + nawigacja
│   │   ├── AddMemberModal.tsx
│   │   ├── MembersPanel.tsx         # lista członków + role + audit modal
│   │   └── ConfirmDialog.tsx        # potwierdzenie destruktywne (Headless UI)
│   └── hooks/                       # ewentualne custom hooks
├── index.html
├── tailwind.config.js               # paleta brand emerald
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Strony i routing

| Ścieżka | Komponent | Co robi |
|---|---|---|
| `/` (gdy bez auth) | `LoginPage` | Logowanie / rejestracja przez `/api/auth` |
| `/` (gdy zalogowany) | `DashboardPage` | Lista projektów + przycisk "Nowy projekt" |
| `/projects/:projectId` | `ProjectDetailPage` | Zadania + członkowie + eksport CSV |
| `/tasks/:taskId` | `TaskDetailPage` | Edycja zadania, załączniki (upload + AI tagi + delete), historia |
| `/profile` | `ProfilePage` | Zmiana kanału powiadomień (Email/SMS/InApp) |

## Auth flow

1. `LoginPage` woła `POST /api/auth/login` → otrzymuje `{token, expiresAt, user}`.
2. `AuthContext` zapisuje do `localStorage["taskflow.auth"]` jako JSON.
3. Axios interceptor (`api/client.ts`) dorzuca `Authorization: Bearer <token>` do każdego requestu.
4. Przy `401` z dowolnego endpointu → wyczyść storage + redirect na `/`.
5. **Logout** → `queryClient.clear()` + remove storage, żeby kolejny user nie widział cache poprzedniego.

## Skrypty

```powershell
npm run dev        # Vite dev server (HMR) na :5173
npm run build      # produkcyjny bundle do dist/
npm run preview    # podgląd produkcyjnego buildu (po `build`)
npm test           # Vitest w watch mode
npm run test:run   # Vitest single run
npm run lint       # ESLint
```

## Powiązane

- **Backend:** `../backend/README.md` — jak uruchomić REST API
- **Mobile:** `../mobile/README.md` — wersja React Native (web + iOS + Android)
- **Root:** `../README.md` — opis całego projektu i Azure
