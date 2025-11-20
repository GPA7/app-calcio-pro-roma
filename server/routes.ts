import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTeamSchema, insertPlayerSchema, insertMatchEventSchema, insertTrainingAttendanceSchema, insertConvocationSchema } from "@shared/schema";
import multer from "multer";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ===== TEAM ROUTES =====
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.getTeam(parseInt(req.params.id));
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team" });
    }
  });

  app.post("/api/teams", async (req, res) => {
    try {
      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(validatedData);
      res.status(201).json(team);
    } catch (error) {
      res.status(400).json({ error: "Invalid team data" });
    }
  });

  app.put("/api/teams/:id", async (req, res) => {
    try {
      const validatedData = insertTeamSchema.parse(req.body);
      const team = await storage.updateTeam(parseInt(req.params.id), validatedData);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }
      res.json(team);
    } catch (error) {
      res.status(400).json({ error: "Invalid team data" });
    }
  });

  app.delete("/api/teams/:id", async (req, res) => {
    try {
      await storage.deleteTeam(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete team" });
    }
  });
  
  // ===== PLAYER ROUTES =====
  app.get("/api/players", async (req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get("/api/players/:id", async (req, res) => {
    try {
      const player = await storage.getPlayer(parseInt(req.params.id));
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player" });
    }
  });

  app.get("/api/players/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getPlayerMatchStats(parseInt(req.params.id));
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player statistics" });
    }
  });

  app.post("/api/players", async (req, res) => {
    try {
      const validatedData = insertPlayerSchema.parse(req.body);
      const player = await storage.createPlayer(validatedData);
      res.status(201).json(player);
    } catch (error) {
      res.status(400).json({ error: "Invalid player data" });
    }
  });

  app.put("/api/players/:id", async (req, res) => {
    try {
      const validatedData = insertPlayerSchema.parse(req.body);
      const player = await storage.updatePlayer(parseInt(req.params.id), validatedData);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      res.status(400).json({ error: "Invalid player data" });
    }
  });

  app.patch("/api/players/:id", async (req, res) => {
    try {
      const updates = req.body;
      
      // REGOLA CRITICA: Se il giocatore viene impostato come Infortunato o Espulso,
      // deve essere AUTOMATICAMENTE rimosso dalla convocazione
      if (updates.convocationStatus === 'Infortunato' || updates.convocationStatus === 'Espulso') {
        updates.isConvocato = 0;
      }
      
      const player = await storage.updatePlayer(parseInt(req.params.id), updates);
      if (!player) {
        return res.status(404).json({ error: "Player not found" });
      }
      res.json(player);
    } catch (error) {
      res.status(400).json({ error: "Invalid player data" });
    }
  });

  app.delete("/api/players/:id", async (req, res) => {
    try {
      await storage.deletePlayer(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete player" });
    }
  });

  // ===== MATCH SESSION ROUTES =====
  app.get("/api/matches", async (req, res) => {
    try {
      const matches = await storage.getMatches();
      res.json(matches);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  // Get ALL match events (for statistics) - MUST be before /api/matches/:id
  app.get("/api/matches/all-events", async (req, res) => {
    try {
      const events = await storage.getAllMatchEvents();
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all match events" });
    }
  });

  app.get("/api/matches/:id", async (req, res) => {
    try {
      const match = await storage.getMatch(parseInt(req.params.id));
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch match" });
    }
  });

  app.post("/api/matches", async (req, res) => {
    try {
      const match = await storage.createMatch(req.body);
      res.status(201).json(match);
    } catch (error) {
      res.status(400).json({ error: "Invalid match data" });
    }
  });

  app.post("/api/matches/:id/start", async (req, res) => {
    try {
      const match = await storage.updateMatch(parseInt(req.params.id), {
        startTime: new Date()
      });
      res.json(match);
    } catch (error) {
      res.status(500).json({ error: "Failed to start match" });
    }
  });

  app.get("/api/matches/:id/events", async (req, res) => {
    try {
      const events = await storage.getMatchEvents(parseInt(req.params.id));
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch match events" });
    }
  });

  app.post("/api/matches/:id/events", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const validatedData = insertMatchEventSchema.parse({
        ...req.body,
        matchId
      });
      const event = await storage.createMatchEvent(validatedData);
      
      // Se è una sostituzione, aggiorna automaticamente la formazione
      if (validatedData.eventType === 'Sostituzione' && validatedData.playerInId) {
        // Aggiorna il giocatore che entra: registra minuteEntered
        await storage.updateFormationMinutes(matchId, validatedData.playerInId, {
          minuteEntered: validatedData.minute,
        });
      }
      
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid event data" });
    }
  });

  app.get("/api/match-events/player/:playerId", async (req, res) => {
    try {
      const events = await storage.getMatchEventsByPlayer(parseInt(req.params.playerId));
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch player events" });
    }
  });

  app.delete("/api/match-events/:id", async (req, res) => {
    try {
      await storage.deleteMatchEvent(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete match event" });
    }
  });

  // Delete all events for a specific match (used for session reset)
  app.delete("/api/matches/:matchId/events", async (req, res) => {
    try {
      await storage.deleteAllMatchEvents(parseInt(req.params.matchId));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete match events" });
    }
  });

  app.get("/api/matches/:id/stats", async (req, res) => {
    try {
      const stats = await storage.getMatchStats(parseInt(req.params.id));
      if (!stats) {
        return res.status(404).json({ error: "Match not found" });
      }
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch match stats" });
    }
  });

  app.patch("/api/matches/:id", async (req, res) => {
    try {
      const match = await storage.updateMatch(parseInt(req.params.id), req.body);
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }
      res.json(match);
    } catch (error) {
      res.status(400).json({ error: "Invalid match data" });
    }
  });

  app.delete("/api/matches/:id", async (req, res) => {
    try {
      await storage.deleteMatch(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete match" });
    }
  });

  // ===== FORMATION ROUTES =====
  // Get ALL formations (for statistics)
  app.get("/api/formations", async (req, res) => {
    try {
      const formations = await storage.getAllFormations();
      res.json(formations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch all formations" });
    }
  });

  app.get("/api/formations/:matchId", async (req, res) => {
    try {
      const formations = await storage.getFormationsByMatch(parseInt(req.params.matchId));
      res.json(formations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch formations" });
    }
  });

  app.post("/api/formations", async (req, res) => {
    try {
      console.log("📥 POST /api/formations - Body ricevuto:", JSON.stringify(req.body));
      const { matchId, formations } = req.body;
      
      // Validazione dati in ingresso
      if (!matchId) {
        console.log("❌ matchId mancante");
        return res.status(400).json({ error: "matchId è obbligatorio" });
      }
      
      if (!formations || !Array.isArray(formations)) {
        console.log("❌ formations non è array:", formations);
        return res.status(400).json({ error: "formations deve essere un array" });
      }
      
      if (formations.length === 0) {
        console.log("❌ formations array vuoto");
        return res.status(400).json({ error: "formations non può essere vuoto" });
      }
      
      console.log(`✅ Validazione OK - matchId: ${matchId}, formations count: ${formations.length}`);
      
      const savedFormations = [];
      for (const form of formations) {
        console.log(`  Processing formation:`, form);
        if (!form.playerId || !form.status) {
          console.log("❌ playerId o status mancante:", form);
          return res.status(400).json({ 
            error: "Ogni formazione deve avere playerId e status",
            received: form
          });
        }
        
        const saved = await storage.upsertFormation({
          matchId,
          playerId: form.playerId,
          status: form.status,
          ...(form.minutesPlayed !== undefined && { minutesPlayed: form.minutesPlayed }),
          ...(form.minuteEntered !== undefined && { minuteEntered: form.minuteEntered }),
        });
        console.log(`  ✅ Saved formation for player ${form.playerId}`);
        savedFormations.push(saved);
      }
      
      console.log(`✅ Tutte le formazioni salvate - count: ${savedFormations.length}`);
      res.status(201).json(savedFormations);
    } catch (error) {
      console.error("❌ ERRORE POST /api/formations:", error);
      console.error("Stack:", error instanceof Error ? error.stack : 'N/A');
      res.status(400).json({ 
        error: "Invalid formation data",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.patch("/api/formations/:matchId/:playerId/minutes", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const playerId = parseInt(req.params.playerId);
      const updates = req.body;
      
      const updated = await storage.updateFormationMinutes(matchId, playerId, updates);
      if (!updated) {
        return res.status(404).json({ error: "Formation assignment not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: "Failed to update formation minutes" });
    }
  });

  // ===== SAVED FORMATIONS ROUTES (Visual Formation Builder) =====
  app.get("/api/formations/saved", async (req, res) => {
    try {
      const formations = await storage.getSavedFormations();
      res.json(formations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch saved formations" });
    }
  });

  app.get("/api/formations/saved/:id", async (req, res) => {
    try {
      const formation = await storage.getSavedFormation(parseInt(req.params.id));
      if (!formation) {
        return res.status(404).json({ error: "Formation not found" });
      }
      res.json(formation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch formation" });
    }
  });

  app.post("/api/formations/saved", async (req, res) => {
    try {
      const formation = await storage.createSavedFormation(req.body);
      res.status(201).json(formation);
    } catch (error) {
      res.status(400).json({ error: "Failed to save formation" });
    }
  });

  app.delete("/api/formations/saved/:id", async (req, res) => {
    try {
      await storage.deleteSavedFormation(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete formation" });
    }
  });

  app.get("/api/players/with-status", async (req, res) => {
    res.json({ test: "REBUILD CHECK - timestamp: " + Date.now() });
  });
  
  app.get("/api/players/with-status-v2", async (req, res) => {
    try {
      console.log('[DEBUG] Fetching players with status...');
      const players = await storage.getPlayersWithStatus();
      console.log('[DEBUG] Players fetched:', players?.length || 0);
      res.json(players);
    } catch (error) {
      console.error('[ERROR] getPlayersWithStatus failed:', error);
      res.status(500).json({ 
        error: "Failed to fetch players",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // ===== CONVOCATION ROUTES =====
  app.get("/api/convocations", async (req, res) => {
    try {
      const convocations = await storage.getConvocations();
      res.json(convocations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch convocations" });
    }
  });

  app.get("/api/convocations/:id", async (req, res) => {
    try {
      const convocation = await storage.getConvocation(parseInt(req.params.id));
      if (!convocation) {
        return res.status(404).json({ error: "Convocation not found" });
      }
      res.json(convocation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch convocation" });
    }
  });

  app.post("/api/convocations", async (req, res) => {
    try {
      const validatedData = insertConvocationSchema.parse(req.body);
      const convocation = await storage.createConvocation(validatedData);
      res.status(201).json(convocation);
    } catch (error) {
      res.status(400).json({ error: "Invalid convocation data" });
    }
  });

  app.patch("/api/convocations/:id", async (req, res) => {
    try {
      const convocation = await storage.updateConvocation(parseInt(req.params.id), req.body);
      if (!convocation) {
        return res.status(404).json({ error: "Convocation not found" });
      }
      res.json(convocation);
    } catch (error) {
      res.status(400).json({ error: "Invalid convocation data" });
    }
  });

  app.delete("/api/convocations/:id", async (req, res) => {
    try {
      await storage.deleteConvocation(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete convocation" });
    }
  });

  // ===== TACTICAL SETUPS ROUTES =====
  // Get all tactical setups
  app.get("/api/tactical-setups", async (req, res) => {
    try {
      const tacticalSetups = await storage.getAllTacticalSetups();
      res.json(tacticalSetups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tactical setups" });
    }
  });

  // Get tactical setups by match
  app.get("/api/tactical-setups/:matchId", async (req, res) => {
    try {
      const tacticalSetups = await storage.getTacticalSetupsByMatch(parseInt(req.params.matchId));
      res.json(tacticalSetups);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tactical setups" });
    }
  });

  app.post("/api/tactical-setups", async (req, res) => {
    try {
      const tacticalSetup = await storage.createTacticalSetup(req.body);
      res.status(201).json(tacticalSetup);
    } catch (error) {
      res.status(400).json({ error: "Invalid tactical setup data" });
    }
  });

  app.delete("/api/tactical-setups/:id", async (req, res) => {
    try {
      await storage.deleteTacticalSetup(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tactical setup" });
    }
  });

  // ===== SYNC STATUS ROUTES =====
  app.get("/api/sync/status", async (req, res) => {
    try {
      const syncStatuses = await storage.getSyncStatus();
      
      // If no sync status exists, initialize with current counts
      if (syncStatuses.length === 0) {
        const tables = ['players', 'matches', 'formations', 'events'];
        const initialized = [];
        
        for (const tableName of tables) {
          let count = 0;
          if (tableName === 'players') count = (await storage.getPlayers()).length;
          if (tableName === 'matches') count = (await storage.getMatches()).length;
          
          const status = await storage.updateSyncStatus(tableName, count, 'synced');
          initialized.push(status);
        }
        
        return res.json(initialized);
      }
      
      res.json(syncStatuses);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sync status" });
    }
  });

  app.post("/api/sync/refresh", async (req, res) => {
    try {
      const playersCount = (await storage.getPlayers()).length;
      const matchesCount = (await storage.getMatches()).length;
      
      await storage.updateSyncStatus('players', playersCount, 'synced');
      await storage.updateSyncStatus('matches', matchesCount, 'synced');
      await storage.updateSyncStatus('formations', 0, 'synced');
      await storage.updateSyncStatus('events', 0, 'synced');
      
      const syncStatuses = await storage.getSyncStatus();
      res.json(syncStatuses);
    } catch (error) {
      res.status(500).json({ error: "Failed to refresh sync status" });
    }
  });

  // ===== ADMIN ROUTES =====
  app.get("/api/admin/export-matches/:month", async (req, res) => {
    try {
      const month = req.params.month;
      const matches = await storage.getMatches();
      const players = await storage.getPlayers();
      
      // Filter matches by month
      const monthMatches = matches.filter(m => m.date.startsWith(month));
      
      // Build CSV
      let csv = "Data,Avversario,Minuto,Giocatore,Evento,Note\n";
      
      for (const match of monthMatches) {
        const events = await storage.getMatchEvents(match.id);
        for (const event of events) {
          const player = players.find(p => p.id === event.playerId);
          const playerName = player ? `${player.lastName} ${player.firstName}` : '';
          csv += `${match.date},${match.opponent || ''},${event.minute},${playerName},${event.eventType},${event.description || ''}\n`;
        }
      }
      
      res.json({ csv, month });
    } catch (error) {
      res.status(500).json({ error: "Failed to export match data" });
    }
  });

  app.post("/api/admin/upload-roster", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const content = req.file.buffer.toString('utf-8');
      let playersToAdd: any[] = [];

      // Parse CSV or JSON
      if (req.file.mimetype === 'application/json' || req.file.originalname.endsWith('.json')) {
        playersToAdd = JSON.parse(content);
      } else {
        // Parse CSV
        const lines = content.split('\n').filter(line => line.trim());
        
        // Check if first line is a header (contains known column names)
        const firstLine = lines[0].toLowerCase();
        const hasHeader = firstLine.includes('nome') || firstLine.includes('name') || 
                          firstLine.includes('cognome') || firstLine.includes('surname') ||
                          firstLine.includes('numero') || firstLine.includes('number') ||
                          firstLine.includes('ruolo') || firstLine.includes('role');
        
        const startIndex = hasHeader ? 1 : 0;
        const headers = hasHeader ? lines[0].split(',').map(h => h.trim().toLowerCase()) : [];
        
        for (let i = startIndex; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim());
          const player: any = {};
          
          if (hasHeader) {
            // Parse with headers
            let firstName = '';
            let lastName = '';
            
            headers.forEach((header, index) => {
              if (header === 'numero' || header === 'number') {
                player.number = values[index] ? parseInt(values[index]) : undefined;
              } else if (header === 'nome' || header === 'name') {
                firstName = values[index] || '';
              } else if (header === 'cognome' || header === 'surname' || header === 'lastname') {
                lastName = values[index] || '';
              } else if (header === 'ruolo' || header === 'role') {
                player.role = values[index];
              }
            });
            
            // Combine nome and cognome if both exist, otherwise use nome
            if (firstName && lastName) {
              player.name = `${firstName} ${lastName}`;
            } else if (firstName) {
              player.name = firstName;
            } else if (lastName) {
              player.name = lastName;
            }
          } else {
            // No header: assume format is Cognome,Nome or Nome,Cognome or just Nome
            if (values.length >= 2 && values[0] && values[1]) {
              // Two columns: assume Cognome,Nome
              player.name = `${values[1]} ${values[0]}`;
            } else if (values.length === 1 && values[0]) {
              // One column: just the name
              player.name = values[0];
            } else if (values[0]) {
              // Fallback: use first value
              player.name = values[0];
            }
            
            // Check for number and role in additional columns
            if (values[2]) {
              const num = parseInt(values[2]);
              if (!isNaN(num)) player.number = num;
            }
            if (values[3]) {
              player.role = values[3];
            }
          }
          
          // Only require name to be present
          if (player.name) {
            playersToAdd.push(player);
          }
        }
      }

      // Add all players
      const addedPlayers = [];
      for (const player of playersToAdd) {
        const validatedData = insertPlayerSchema.parse(player);
        const added = await storage.createPlayer(validatedData);
        addedPlayers.push(added);
      }

      res.status(201).json({ 
        message: `${addedPlayers.length} players added successfully`,
        players: addedPlayers 
      });
    } catch (error) {
      console.error(error);
      res.status(400).json({ error: "Failed to upload roster" });
    }
  });

  app.get("/api/admin/export-roster", async (req, res) => {
    try {
      const players = await storage.getPlayers();
      
      // Build CSV with all player data
      let csv = "#,Nome,Cognome,Ruolo,Posizione,Stato Convocazione,Convocato\n";
      
      for (const player of players) {
        csv += `${player.number || ''},${player.lastName},${player.firstName},${player.role || ''},${player.position || ''},${player.convocationStatus || ''},${player.isConvocato ? 'Sì' : 'No'}\n`;
      }
      
      res.json({ csv });
    } catch (error) {
      res.status(500).json({ error: "Failed to export roster" });
    }
  });

  app.get("/api/admin/export-match/:matchId", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      const match = await storage.getMatch(matchId);
      
      if (!match) {
        return res.status(404).json({ error: "Match not found" });
      }
      
      const events = await storage.getMatchEvents(matchId);
      const players = await storage.getPlayers();
      
      // Build CSV with match details and all events
      let csv = `Partita vs ${match.opponent || 'N/A'} - ${match.date}\n`;
      csv += `Formazione: ${match.formation || 'N/A'}\n`;
      csv += `Risultato: ${match.finalScore || (match.homeScore !== null && match.awayScore !== null ? `${match.homeScore}-${match.awayScore}` : 'N/A')}\n\n`;
      csv += "Minuto,Giocatore,Evento,Descrizione\n";
      
      for (const event of events) {
        const player = players.find(p => p.id === event.playerId);
        const playerName = player ? `${player.lastName} ${player.firstName}` : 'N/A';
        csv += `${event.minute},${playerName},${event.eventType},${event.description || ''}\n`;
      }
      
      res.json({ csv, date: match.date });
    } catch (error) {
      res.status(500).json({ error: "Failed to export match" });
    }
  });

  // ===== TEST DATA SEEDING =====
  app.post("/api/seed-test-data", async (req, res) => {
    try {
      // Create test players if none exist
      const existingPlayers = await storage.getPlayers();
      if (existingPlayers.length === 0) {
        const testPlayers = [
          { firstName: "Mario", lastName: "Rossi", number: 1, role: "Portiere" },
          { firstName: "Luigi", lastName: "Bianchi", number: 2, role: "Difensore Centrale" },
          { firstName: "Giovanni", lastName: "Verdi", number: 3, role: "Terzino Destro" },
          { firstName: "Paolo", lastName: "Neri", number: 4, role: "Centrocampista Centrale" },
          { firstName: "Marco", lastName: "Blu", number: 10, role: "Centrocampista Avanzato (Trequartista)" },
          { firstName: "Andrea", lastName: "Gialli", number: 9, role: "Prima Punta (Centravanti)" },
        ];

        for (const player of testPlayers) {
          await storage.createPlayer(player);
        }
      }

      // Create a test match
      const today = new Date().toISOString().split('T')[0];
      const testMatch = await storage.createMatch({
        date: today,
        opponent: "Squadra Avversaria",
        formation: "4-4-2"
      });

      res.json({ 
        message: "Test data created successfully",
        players: await storage.getPlayers(),
        match: testMatch
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to seed test data" });
    }
  });

  // ===== TRAINING ATTENDANCE ROUTES =====
  app.get("/api/attendances", async (req, res) => {
    try {
      const attendances = await storage.getAllAttendances();
      res.json(attendances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendances" });
    }
  });

  // Specific routes must come BEFORE parameterized routes
  app.get("/api/attendances/weekly-planner", async (req, res) => {
    try {
      // Get week start date from query param, default to current week
      const weekStartDate = (req.query.date as string) || new Date().toISOString().split('T')[0];
      const plannerData = await storage.getWeeklyPlanner(weekStartDate);
      res.json(plannerData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch weekly planner data" });
    }
  });

  app.get("/api/attendances/monthly-planner", async (req, res) => {
    try {
      // Get year-month from query param, default to current month (format: "2025-10")
      const now = new Date();
      const yearMonth = (req.query.yearMonth as string) || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const plannerData = await storage.getMonthlyPlanner(yearMonth);
      res.json(plannerData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly planner data" });
    }
  });

  app.get("/api/attendances/recent/:days?", async (req, res) => {
    try {
      const days = req.params.days ? parseInt(req.params.days) : 7;
      const recentAttendances = await storage.getRecentAttendancesByPlayer(days);
      res.json(recentAttendances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch recent attendances" });
    }
  });

  app.get("/api/attendances/:date", async (req, res) => {
    try {
      const attendances = await storage.getAttendancesByDate(req.params.date);
      res.json(attendances);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendances" });
    }
  });

  app.post("/api/attendances", async (req, res) => {
    try {
      const validatedData = insertTrainingAttendanceSchema.parse(req.body);
      const attendance = await storage.upsertAttendance(validatedData);
      res.json(attendance);
    } catch (error) {
      console.error("Attendance validation error:", error);
      res.status(400).json({ error: "Invalid attendance data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/attendances/:id", async (req, res) => {
    try {
      await storage.deleteAttendance(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete attendance" });
    }
  });

  // ===== TRAINING SESSIONS ADMIN ROUTES =====
  app.get("/api/admin/training-sessions", async (req, res) => {
    try {
      const sessions = await storage.getTrainingSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch training sessions" });
    }
  });

  app.delete("/api/admin/training-sessions/:date", async (req, res) => {
    try {
      await storage.deleteTrainingSession(req.params.date);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete training session" });
    }
  });

  app.get("/api/admin/export-training/:date", async (req, res) => {
    try {
      const date = req.params.date;
      const attendances = await storage.getAttendancesByDate(date);
      const players = await storage.getPlayers();
      
      const playersMap = new Map(players.map(p => [p.id, p]));
      
      const csvRows = [
        ['Data', 'Nome', 'Numero', 'Ruolo', 'Status'].join(',')
      ];
      
      attendances.forEach(att => {
        const player = playersMap.get(att.playerId);
        if (player) {
          const playerName = `${player.lastName} ${player.firstName}`;
          csvRows.push([
            date,
            playerName,
            player.number || '',
            player.role || '',
            att.status
          ].join(','));
        }
      });
      
      const csv = csvRows.join('\n');
      res.json({ csv, date });
    } catch (error) {
      res.status(500).json({ error: "Failed to export training" });
    }
  });

  // ===== UNAUTHORIZED ACTIONS LOG ROUTES =====
  app.get("/api/unauthorized-actions", async (req, res) => {
    try {
      const actions = await storage.getUnauthorizedActions();
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch unauthorized actions" });
    }
  });

  app.post("/api/unauthorized-actions", async (req, res) => {
    try {
      const action = await storage.createUnauthorizedAction(req.body);
      res.status(201).json(action);
    } catch (error) {
      res.status(400).json({ error: "Invalid action data" });
    }
  });

  app.delete("/api/unauthorized-actions", async (req, res) => {
    try {
      await storage.clearUnauthorizedActions();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to clear unauthorized actions" });
    }
  });

  // ===== ADMIN: COMPLETE MATCH DELETION WITH STATISTICS RESET =====
  app.delete("/api/admin/matches/:matchId/complete", async (req, res) => {
    try {
      const matchId = parseInt(req.params.matchId);
      
      // 1. Get all players who had cards or were suspended
      const allPlayers = await storage.getPlayers();
      const formations = await storage.getFormationsByMatch(matchId);
      
      // 2. For each player who had suspensionDays > 0, increment by 1
      // (reverse the -1 decrement that was applied when match was saved)
      for (const player of allPlayers) {
        if (player.suspensionDays && player.suspensionDays > 0) {
          // Check if player was in this match's formation (meaning they were affected by this match save)
          const wasInMatch = formations.some(f => f.playerId === player.id);
          if (wasInMatch) {
            await storage.updatePlayer(player.id, {
              ...player,
              suspensionDays: player.suspensionDays + 1
            });
          }
        }
      }

      // 3. Delete all match events (this resets goal/cards counts automatically)
      await storage.deleteAllMatchEvents(matchId);
      
      // 4. Reset minutes played for all formation assignments
      for (const formation of formations) {
        await storage.updateFormationMinutes(matchId, formation.playerId, {
          minutesPlayed: 0,
          minuteEntered: undefined
        });
      }
      
      // 5. Delete the match itself
      await storage.deleteMatch(matchId);
      
      res.status(204).send();
    } catch (error) {
      console.error("Complete match deletion error:", error);
      res.status(500).json({ error: "Failed to delete match completely" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
