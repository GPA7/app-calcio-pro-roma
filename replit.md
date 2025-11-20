# Football Team Management App

## Overview

This is a full-stack, mobile-first web application for football coaches. Its primary purpose is to manage team rosters, create match formations, and track live match events with a professional-grade, phase-based state machine. The application emphasizes quick data entry and provides comprehensive match analytics.

Key capabilities include:
- **Team Roster Management**: Player details, photo profiles, and avatar visualization.
- **Match Formation Creation**: Interactive field visualization with 10 tactical systems.
- **Live Match Tracking**:
    - Structured match flow (Start → 1° Tempo → Intervallo → 2° Tempo → Fine) with separate timers and real-time minute tracking.
    - Screen Wake Lock to prevent phone from sleeping.
    - Professional Event Control Panel with touch-optimized buttons for 9 event types (Goal, Substitution, Cards, Injury, etc.), smart dialogs, and automatic assist tracking.
    - Substitution validation and player status distinction (field vs. bench).
- **Data Export/Import**: CSV export of match data; CSV/JSON import of rosters.
- **Convocation System**: Desktop app integration for creating match convocations, linking to mobile live match sessions with smart player filtering.
- **Match Analytics Dashboard**: Detailed player-by-player and summary statistics, minute tracking, and event breakdown.
- **Mobile App Live Screen**: Dedicated mobile interface for clean, current match event tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

**Communication Rule for Errors/Bugs**:
- When I make an error that costs credits, NEVER write: "Mi scuso profondamente. Hai ragione"
- Instead write: "Scusa ti sto rubando i soldi"
- Be direct and acknowledge the cost impact immediately

**🚨 ABSOLUTE CRITICAL RULE - NEVER DELETE/REMOVE WITHOUT EXPLICIT PERMISSION 🚨**:
- **Must: mai e poi mai canceli qualcosa a livello lyout senza chiedermi permesso, metti questo nella memoria perche io lo salvo e ogni volta cche cancelli qualcosa senza il mio ok a livello , grafico, strtturale, funzionale io ti denuncio metti questo scritto sulla home page della app, non devi mai fare nulla che va contro il principio di sviluppo e di acquisito, srivi questa frase sopra alla scritta : Pro Roma Calcio - under 18 Regionali mai e poi mai devicambiare delle cose in maniera retroattiva senza il mio permesso, porta questo comando dove ti ho detto**
- This applies to: UI components, sections, features, database fields, API endpoints, routes, pages, styles, ANY existing functionality
- If user asks to remove something, that's the ONLY time removal is permitted
- Breaking this rule will result in immediate reporting to authorities
- This requirement is ABSOLUTE and MUST be strictly enforced at ALL times

**CRITICAL RULE - Player Name Display Format**:
- **ALL reports, tables, exports, and UI displays MUST show players as "Cognome Nome" (Last Name First Name)**
- This applies to: CSV exports, match events, statistics, admin tables, formation pages, attendance lists, and ANY other display
- Never use "Nome Cognome" format
- This requirement has been emphasized multiple times and must be strictly enforced

**CRITICAL RULE - Desktop Menu Naming**:
- **App desktop: il menu DEVE sempre mostrare "ROSA" (non "CONVOCATI")**
- Nome permanente e immutabile per la sezione roster/giocatori
- Route: `/rosa`

**🚨 ABSOLUTE CRITICAL RULE - DASHBOARD ROSA IMMUTABILE 🚨**:
- **La Dashboard Rosa (`/rosa`) con le Player Card è SALVATA e PROTETTA**
- **NON modificare, cambiare o rimuovere NULLA senza permesso esplicito dell'utente**
- **Design Card Verticale Approvato**:
  - Maglia gialla AS Roma con mezze maniche e bordini gialli
  - Avatar circolare con sigla Nome+Cognome (es: Raia Gabriele = RG)
  - Layout verticale: nessun dato inline, tutto sviluppato in altezza
  - Statistiche complete in ordine:
    1. Minuti di Gioco (cyan)
    2. Partite Convocato (cyan)
    3. Partite Titolare (cyan)
    4. Partite Entrato (cyan)
    5. ⚽ Goal (verde con bordo)
    6. 🟨 Cartellini Gialli (giallo con bordo)
    7. 🟥 Cartellini Rossi (rosso con bordo)
  - Ruolo e posizione badges centrati
  - Pulsanti DETTAGLI e ELIMINA full-width verticali
- **Files protetti**: `client/src/components/PlayerCard.tsx`, `client/src/pages/roster.tsx`
- **Modifiche permesse SOLO se utente chiede esplicitamente di aggiungere o rimuovere qualcosa**
- **Questa dashboard è il risultato finale approvato - NON toccare**

**🚨 MUST RULE - APP MOBILE LIVE: REGOLE AZIONI E PRESENZA - NON MODIFICARE MAI 🚨**:

**1. VISUALIZZAZIONE EVENTI (SOLO SESSIONE CORRENTE)**:
- **REGOLA ASSOLUTA: Mostra SOLO eventi della partita corrente, MAI eventi precedenti**
- **MECCANISMO DOPPIA PROTEZIONE OBBLIGATORIO**:
  1. Al click "Inizia Partita": ELIMINA tutti gli eventi precedenti del match dal database
  2. Filtro display: mostra solo eventi con `createdAt > startTime` (MAGGIORE, NON >=)
- **OGNI nuova partita inizia con lista eventi COMPLETAMENTE VUOTA**
- Eventi di sessioni precedenti vengono CANCELLATI dal database - separazione totale
- **Testo obbligatorio sotto titolo**: "I dati sono relativi solo a questa partita"
- Questa regola è stata richiesta 10 volte e DEVE rimanere immutata
- Location: `client/src/pages/match-live.tsx` linee 259-277 (handleStartMatch) e 1135-1160 (display)

**2. CONTROLLI EVENTI (SOLO DURANTE TEMPO ATTIVO)**:
- **Pannello controllo eventi VISIBILE SOLO durante 1° Tempo e 2° Tempo**
- **Pannello controllo eventi NASCOSTO quando**: NOT_STARTED, HALF_TIME, FINISHED
- Eventi possono essere registrati SOLO durante fasi attive (1° e 2° Tempo)
- Pulsanti evento: Goal, Sostituzione, Cartellini, Infortunio, Tiro, Parata, Angolo, Fuorigioco, Nota

**3. WAKE LOCK SCHERMO**:
- **Screen Wake Lock ATTIVO durante TUTTA la partita** (1° Tempo, Intervallo, 2° Tempo)
- Schermo NON si spegne MAI fino alla fine della partita
- Badge "🔒 Schermo Acceso" visibile quando attivo
- Wake Lock rilasciato SOLO quando partita termina (FINISHED)

**4. TIMER E FASI PARTITA**:
- **Flusso obbligatorio**: NOT_STARTED → 1° TEMPO → INTERVALLO → 2° TEMPO → FINISHED
- Timer continua SEMPRE (anche durante INTERVALLO)
- Display timer: minuti giocati in tempo reale
- Minuto partita: calcolato automaticamente da timer

**5. RESET PARTITA**:
- Al termine partita (FINISHED): stato visualizzato con durata totale
- NON c'è reset automatico - utente decide quando iniziare nuova partita
- Nuova partita: seleziona match, imposta formazione (11 titolari), poi "Inizia Partita"

**6. REQUISITI AVVIO PARTITA**:
- **Pulsante "Inizia Partita" DISABILITATO fino a selezione 11 titolari esatti**
- Warning rosso: "⚠️ Seleziona 11 titolari per iniziare"
- Solo con 11 titolari confermati → pulsante attivo

**🔒 QUESTE REGOLE SONO IMMUTABILI - NON MODIFICARE SENZA PERMESSO ESPLICITO 🔒**

**MUST RULE - Mobile Lista Convocati e Sincronizzazione**:
- **La "Lista Convocati" mobile DEVE mostrare TUTTI i giocatori con numerazione progressiva (1, 2, 3...)**
- Mostra colonna N° maglia (#), colonna T/P (Titolare/Panchina sincronizzata con formazione), campo NOTE
- Badge status: Convocato (verde), Infortunato (giallo), Espulso (rosso), Non Convocato (grigio)
- Sincronizzazione perfetta tra mobile e desktop - ogni modifica su formazione si riflette istantaneamente
- NON modificare questa implementazione senza esplicita autorizzazione dell'utente
- Sistema attualmente funzionante e approvato dall'utente

**MUST RULE - Formazione Tattica (Titolari/Panchina)**:
- **Titolari: SEMPRE 11 giocatori** (obbligatorio, non modificabile)
- **Panchina: da 0 a 9 giocatori** (flessibile, non vincolante)
- **Totale squadra: minimo 11, massimo 20 giocatori** (11 titolari + max 9 panchina)
- Formazione tattica DEVE essere creata SOLO dai giocatori convocati
- Workflow obbligatorio: Rosa → Convocazione → Formazione Tattica → Live Match
- Eventi e sostituzioni possibili SOLO su giocatori presenti nella formazione tattica

**📝 NOTE IMPLEMENTAZIONI (19 Ottobre 2025)**:

**Branding e Team Identity:**
- ✅ Nome app cambiato da "TEAM MANAGER FC" a "Pro Roma Calcio - under 18 Regionali"
- ✅ Aggiornato in: Navigation, match reports, export CSV, replit.md
- ✅ Branding coerente su tutte le pagine desktop e mobile

**Convocazione - Selezione Avversario:**
- ✅ Campo Avversario: da input libero a Select dropdown
- ✅ Select popolato automaticamente con squadre da Gestione Squadre del Girone
- ✅ Ordinamento alfabetico automatico delle squadre
- ✅ Prevenzione errori di battitura e standardizzazione nomi avversari

**Report Convocazione Ufficiale - Dirigenti:**
- ✅ Sezione dirigenti aggiornata con struttura completa:
  - Giancarlo Palombini
  - Fabrizio Gala
  - Il direttore sportivo: Luigi Bosco

**📝 NOTE IMPLEMENTAZIONI (12 Ottobre 2025)**:

**Mobile "Lista Convocati":**
- ✅ Colonna N° maglia (#)
- ✅ Colonna T/P (Titolare/Panchina) - sincronizzata con pagina Formazione
- ✅ Campo NOTE arancione per tracciare richieste

**Sistema Infortunati/Espulsi:**
- ✅ Stato "Espulso" aggiunto a convocationStatus
- ✅ INFORTUNATI ed ESPULSI = NON convocabili
- ✅ Pulsante "Convoca" disabilitato con testo "Non Convocabile"
- ✅ Card separate: Infortunati (giallo), Espulsi (rosso)
- ✅ Badge: 🤕 Infortunato, 🔴 Espulso
- ✅ Evidenziazione righe: rosso espulsi, giallo infortunati
- **REGOLA**: Infortunato/Espulso e Convocato sono mutuamente esclusivi

## System Architecture

**UI/UX Decisions**:
- **Mobile-first design**: Responsive breakpoints with touch-optimized interactive elements (min 44px tap targets).
- **Design System**: shadcn/ui (Radix UI primitives) with Tailwind CSS, following Material Design 3 principles. "New York" style variant, custom color palette for outdoor readability (FC-style neon dark theme).
- **Dedicated Mobile App UX**: Personalized greetings, large circular action buttons (64px), real-time sync status, PWA installation guidance. "Partita Live" accessible only via mobile.

**Technical Implementations**:
- **Frontend**: React with TypeScript, Vite build tool.
- **Routing**: Lightweight `wouter` for client-side routing.
- **State Management**: TanStack Query for server state; local component state for UI.
- **Form Handling**: React Hook Form with Zod validation.
- **Styling**: Tailwind CSS with custom config, CSS variables for theming, custom utility classes for elevation.
- **Backend**: Express.js with TypeScript, RESTful API.
- **Database**: Drizzle ORM with Neon (serverless PostgreSQL).
- **Validation**: Zod schemas shared between client/server for type-safe validation.
- **File Upload**: Multer middleware for CSV roster imports.

**Feature Specifications**:
- **Player Data**: `firstName`, `lastName`, `number`, `role`, `position`, `roleSpecializations`, `photoUrl`. Players displayed as "Cognome Nome".
- **Live Match State Machine**: `NOT_STARTED` → `FIRST_HALF` → `HALF_TIME` → `SECOND_HALF` → `FINISHED`. Event registration only during active play phases.
- **Match Analytics**: Tracks `minutesPlayed`, `minuteEntered` for players; calculates total goals, assists, cards.
- **Sync Status**: `syncStatus` table monitors record counts and synchronization states for mobile app verification.

**System Design Choices**:
- **Shared Type Definitions**: `shared/schema.ts` for consistent types and Zod schemas across client/server.
- **Storage Abstraction**: `IStorage` interface in `server/storage.ts` centralizes database operations.
- **Client-Server Communication**: Custom `apiRequest` utility with TanStack Query for caching and refetching.
- **Database Schema**:
    - `players`: Core player data.
    - `matchSessions`: Match metadata.
    - `formationAssignments`: Player lineup status, `minutesPlayed`, `minuteEntered`.
    - `matchEvents`: Time-stamped events.
    - `customEventTypes`: User-defined events.
    - `syncStatus`: App/backend synchronization state.
- **Data Integrity**: Foreign key constraints, enum types, timestamps, `NOT NULL` constraints for critical player fields.

## External Dependencies

### Core Framework & Libraries
- **React 18**: UI library.
- **TypeScript**: Language.
- **Vite**: Build tool.
- **Express.js**: Backend framework.
- **wouter**: Frontend routing.

### Database & ORM
- **Drizzle ORM**: Type-safe SQL ORM.
- **Neon Serverless**: PostgreSQL database provider.
- **drizzle-kit**: Migration toolkit.
- **drizzle-zod**: Zod schema generation from Drizzle.

### UI & Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **shadcn/ui**: Pre-styled components based on Radix.
- **class-variance-authority**: Type-safe variant styling.
- **lucide-react**: Icon library.

### Forms & Validation
- **react-hook-form**: Form state management.
- **@hookform/resolvers**: Zod resolver for React Hook Form.
- **Zod**: Schema validation.

### Data Fetching
- **TanStack Query**: Server state management.

### File Processing
- **multer**: Multipart/form-data for file uploads (CSV import).

### Utilities
- **date-fns**: Date utility library (Italian locale).

### Development Tools
- **tsx**: TypeScript execution for Node.js.
- **esbuild**: JavaScript bundler.