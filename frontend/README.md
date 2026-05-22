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
| Testy | Vitest 2.1 + RTL + happy-dom (10) · Playwright 1.60 E2E Chromium (14) |
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

Dwa poziomy: **Vitest** (jednostkowe / komponenty) i **Playwright** (E2E w przeglądarce). E2E nie wymagają backendu — API jest mockowane w `e2e/fixtures.ts`.

### Vitest (10 testów)

```powershell
npm test           # watch mode
npm run test:run   # jednorazowy przebieg (CI)
```

Środowisko: **happy-dom** (lekki DOM). Pliki w `src/__tests__/`:

| Plik | Co testuje |
|---|---|
| `LoginPage.test.tsx` | nagłówek, submit logowania, przełącznik rejestracji |
| `DashboardPage.test.tsx` | nagłówek „Twoje projekty”, render listy z API |
| `models.test.ts` | etykiety statusów zadań (zgodność z enum backendu) |

Konfiguracja: `vite.config.ts` (plugin Vitest), `src/test-setup.ts`.

### Playwright E2E (14 testów, Chromium)

Testy end-to-end weryfikują aplikację **tak jak widzi ją użytkownik** — w prawdziwej przeglądarce (Chromium), z klikaniem, wpisywaniem tekstu i asercjami na widocznych elementach UI.

**Jak to działa**

1. Playwright uruchamia Vite (`npm run dev` → `http://localhost:5173`).
2. Scenariusze w `e2e/*.spec.ts` otwierają kolejne ekrany (login, dashboard, projekt, zadanie, profil).
3. Wywołania API są mockowane w `e2e/fixtures.ts` — testy nie łączą się z backendem .NET ani Azure.
4. Po przebiegu można otworzyć raport HTML ze zrzutami i czasami wykonania.

**Uruchomienie**

```powershell
npm install                     # pierwszy raz (pobiera też Chromium przez postinstall)
npm run test:e2e                # 14 testów, ~10 s
npm run test:e2e:report         # raport HTML — osobna komenda, po udanym test:e2e
npm run test:e2e:ui             # tryb interaktywny Playwright
```

**Pokrycie scenariuszy (14)**

| Plik | Testy | Co sprawdzamy |
|---|---|---|
| `e2e/login.spec.ts` | 4 | formularz logowania, zakładki login/rejestracja, komunikat błędu z API, przejście na dashboard po sukcesie |
| `e2e/dashboard.spec.ts` | 3 | pusty stan bez projektów, wyświetlenie listy z API, utworzenie projektu i pojawienie się na liście |
| `e2e/project.spec.ts` | 4 | szczegóły projektu, pusta lista zadań, wejście w zadanie, dodanie zadania, filtr statusu „In Progress” |
| `e2e/task.spec.ts` | 2 | zmiana statusu zadania i zapis, załącznik z opisem i tagami AI Vision |
| `e2e/profile.spec.ts` | 1 | dane konta użytkownika, wybór kanału SMS i zapis preferencji |

**Konfiguracja:** `playwright.config.ts` — katalog `e2e/`, projekt `chromium`, `baseURL` `http://localhost:5173`. `VITE_API_BASE_URL` wskazuje ten sam origin co frontend, żeby mocki `page.route` działały bez problemów z CORS.

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
npm test              # Vitest w watch mode
npm run test:run      # Vitest single run
npm run test:e2e      # Playwright E2E
npm run test:e2e:ui   # Playwright UI mode
npm run test:e2e:report  # raport HTML E2E
npm run lint          # ESLint
```

## Powiązane

- **Backend:** `../backend/README.md` — jak uruchomić REST API
- **Mobile:** `../mobile/README.md` — wersja React Native (web + iOS + Android)
- **Root:** `../README.md` — opis całego projektu i Azure
