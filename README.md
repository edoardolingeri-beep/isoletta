# Isoletta 🏝️

Gioco idle / city-builder rilassante: fai crescere un'isola tropicale in stile "giocattolo 3D".
Vite + TypeScript + three.js, pensato per il telefono in verticale (touch) e giocabile da browser.

## Avvio

```bash
npm install
npm run dev        # server di sviluppo (già esposto in rete locale)
npm run build      # controllo tipi + build in dist/
npm run preview    # serve la build in dist/
```

### Provarlo sul telefono

1. Computer e telefono sulla **stessa rete Wi-Fi**.
2. `npm run dev`: Vite stampa anche un indirizzo `Network:`, per esempio `http://192.168.1.23:5173/`.
3. Apri quell'indirizzo nel browser del telefono. Se non si apre, controlla che il firewall del computer
   lasci passare la porta 5173.
4. Facoltativo: "Aggiungi a schermata Home" (Safari o Chrome) per giocare a schermo intero come un'app.

Per farlo provare a qualcuno fuori casa: `npm run build` e carica la cartella `dist/` su un hosting
statico qualsiasi (GitHub Pages, Netlify, Cloudflare Pages...). I percorsi sono relativi, quindi
funziona anche in una sottocartella.

## Come si gioca

- **Un dito**: sposta la vista (più ti allontani dal centro più "tira", e lasciando una molla riporta l'isola al centro) ·
  **due dita**: pizzico per lo zoom, rotazione delle dita per girare l'isola · desktop: tasto sinistro sposta, destro ruota, rotellina zoomma.
- Tocca **palme e alberi** (legna), il **banco di pesci** con la boa (pesce; quando lo esaurisci si sposta in un altro punto della costa) e le **conchiglie** sulla spiaggia.
  Ogni oggetto ha poche cariche e poi ricresce.
- Tocca i **lotti** (bolla "+") per costruire Capanna, Orto, Molo e, nella foresta, il Faro. Ogni edificio
  ha 3 livelli e cambia aspetto. Una bolla verde con "!" vuol dire che puoi permettertelo.
- Il **cartello sopra la nebbia** sblocca la Foresta; le altre zone sono "presto".
- La **bellezza** (stella in alto) aumenta le monete prodotte e fa passare più **barche di turisti**:
  toccale per avere una mancia.
- Il gioco ha giorno e notte (finestre illuminate, lucciole, il faro che gira), pioggia (l'orto produce di più),
  e guadagni **offline** con il popup "Bentornato!".
- In alto c'è sempre una **missione**: toccala per farti portare all'obiettivo, o per riscuotere il premio.

Dalla console del browser: `game.cheat(1000)` aggiunge risorse per i test.
Da Impostazioni (ingranaggio) si spengono suoni e vibrazione o si ricomincia da capo.

## Struttura

```
src/
  config/            ← dati di gioco, si bilancia tutto da qui
    buildings.ts       edifici: costi, produzione, bellezza, abitanti per livello
    zones.ts           zone dell'isola, posizione di oggetti, lotti e decorazioni
    gatherables.ts     oggetti da toccare (cariche, ricrescita)
    quests.ts          missioni in sequenza
    balance.ts         numeri globali (offline, giorno/notte, barche, pioggia...)
    resources.ts       risorse
  game/
    state.ts           stato e salvataggio in localStorage
    economy.ts         calcolo produzione, bellezza, guadagni offline
    quests.ts          avanzamento missioni
    game.ts            orchestratore: mondo, input, economia, interfaccia
  scene/
    stage.ts           renderer, luci, mare (shader), ciclo giorno/notte
    controls.ts        camera "diorama" touch
    island.ts          terreno a dischi e banchi di nebbia
    materials.ts       palette colori "caramella"
    models/            modelli 3D (vedi sotto)
    entities/          palme, edifici, abitanti, barche, lucciole e pioggia
  fx/                  tween (rimbalzi, pop) e particelle
  ui/                  HUD, pannelli, icone SVG, suoni e vibrazione
```

## Sostituire i modelli con file .glb

Tutti i modelli passano da `createModel(chiave)` (`src/scene/models/registry.ts`). Le chiavi sono quelle
in `PROCEDURAL` dentro `procedural.ts` (es. `building.hut.2`, `nature.palm`, `char.villager`).

1. Metti il file in `public/models/`, per esempio `public/models/capanna-2.glb`.
2. Aggiungi una riga a `src/scene/models/manifest.ts`:
   ```ts
   'building.hut.2': 'models/capanna-2.glb',
   ```
3. Fatto: al caricamento viene usato il .glb; se il file manca o è rotto si torna al modello procedurale.

Nel .glb: origine alla base (y = 0 è il terreno), davanti verso +Z (il molo si allunga verso +X),
1 unità ≈ 1 metro (un omino è alto circa 1).
Alcune animazioni leggono elementi con nome dai modelli procedurali (`userData.crown` della palma,
`beam` del faro, `rig` dell'omino); con un .glb queste parti stanno ferme finché non le colleghi.
