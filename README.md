# howbot

Discord bot for [osu!](https://osu.ppy.sh). Prefix and slash commands look up profiles, scores, beatmaps, leaderboards, and daily challenges, and calculate performance points locally with the osu! rulesets instead of calling a third-party PP service.

Add it to a server: [invite link](https://discord.com/api/oauth2/authorize?client_id=1009059114904731718&scope=applications.commands+bot).

## What it does

Players link an osu! account over OAuth. Prefix and slash commands then read the osu! API on their behalf, cache beatmaps and users in MongoDB, and render replies as embeds or charts.

| Area | Examples |
| --- | --- |
| Profiles | Profile card, avatar, rank requirements, mod spread in the top 100, changes since the last update |
| Scores | Recent plays, top plays, score compare, map leaderboards, score import |
| Beatmaps | Beatmap card, search, ranked-map history, scheduled qualified and ranked notifications |
| Daily challenge | Current challenge, leaderboards, streaks, thresholds, player profile |
| Sniping | Snipe profile, daily snipe stats, firsts |
| Ranking | Global and country leaderboards |
| Graphs | Playcount, rank, and daily-challenge threshold charts rendered with Chart.js |
| Server | Custom prefixes, reminders, help, guild settings |

Commands are loaded from `src/commands` at startup. In Discord, `help` lists them.

## Performance calculation

Score performance is not computed in TypeScript. A .NET 8 library, `dotnet/howbot.PerformanceCalculator`, references the osu! game and ruleset projects (osu, taiko, catch, mania). Node loads that assembly with [Edge.js](https://github.com/agracio/edge-js) and calls two entry points on `howbot.PerformanceCalculator.Edge.EdgeBridge`:

- `CalculatePerformance` scores a real play from hit statistics, combo, mods, and accuracy. It can also return full-combo and SS variants.
- `SimulatePerformance` estimates a play from a beatmap, mods, and a target accuracy.

Beatmap `.osu` files are downloaded into a local cache before calculation. The bridge is `src/class/api/osu/PerformanceCalculator`.

Building the calculator requires a local clone of [ppy/osu](https://github.com/ppy/osu) next to this repository (`../osu` from the project root). See the project references in `dotnet/howbot.PerformanceCalculator/howbot.PerformanceCalculator.csproj`.

## Stack

- TypeScript, Node.js, discord.js 14
- MongoDB
- C# / .NET 8, osu! framework rulesets, Edge.js
- Chart.js and node-canvas for graphs
- osu! API v2 with user OAuth and client-credentials fallback
- Jest for integration tests

## Layout

```
src/
  commands/          prefix and slash commands, grouped by feature
  class/
    api/osu/         osu! API client, OAuth, and the Edge.js calculator bridge
    database/        MongoDB models
    graphs/          chart renderers
  events/            Discord gateway handlers
  tracking/          beatmap and reminder loops
  sockets/           score-import client
dotnet/
  howbot.PerformanceCalculator/   PP calculation against the osu! rulesets
```

On startup the client connects to MongoDB, logs in to Discord, registers slash commands, and starts two loops: reminders every minute, and beatmap tracking every five minutes. Set `DISABLE_TRACKING` to skip beatmap tracking. A small HTTP server on `PORT` completes the osu! OAuth callback, then redirects the player to howbot.net.

## Requirements

- Node.js 20 or newer
- [pnpm](https://pnpm.io)
- MongoDB
- .NET 8 SDK, only if you build the performance calculator
- A Discord application (bot token and application id)
- An osu! API OAuth client
- A clone of [ppy/osu](https://github.com/ppy/osu) at `../osu`, only if you build the performance calculator
- Native build tools for `canvas` and `sharp`

## Setup

```bash
pnpm install
cp .env.template .env
```

Fill in `.env` (see below), then:

```bash
# optional: build the performance calculator
pnpm dotnet:build

pnpm dev
```

`pnpm dev` runs the bot with `tsx` in watch mode. `pnpm dotnet:build` bootstraps Edge.js and publishes `howbot.PerformanceCalculator.dll`.

Point `DOTNET_BUILD_PATH` at the publish folder. The default output of `pnpm dotnet:build` is `dotnet/howbot.PerformanceCalculator/publish`.

## Environment

Copy `.env.template` and set the values the process reads. Do not commit `.env`.

| Variable                   | Purpose                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| `DISCORD_TOKEN`            | Bot token                                                                     |
| `APPLICATION_ID`           | Discord application id, used to register slash commands                       |
| `PREFIX`                   | Default command prefix (`!` if unset on the guild)                            |
| `PREFIX_FORCE`             | Optional prefix that overrides guild and user prefixes (used for development) |
| `DATABASE_URL`             | MongoDB connection string                                                     |
| `DATABASE_NAME`            | Database name                                                                 |
| `OSU_ID`                   | osu! OAuth client id                                                          |
| `OSU_CLIENT_SECRET`        | osu! OAuth client secret                                                      |
| `OSU_REDIRECT_URL`         | OAuth redirect URL; the bot serves `/osu` on `PORT`                           |
| `PORT`                     | HTTP port for the OAuth callback                                              |
| `DOTNET_BUILD_PATH`        | Directory containing `howbot.PerformanceCalculator.dll`                       |
| `BEATMAP_CACHE`            | Directory for downloaded `.osu` files. Defaults to `cache/beatmaps/osu`       |
| `ASSETS_PATH`              | Path to local image assets. Defaults to `assets/` in the template             |
| `LOG_GUILD`                | Guild used for internal logging                                               |
| `LOG_CHANNEL`              | Channel used for internal logging                                             |
| `DIFFICULTY_EMOTES_SERVER` | Guild that hosts difficulty emoji assets                                      |
| `DISABLE_TRACKING`         | Set to disable new ranked beatmap tracking                                    |
| `NODE_ENV`                 | `development`, `production`, or `test`                                        |

## Tests

```bash
pnpm test
```

The Jest tests under `src/__test__` are integration tests. They connect to MongoDB and the osu! API, so they need a configured `.env` and will not pass in a clean checkout.
