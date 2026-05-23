# 🐾 Animal Hunt

En FPS arena-shooter i browseren, bygget med **Three.js + TypeScript + Vite**.
Du er en jæger fanget i vildmarken: overlev bølger af vilde dyr (ulve, vildsvin, bjørne),
saml mønter fra nedlagte dyr, og køb bedre våben i shoppen mellem bølgerne.

## Kom i gang

```bash
npm install      # installer afhængigheder (kun første gang)
npm run dev      # start udviklingsserver → åbn http://localhost:5173
```

Klik på spillet for at fange musen og begynd at spille. (Tryk **Esc** for at slippe musen / pause.)

### Andre kommandoer

```bash
npm run build      # byg produktionsversion til dist/ (tsc + vite)
npm run preview    # se den byggede version lokalt
npm run typecheck  # kør kun TypeScript-tjek
```

## Styring

| Tast | Handling |
| --- | --- |
| **W A S D** | Bevæg dig |
| **Mus** | Sigt / kig |
| **Venstreklik** | Skyd |
| **R** | Genlad |
| **1–4** | Skift våben |
| **Shift** | Løb |
| **M** | Slå lyd til/fra |
| **Esc** | Pause |

## Spillet

- **Wave-based arena:** dyrene kommer i stadig sværere bølger. Når en bølge er ryddet,
  åbner **shoppen**.
- **Mønter** falder fra dræbte dyr og suges automatisk mod dig.
- **Shop:** køb nye våben (maskinpistol, haglgevær, snigskytteriffel, maskingevær,
  raketkaster, minigun), fyld ammunition op, og helbred dig selv.
- **Game over**, hvis dit helbred når 0 — så starter du forfra.

## Projektstruktur

```
src/
├── main.ts            # entry + hovedloop
├── config.ts          # globale konstanter
├── types.ts           # delte TypeScript-typer
├── core/              # SceneSetup, Input, Audio (procedural lyd), AssetLoader, Game
├── entities/          # Player, Weapon (arsenal), Monster, creatures, viewmodels
├── systems/           # WaveManager, Combat (hitscan), Economy
├── ui/                # HUD, Shop, Menu (alt på dansk), ui.css
└── data/              # weapons.ts, monsters.ts (data-drevet, nemt at balancere)
```

## Kører på Windows

Spillet er et browser-spil og kører derfor **uændret på Windows** i Chrome, Edge eller
Firefox — enten via udviklingsserveren (`npm run dev`) eller den byggede version.
Byg med `npm run build` og host `dist/`-mappen hvor som helst (itch.io, GitHub Pages,
Netlify), så kan det åbnes direkte i en Windows-browser uden installation.

## Grafik & assets

Dyrene er **rigtige 3D-modeller** (`.glb` i `public/models/`):

- 🐺 **Ulv**, 🦊 **Ræv**, 🦌 **Hjort** og 🐂 **Tyr** – fuldt animerede modeller
  (Walk/Gallop/Attack/Death) fra Quaternius (CC0).
- 🐗 **Vildsvin** og 🐻 **Bjørn** – rigtige modeller, der får bevægelse (bob + angrebs-lunge)
  via kode, da der ikke fandtes gratis animerede versioner.

`AssetLoader` (`src/core/AssetLoader.ts`) indlæser modellerne, og `MonsterView`
(`src/entities/MonsterView.ts`) håndterer både animerede og statiske modeller. Mangler en
model, falder spillet automatisk tilbage til en procedural figur (`creatures.ts`).

Våben, miljø (træer/sten/jord) og **al lyd** er stadig genereret proceduralt i koden.

### Kreditering (assets)

| Model | Skaber | Licens |
| --- | --- | --- |
| Ulv | [Quaternius](https://poly.pizza/m/P1gU3Qkr9r) | CC0 (ingen kreditering krævet) |
| Ræv | [Quaternius](https://poly.pizza/m/Bc97C66HKi) | CC0 |
| Hjort | [Quaternius](https://poly.pizza/m/tQdzbZ1Cmw) | CC0 |
| Tyr | [Quaternius](https://poly.pizza/m/a8PIIYwF7r) | CC0 |
| Vildsvin | [Poly by Google](https://poly.pizza/m/57fSWum6F1P) | CC-BY 3.0 |
| Bjørn | [Poly by Google](https://poly.pizza/m/4knUstaaX5C) | CC-BY 3.0 |

CC-BY kræver kreditering – behold derfor denne tabel (eller en tilsvarende credits-skærm),
hvis spillet udgives.

## Senere: installerbar app (PWA)

Tilføj `vite-plugin-pwa` (manifest + service worker) for at gøre spillet installerbart
direkte fra browseren som en selvstændig app.
