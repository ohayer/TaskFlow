# TaskFlow — Backend (.NET 8)

REST API + Azure Functions dla aplikacji TaskFlow. Zbudowane w **ASP.NET Core 8** według lekkiej **Clean Architecture** (Domain / Application / Infrastructure / Api / Functions), z uwierzytelnianiem JWT, EF Core na Azure SQL, Redis cache, Cosmos DB do audit logu, Blob/Files Storage do załączników, Service Bus do powiadomień i Azure AI Vision do automatycznego tagowania zdjęć.

## Spis treści

- [Stos technologiczny](#stos-technologiczny)
- [Wymagania](#wymagania)
- [Pierwsze uruchomienie](#pierwsze-uruchomienie)
- [Konfiguracja sekretów (user-secrets)](#konfiguracja-sekretów-user-secrets)
- [Migracje bazy danych](#migracje-bazy-danych)
- [Uruchomienie](#uruchomienie)
- [Testy](#testy)
- [Struktura projektu](#struktura-projektu)
- [Wzorce projektowe](#wzorce-projektowe)
- [Endpointy API](#endpointy-api)
- [Wdrożenie na Azure](#wdrożenie-na-azure)

## Stos technologiczny

| Warstwa | Pakiet |
|---|---|
| Framework | ASP.NET Core 8 (`Microsoft.NET.Sdk.Web`) |
| ORM | EF Core 8.0.10 |
| Auth | `Microsoft.AspNetCore.Authentication.JwtBearer` + `BCrypt.Net-Next` |
| Cosmos DB | `Microsoft.Azure.Cosmos` |
| Redis | `StackExchange.Redis` |
| Blob/Files | `Azure.Storage.Blobs` + `Azure.Storage.Files.Shares` |
| Service Bus | `Azure.Messaging.ServiceBus` |
| AI Vision | `Azure.AI.Vision.ImageAnalysis` 1.0.0 |
| Functions | `Microsoft.NET.Sdk.Functions` (isolated worker, BlobTrigger + ServiceBusTrigger) |
| Dokumentacja | Swashbuckle (Swagger UI) |
| Testy | xUnit + Moq + FluentAssertions |

## Wymagania

- **.NET 8 SDK** (`dotnet --version` ≥ 8.0)
- **Azure SQL Database** lub lokalny SQL Server / LocalDB (na potrzeby developmentu)
- Konto **Azure** z dostępem do (opcjonalnie, do pełnej funkcjonalności): Cosmos DB, Redis, Storage, Service Bus, AI Vision
- Bash / PowerShell

## Pierwsze uruchomienie

```powershell
cd C:\Dane\studia\projekt\backend
dotnet restore
dotnet build
```

## Konfiguracja sekretów (user-secrets)

Backend czyta sekrety z **user-secrets** (nie z `appsettings.json`, żeby nie commitować poświadczeń). Każdy projekt z `<UserSecretsId>` ma osobne sekrety w `%APPDATA%\Microsoft\UserSecrets\<id>\secrets.json`.

### Minimum potrzebne do uruchomienia (tylko SQL + JWT)

```powershell
cd C:\Dane\studia\projekt\backend\src\TaskFlow.Api

# JWT - dowolny silny string min. 32 znaki
dotnet user-secrets set "Jwt:Secret" "$(openssl rand -base64 48)"
dotnet user-secrets set "Jwt:Issuer" "TaskFlow"
dotnet user-secrets set "Jwt:Audience" "TaskFlow.Api"

# SQL - lokalny LocalDB lub Azure SQL
dotnet user-secrets set "ConnectionStrings:Sql" "Server=(localdb)\MSSQLLocalDB;Database=TaskFlowDev;Trusted_Connection=True;"
```

### Pełna konfiguracja (z Azure)

Jeśli masz wdrożoną infrastrukturę Azure (App Service, SQL, Cosmos, Redis, Storage, Service Bus, AI Vision), ustaw też:

```powershell
dotnet user-secrets set "ConnectionStrings:Cosmos" "<cosmos-connection-string>"
dotnet user-secrets set "ConnectionStrings:Redis"  "<redis-host>:6380,password=<key>,ssl=True,abortConnect=False"
dotnet user-secrets set "ConnectionStrings:Storage" "<storage-connection-string>"
dotnet user-secrets set "ConnectionStrings:ServiceBus" "<service-bus-connection-string>"
dotnet user-secrets set "AiVision:Endpoint" "https://<region>.cognitiveservices.azure.com/"
dotnet user-secrets set "AiVision:Key" "<key>"
```

> Lista sekretów: `dotnet user-secrets list`
> Wyczyszczenie wszystkich: `dotnet user-secrets clear`

## Migracje bazy danych

```powershell
cd C:\Dane\studia\projekt\backend

# Aplikuje wszystkie migracje do bazy (tworzy schemat)
dotnet ef database update -p src/TaskFlow.Infrastructure -s src/TaskFlow.Api

# Tworzenie nowej migracji (po zmianach w encjach)
dotnet ef migrations add NazwaMigracji -p src/TaskFlow.Infrastructure -s src/TaskFlow.Api
```

> `dotnet-ef` jest lokalnym narzędziem (`.config/dotnet-tools.json`). Po `dotnet restore` powinno być dostępne automatycznie. Jeśli nie: `dotnet tool restore`.

## Uruchomienie

```powershell
cd C:\Dane\studia\projekt\backend
dotnet run --project src/TaskFlow.Api
```

API wystartuje na:
- **HTTP:** `http://localhost:5156`
- **HTTPS:** `https://localhost:7179` (w dev, z self-signed cert)
- **Swagger UI:** `http://localhost:5156/swagger`

> W trybie Development HTTPS redirect jest **wyłączony**, żeby web client Vite (na HTTP) mógł się łączyć bez problemów z certyfikatem.

### Dla aplikacji mobilnej (Expo Go na telefonie)

Telefon nie zna `localhost` Twojego komputera. Uruchom backend na wszystkich interfejsach:

```powershell
dotnet run --project src/TaskFlow.Api --urls "http://0.0.0.0:5156"
```

Następnie w `mobile/.env`: `EXPO_PUBLIC_API_URL=http://<TWÓJ-IP-LAN>:5156`.

## Testy

Dwa projekty xUnit w `backend/tests/`: **unit** (mocki, szybkie) i **integracyjne** (pełne HTTP przez `WebApplicationFactory`).

```powershell
cd backend
dotnet test                              # 46 unit + 11 integracyjnych
dotnet test tests/TaskFlow.UnitTests     # tylko unit (~1 s)
dotnet test tests/TaskFlow.IntegrationTests   # tylko API (~4 s)
```

Stack: **xUnit** + **Moq** + **FluentAssertions**. Integracyjne używają fałszywych implementacji w `TaskFlow.IntegrationTests/Infrastructure/` (cache, audit, blob, eksporter, AI).

### Unit — 46 testów / 7 plików

| Plik | Testy | Co pokrywa |
|---|---|---|
| `Services/AuthServiceTests.cs` | 7 | Register, Login, BCrypt, JWT, duplikat email |
| `Services/TaskServiceTests.cs` | 8 | CRUD zadań, statusy, cache invalidation, audit |
| `Services/ProjectServiceTests.cs` | 5 | CRUD projektów, members CRUD, RBAC |
| `Services/ExportServiceTests.cs` | 4 | CSV builder, escape, separator |
| `Strategies/NotificationStrategyTests.cs` | 5 | Email/SMS/InApp + factory |
| `Strategies/AttachmentProcessorTests.cs` | 6 | Image/PDF/Generic + MIME routing |
| `Repositories/EfRepositoriesTests.cs` | 5 | EF Core repos (InMemory DB) |

### Integracyjne — 11 testów / 3 pliki

| Plik | Testy | Co pokrywa |
|---|---|---|
| `AuthEndpointsTests.cs` | 4 | rejestracja, logowanie, walidacja, JWT |
| `ProjectsEndpointsTests.cs` | 3 | lista, tworzenie, autoryzacja |
| `TasksEndpointsTests.cs` | 4 | CRUD zadań przez HTTP |

Testy E2E UI (Playwright) są w `../frontend/e2e/` — patrz [`../README.md`](../README.md#testy).

## Struktura projektu

```
backend/
├── TaskFlow.sln
├── .config/dotnet-tools.json           # local dotnet-ef
├── src/
│   ├── TaskFlow.Domain/                # encje + interfejsy repo + interfejsy strategii
│   │   ├── Entities/                   # User, Project, ProjectMember, TaskItem, Attachment, AuditEntry
│   │   ├── Enums/                      # ProjectRole, TaskItemStatus, NotificationChannel
│   │   ├── Repositories/               # IProjectRepository, ITaskRepository, IUserRepository, IAuditRepository
│   │   ├── Notifications/              # INotificationStrategy
│   │   └── Attachments/                # IAttachmentProcessor
│   │
│   ├── TaskFlow.Application/           # serwisy biznesowe (operują na interfejsach)
│   │   ├── Abstractions/               # IJwtTokenGenerator, IPasswordHasher, ITaskListCache, ...
│   │   ├── Dtos/                       # AuthDtos, ProjectDtos, TaskDtos, AttachmentDtos, ...
│   │   └── Services/                   # AuthService, ProjectService, TaskService, NotificationService, ...
│   │
│   ├── TaskFlow.Infrastructure/        # implementacje: EF Core, Cosmos, Redis, Blob, ServiceBus, strategie
│   │   ├── Persistence/                # TaskFlowDbContext + migracje EF Core
│   │   ├── Repositories/               # EfProjectRepository, EfTaskRepository, ...
│   │   ├── Cache/                      # RedisTaskListCache
│   │   ├── Storage/                    # AttachmentBlobStorage + ExportFileShareStorage
│   │   ├── Attachments/                # ImageThumbnailProcessor, PdfPreviewProcessor, GenericFileProcessor + AzureAiImageAnalyzer
│   │   ├── Notifications/              # EmailNotificationStrategy, SmsNotificationStrategy, InAppNotificationStrategy
│   │   └── Auth/                       # JwtTokenGenerator, BcryptPasswordHasher
│   │
│   ├── TaskFlow.Api/                   # warstwa wystawiająca HTTP
│   │   ├── Controllers/                # 7 controllerów (Auth, Projects, Tasks, Attachments, Exports, Users, Diagnostic)
│   │   ├── Auth/CurrentUserService.cs  # ekstrakcja claims z JWT do ICurrentUser
│   │   └── Program.cs                  # DI, JWT middleware, CORS, Swagger
│   │
│   └── TaskFlow.Functions/             # Azure Functions (isolated worker)
│       └── (BlobTrigger dla nowych attachmentów + ServiceBusTrigger dla powiadomień)
│
└── tests/
    ├── TaskFlow.UnitTests/             # xUnit + Moq + FluentAssertions — 46 testów
    └── TaskFlow.IntegrationTests/      # xUnit + WebApplicationFactory — 11 testów HTTP API
```

## Wzorce projektowe

### 1. Repository Pattern

Interfejsy w `TaskFlow.Domain/Repositories/`, implementacje EF Core w `TaskFlow.Infrastructure/Repositories/`.

- `IProjectRepository` → `EfProjectRepository`
- `ITaskRepository` → `EfTaskRepository`
- `IUserRepository` → `EfUserRepository`
- `IAuditRepository` → `CosmosAuditRepository` (NoSQL, append-only)

Serwisy w `TaskFlow.Application` zależą tylko od interfejsów, dzięki czemu są łatwo mockowalne w testach (Moq).

### 2. Strategy Pattern

**a) Notyfikacje** (`INotificationStrategy`):
- `EmailNotificationStrategy`
- `SmsNotificationStrategy`
- `InAppNotificationStrategy`

`NotificationService` dobiera strategię na podstawie `User.NotificationPreference` (enum `NotificationChannel`).

**b) Procesory załączników** (`IAttachmentProcessor`):
- `ImageThumbnailProcessor` — dla `image/*` generuje miniaturę 200×200
- `PdfPreviewProcessor` — dla `application/pdf` pierwsza strona
- `GenericFileProcessor` — dla pozostałych typów (zapis metadanych)

Function wybiera procesor po MIME type wgrywanego pliku. Po przetworzeniu wywoływana jest **Azure AI Vision** (Computer Vision Tags) dla obrazów — wynik (lista tagów) zapisywany do `Attachment.AiTagsJson`.

## Endpointy API

> Pełna lista i kontrakty: `http://localhost:5156/swagger`

### Auth (publiczne)
- `POST /api/auth/register` — rejestracja, zwraca `{token, expiresAt, user}`
- `POST /api/auth/login` — logowanie, zwraca to samo

### Projekty (wymagają JWT)
- `GET /api/projects` — lista projektów użytkownika
- `POST /api/projects` — utworzenie projektu
- `GET /api/projects/{id}` — szczegóły
- `PUT /api/projects/{id}` — edycja (tylko owner)
- `DELETE /api/projects/{id}` — usunięcie (tylko owner)
- `GET /api/projects/{id}/members` — lista członków
- `POST /api/projects/{id}/members` — dodanie członka po emailu
- `PATCH /api/projects/{id}/members/{userId}` — zmiana roli
- `DELETE /api/projects/{id}/members/{userId}` — usunięcie członka
- `GET /api/projects/{id}/members/{userId}/audit` — historia akcji konkretnego użytkownika w projekcie

### Zadania
- `GET /api/projects/{projectId}/tasks?status=N` — lista zadań projektu (z filtrem)
- `POST /api/projects/{projectId}/tasks` — utworzenie zadania
- `GET /api/tasks/{id}` — szczegóły
- `PUT /api/tasks/{id}` — edycja
- `DELETE /api/tasks/{id}` — usunięcie

### Załączniki
- `POST /api/tasks/{taskId}/attachments` — upload (multipart/form-data)
- `GET /api/tasks/{taskId}/attachments` — lista (z SAS URL ważnym 1h)
- `DELETE /api/tasks/{taskId}/attachments/{id}` — usunięcie pliku i metadanych
- `GET /api/tasks/{taskId}/audit` — historia zadania

### Eksport
- `POST /api/projects/{id}/exports` — generuje CSV (zapis na Azure Files)
- `GET /api/projects/{id}/exports` — lista wcześniejszych
- `GET /api/projects/{id}/exports/{fileName}` — pobranie pliku

### Użytkownicy
- `GET /api/users/me` — info o zalogowanym userze
- `PUT /api/users/me/notification-preference` — zmiana kanału powiadomień

## Wdrożenie na Azure

Backend jest gotowy do hostingu na **Azure App Service** (Windows, .NET 8). Konfiguracja przez **appsettings** App Service (te same klucze co user-secrets, prefiks `Jwt__`, `ConnectionStrings__` z double underscore).

Krok po kroku:
1. `dotnet publish src/TaskFlow.Api -c Release -o ./publish`
2. Spakować `./publish/*` do `publish.zip`
3. `az webapp deploy --resource-group <RG> --name <APP> --src-path publish.zip --type zip`
4. Ustawić appsettings w App Service (Settings → Configuration):
   - `Jwt__Secret`, `Jwt__Issuer`, `Jwt__Audience`
   - `ConnectionStrings__Sql`, `ConnectionStrings__Cosmos`, ...
   - `AiVision__Endpoint`, `AiVision__Key`
5. Restart Web App.

> CORS — w `Program.cs` whitelistowane są `http://localhost:{5173,3000,8081,19006}` (dev). Dla produkcji dorzuć tam domenę swojego frontendu.
