# Dashboard Rosa - Tabella Fonti Dati

## Statistiche Player Card - Origine Dati

| Statistica | Valore Esempio | Fonte Dati | Tabella Database | Calcolo |
|------------|----------------|------------|------------------|---------|
| **Minuti di Gioco** | 0' | API `/api/matches/all-events` | `match_events` | Somma di tutti i valori `minute` degli eventi del giocatore |
| **Partite Convocato** | 1 | API `/api/formations` | `formation_assignments` | Conteggio match unici dove il giocatore ha un record (TITOLARE o PANCHINA) |
| **Partite Titolare** | 1 | API `/api/formations` | `formation_assignments` | Conteggio match unici dove il giocatore ha `status = 'TITOLARE'` |
| **Partite Entrato** | 0 | API `/api/matches/all-events` | `match_events` | Conteggio match unici dove il giocatore ha almeno 1 evento registrato |
| **⚽ Goal** | 0 | API `/api/matches/all-events` | `match_events` | Conteggio eventi con `eventType = 'Gol'` del giocatore |
| **🟨 Cartellini Gialli** | 0 | API `/api/matches/all-events` | `match_events` | Conteggio eventi con `eventType = 'Cartellino Giallo'` del giocatore |
| **🟥 Cartellini Rossi** | 0 | API `/api/matches/all-events` | `match_events` | Conteggio eventi con `eventType = 'Cartellino Rosso'` del giocatore |

---

## Dettagli Implementazione

### 📊 Minuti di Gioco
```typescript
const minutiGiocati = playerEvents.reduce((total, event) => {
  return total + (event.minute || 0);
}, 0);
```
- **Logica**: Somma i minuti di tutti gli eventi del giocatore
- **Tabella**: `match_events.minute`
- **Filtro**: `playerId = player.id`

### 🏟️ Partite Convocato
```typescript
const matchesConvocato = new Set(
  allFormations.filter(f => f.playerId === player.id).map(f => f.matchId)
).size;
```
- **Logica**: Match unici dove esiste record in formation_assignments
- **Tabella**: `formation_assignments.matchId`
- **Filtro**: `playerId = player.id`
- **Status**: TITOLARE o PANCHINA

### 🥇 Partite Titolare
```typescript
const matchesTitolare = new Set(
  allFormations.filter(f => f.playerId === player.id && f.status === 'TITOLARE').map(f => f.matchId)
).size;
```
- **Logica**: Match unici dove giocatore è TITOLARE
- **Tabella**: `formation_assignments.status`
- **Filtro**: `playerId = player.id AND status = 'TITOLARE'`

### ⚡ Partite Entrato
```typescript
const matchesEntrato = new Set(
  playerEvents.map(e => e.matchId)
).size;
```
- **Logica**: Match unici dove il giocatore ha almeno 1 evento
- **Tabella**: `match_events.matchId`
- **Filtro**: `playerId = player.id`

### ⚽ Goal
```typescript
const goal = playerEvents.filter(e => e.eventType === 'Gol').length;
```
- **Logica**: Conta eventi di tipo "Gol"
- **Tabella**: `match_events.eventType`
- **Filtro**: `playerId = player.id AND eventType = 'Gol'`

### 🟨 Cartellini Gialli
```typescript
const cartelliniGialli = playerEvents.filter(e => e.eventType === 'Cartellino Giallo').length;
```
- **Logica**: Conta eventi di tipo "Cartellino Giallo"
- **Tabella**: `match_events.eventType`
- **Filtro**: `playerId = player.id AND eventType = 'Cartellino Giallo'`

### 🟥 Cartellini Rossi
```typescript
const cartelliniRossi = playerEvents.filter(e => e.eventType === 'Cartellino Rosso').length;
```
- **Logica**: Conta eventi di tipo "Cartellino Rosso"
- **Tabella**: `match_events.eventType`
- **Filtro**: `playerId = player.id AND eventType = 'Cartellino Rosso'`

---

## 🔄 Flusso Dati

1. **Frontend** (`/rosa`) carica:
   - `GET /api/players` → Lista giocatori
   - `GET /api/matches/all-events` → Tutti eventi partite
   - `GET /api/formations` → Tutte formazioni

2. **Calcolo Stats** (client-side):
   - Per ogni giocatore, filtra eventi e formazioni
   - Calcola statistiche aggregate
   - Passa `stats` al componente `PlayerCard`

3. **Render Card**:
   - Mostra statistiche nel layout verticale approvato
   - Colori distintivi per ogni metrica

---

## 📁 File Coinvolti

| File | Ruolo |
|------|-------|
| `client/src/pages/roster.tsx` | Calcolo statistiche (linee 36-88) |
| `client/src/components/PlayerCard.tsx` | Visualizzazione card (linee 143-176) |
| `server/routes.ts` | API endpoints |
| `server/storage.ts` | Query database |
| `shared/schema.ts` | Schema `match_events`, `formation_assignments` |

---

## ⚠️ Note Importanti

- **Minuti di Gioco**: Somma dei `minute` degli eventi (NON usa `minutesPlayed` da `formation_assignments`)
- **Partite Convocato vs Titolare vs Entrato**: 
  - Convocato = presente in formazione (titolare o panchina)
  - Titolare = partito come titolare (11 iniziali)
  - Entrato = ha almeno 1 evento registrato (ha giocato effettivamente)
- **Eventi**: Tutti filtrati da `match_events` con `playerId`
- **Calcolo real-time**: Stats calcolate ogni volta che si apre `/rosa`
