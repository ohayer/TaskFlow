# TaskFlow

Aplikacja do zarządzania zadaniami zespołowymi z trzema klientami (web, mobile, mobile-web) i pełnym backendem w chmurze Azure. Projekt zaliczeniowy z technologii chmurowych Azure + ASP.NET Core + React + React Native.

## Stos technologiczny

| Warstwa | Technologia |
|---|---|
| **Backend** | .NET 8 (ASP.NET Core), EF Core, JWT auth (BCrypt + HMAC), xUnit |
| **Frontend (web)** | React 19 + Vite 5 + TypeScript + Tailwind CSS + Headless UI + TanStack Query |
| **Mobile** | React Native 0.76 + Expo SDK 52 + Expo Router (file-based) + twrnc (Tailwind for RN) — działa na iOS / Android / Web |
| **Chmura** | Azure: App Service, SQL Database, Cosmos DB, Blob/Files Storage, Service Bus, Redis Cache, Functions, Key Vault, App Insights, AI Vision (Computer Vision) |
| **IaC** | Bicep (~10 modułów) |
| **Wzorce projektowe** | Repository Pattern (×4 implementacje) + Strategy Pattern (×2 use case'y: notyfikacje + procesory załączników) |
| **Testy** | 46 unit testów xUnit + Moq + FluentAssertions |

## Struktura

```
.
├── backend/        # ASP.NET Core 8 — REST API + Functions + testy unit
├── frontend/       # React 19 + Vite — webowy klient produkcyjny
├── mobile/         # Expo + React Native — klient mobile (web/iOS/Android)
└── README.md
```

## Backend (`backend/`)

```
backend/
└── src/
    ├── TaskFlow.Domain/          # encje + interfejsy repo + interfejsy strategii
    ├── TaskFlow.Application/     # serwisy biznesowe + DTOs
    ├── TaskFlow.Infrastructure/  # EF Core + Cosmos + Redis + Blob + ServiceBus + 6 strategii
    ├── TaskFlow.Api/             # Controllers + Program.cs + Swagger + JWT middleware
    └── TaskFlow.Functions/       # Azure Functions (BlobTrigger + ServiceBusTrigger)
```

**Uruchomienie lokalne:**

```powershell
cd backend
dotnet restore
dotnet ef database update -p src/TaskFlow.Infrastructure -s src/TaskFlow.Api
dotnet run --project src/TaskFlow.Api
```

API wystartuje na `http://localhost:5156`, Swagger UI pod `http://localhost:5156/swagger`.

**Uruchomienie testów:**

```powershell
cd backend
dotnet test tests/TaskFlow.UnitTests
```

> 46 testów ≈ 600 ms.

## Frontend (`frontend/`)

```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173
```

**Endpointy konfigurowane przez `.env`:**
- `VITE_API_BASE_URL=http://localhost:5156` (dev)
- `VITE_API_BASE_URL=https://your-app.azurewebsites.net` (production — patrz `.env.production`)

**Build produkcyjny:**

```powershell
npm run build    # output: dist/
npm run preview  # podgląd produkcyjnego build
```

**Testy:**

```powershell
npm test
```

## Mobile (`mobile/`)

```powershell
cd mobile
npm install
copy .env.production .env   # jeśli chcesz backend z chmury; w przeciwnym razie zmień URL
npx expo start --web --port 8081
```

Web: `http://localhost:8081`. Otwórz DevTools → Device Toolbar (`Ctrl+Shift+M`) → wybierz iPhone/Pixel żeby przetestować widok mobilny.

**Telefon (Expo Go):**

1. Zainstaluj **Expo Go** ze sklepu (Android/iOS).
2. Znajdź IP swojego komputera w LAN: `ipconfig`.
3. W `mobile/.env` ustaw `EXPO_PUBLIC_API_URL=http://192.168.X.X:5156` (lub publiczny URL Azure).
4. `npx expo start` → zeskanuj QR code aplikacją Expo Go.

> Telefon i komputer muszą być w tej samej sieci Wi-Fi. Firewall Windows może wymagać reguły dla portu 5156.

## Architektura wysokopoziomowa

```
       ┌─────────────────────────────────────────┐
       │  React 19 web  •  Expo (web + mobile)   │
       └───────────────────┬─────────────────────┘
                           │ JWT Bearer
                           ▼
       ┌─────────────────────────────────────────┐
       │     Azure App Service (.NET 8 API)      │
       └─┬───────┬───────┬───────┬───────────────┘
         │       │       │       │
       ┌─▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼────────┐
       │SQL │ │Cosmos│ │Redis│ │ Storage   │
       │    │ │ Audit│ │Cache│ │ Blob+Files│
       └────┘ └──────┘ └─────┘ └─┬─────────┘
        CRUD   audit   list-     │ BlobTrigger
                       cache     ▼
                          ┌──────────────────┐
                          │ Azure Function   │
                          │ + AI Vision      │
                          │ (thumbnail+tags) │
                          └─────┬────────────┘
                                │ Service Bus queue
                                ▼
                          ┌──────────────────┐
                          │ Notification fn  │
                          │ (Strategy ptn.)  │
                          └──────────────────┘
```

## Wzorce projektowe

### Repository Pattern (4 implementacje)
`IProjectRepository`, `ITaskRepository`, `IUserRepository`, `IAuditRepository` w `TaskFlow.Domain/Repositories/` — implementacje EF Core (SQL) i Cosmos w `TaskFlow.Infrastructure/Repositories/`.

### Strategy Pattern (2 use case'y, 6 implementacji)

**Notyfikacje** (`INotificationStrategy`):
- `EmailNotificationStrategy`
- `SmsNotificationStrategy`
- `InAppNotificationStrategy`

`NotificationService` wybiera strategię na podstawie `User.NotificationPreference`.

**Procesory załączników** (`IAttachmentProcessor`):
- `ImageThumbnailProcessor` (jpg/png — miniaturka)
- `PdfPreviewProcessor` (pdf — pierwsza strona)
- `GenericFileProcessor` (reszta — metadane)

Function wybiera procesor po MIME type.

## Auth & bezpieczeństwo

- **JWT** generowane przez API (`/api/auth/login`, `/api/auth/register`). Hash hasła BCrypt, podpis tokenu HMAC SHA256.
- **Token** w localStorage (web) / SecureStore (native mobile) / AsyncStorage (web mobile).
- **Axios interceptor** dorzuca `Authorization: Bearer <token>` do każdego requestu.
- **401 → auto-logout** i redirect na `/login`.

## Funkcje aplikacji

- Rejestracja / logowanie własnym kontem (BCrypt + JWT)
- Projekty: lista, CRUD, członkowie z rolami (Member/Admin/Owner)
- Zadania: CRUD, statusy (Todo/InProgress/InReview/Done/Cancelled), filtrowanie, due date
- Załączniki: upload zdjęć i dokumentów → Azure Blob → Function generuje thumbnail + tagi AI (Azure AI Vision) → wynik wraca do API
- Audit log: każda akcja (utworzenie, edycja, usunięcie, upload, zmiana roli) zapisywana w Cosmos DB
- Eksport zadań do CSV (zapis w Azure Files)
- Preferencje powiadomień (Email / SMS / InApp)

## Licencja

Projekt zaliczeniowy, brak konkretnej licencji.
