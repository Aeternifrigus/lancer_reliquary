# GameVault

Backend for a competitive multiplayer game: player accounts, match sessions,
ELO ratings, a leaderboard and item inventories. It's a TypeScript REST API
with a C++ client that talks to it the way a game client would.

```
gamevault-server/   Node.js, Express, MongoDB (TypeScript)
gamevault-client/   C++17, libcurl, nlohmann/json
```

## Server

### Running

```bash
cd gamevault-server
cp .env.example .env
npm install
docker run -d -p 27017:27017 --name gv-mongo mongo:7.0
npm run dev
```

Swagger UI is at http://localhost:3000/docs. There's also a Postman collection
in `postman_collection.json`.

With Docker Compose (API and MongoDB together):

```bash
cd gamevault-server
JWT_SECRET=<something long and random> docker compose up --build
```

### Endpoints

| Method | Path | Auth | |
|---|---|---|---|
| POST | `/auth/register` | | Create a player, returns a JWT |
| POST | `/auth/login` | | Log in, returns a JWT |
| GET | `/players/me` | yes | Own profile |
| GET | `/players/:id` | | Public profile and stats |
| POST | `/sessions` | yes | Create a session (`WAITING`) |
| GET | `/sessions/:id` | yes | Session with players |
| PATCH | `/sessions/:id/start` | yes | `WAITING` to `ACTIVE` |
| PATCH | `/sessions/:id/end` | yes | Submit results, update ELO and stats |
| GET | `/leaderboard` | | Ranked players, `?page=&limit=&minElo=` |
| GET | `/leaderboard/:playerId` | | One player's rank |
| POST | `/items/:playerId` | yes | Award an item |
| GET | `/items/:playerId` | | Inventory, `?type=&rarity=` |
| GET | `/healthz` | | Health check |

Every response has the same shape: `{ success, data?, message?, error? }`.
Validation errors add `details` with the failing field paths.

### ELO

Each player is rated against the average ELO of everyone else in the session.
K depends on experience:

| Player | K |
|---|---|
| Fewer than 30 games | 32 |
| 30 to 100 games | 24 |
| Over 100 games, or ELO 2400+ | 16 |

Ratings never go below 0, and a session with a single player doesn't change
anyone's rating.

### Tests

```bash
npm test
npm run test:coverage
npm run lint
```

The tests start an in-memory MongoDB (mongodb-memory-server), so nothing needs
to be running. `elo.test.ts` covers the rating maths on its own; the other
suites go through the HTTP layer with Supertest.

### Configuration

| Variable | Default | |
|---|---|---|
| `PORT` | `3000` | |
| `MONGODB_URI` | `mongodb://localhost:27017/gamevault` | required in production |
| `JWT_SECRET` | dev placeholder | required in production |
| `JWT_EXPIRES_IN` | `24h` | |
| `RATE_LIMIT_WINDOW_MS` | `900000` | 15 minutes |
| `RATE_LIMIT_MAX` | `100` | requests per window per IP |

## Client

A CLI that registers two players, plays a session between them, prints the
leaderboard and awards the winner an item.

```bash
# Debian/Ubuntu
sudo apt install libcurl4-openssl-dev nlohmann-json3-dev
cmake -S gamevault-client -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build
./build/gamevault-client http://localhost:3000
```

Or with Conan, which fetches both libraries:

```bash
cd gamevault-client
conan install . --output-folder build --build=missing
cmake -S . -B build -DCMAKE_TOOLCHAIN_FILE=build/conan_toolchain.cmake -DCMAKE_BUILD_TYPE=Release
cmake --build build
```

`HttpClient` wraps libcurl and turns 4xx/5xx responses into exceptions.
`GameVaultAPI` has one typed method per endpoint and parses responses into the
structs in `src/models/`.

## Known gaps

- Any logged-in player can award items to any player. This should need a
  server or admin token.
- Ending a session updates each player with a separate write, not in a
  transaction.
- No refresh tokens or token revocation.
- The client registers fixed usernames, so a second run against the same
  database fails with 409.

## License

MIT
