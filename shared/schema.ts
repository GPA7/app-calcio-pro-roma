import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, pgEnum, serial, unique, jsonb } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const formationStatusEnum = pgEnum('formation_status', ['TITOLARE', 'PANCHINA', 'N/D']);
export const matchEventTypeEnum = pgEnum('match_event_type', [
  'Gol', 
  'Assist',
  'Errore Goal',
  'Punteggio',
  'Sostituzione', 
  'Cartellino Giallo', 
  'Cartellino Rosso', 
  'Infortunio',
  'Rigore',
  'Corner',
  'Fuorigioco',
  'Nota',
  'Personalizzato',
  'Goal Subito'
]);
export const attendanceStatusEnum = pgEnum('attendance_status', ['Presente', 'Assente', 'Infortunato']);
export const convocationStatusEnum = pgEnum('convocation_status', ['Convocabile', 'Convocabile solo 1 allenamento', 'Infortunato', 'Espulso', 'Riabilitato', 'Riabilitato Infortunato', 'NC scelta tecnica', 'NC per assenze', 'NC per motivi societari']);

// Teams table (squadre del girone)
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Players table
export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  number: integer("number"),
  role: text("role"),
  position: text("position"), // Main position on field (e.g., "Difensore Centrale")
  roleSpecializations: jsonb("role_specializations").$type<Record<string, number>>(), // Multiple roles with percentages
  formationPositions: jsonb("formation_positions").$type<Record<string, string>>(), // Custom positions per formation (e.g., {"4-4-2": "TD", "4-3-3": "ALA"})
  convocationStatus: convocationStatusEnum("convocation_status").default('Convocabile'),
  isConvocato: integer("is_convocato").default(0), // 0 = non convocato, 1 = convocato
  
  // Disciplina e squalifiche
  yellowCards: integer("yellow_cards").default(0), // Numero cartellini gialli accumulati
  redCards: integer("red_cards").default(0), // Numero cartellini rossi ricevuti
  suspensionDays: integer("suspension_days").default(0), // Numero giornate squalifica rimanenti
  
  // Skills fondamentali (1-100)
  passaggio: integer("passaggio"),
  tiro: integer("tiro"),
  dribbling: integer("dribbling"),
  resistenza: integer("resistenza"),
  velocita: integer("velocita"),
  
  // Aspetto mentale (1-100)
  concentrazione: integer("concentrazione"),
  resilienza: integer("resilienza"),
  leadership: integer("leadership"),
  disciplina: integer("disciplina"),
  
  // Parere Mister (1-100 + commento)
  aspettoTattico: integer("aspetto_tattico"),
  condizioneFisica: integer("condizione_fisica"),
  atteggiamento: integer("atteggiamento"),
  commentoGenerale: text("commento_generale"),
  
  // Anagrafica & Documenti
  dataNascita: text("data_nascita"), // YYYY-MM-DD format
  tipoDocumento: text("tipo_documento"), // Carta d'identità, Patente, Passaporto
  numeroDocumento: text("numero_documento"),
  notePersonali: text("note_personali"),
  
  // Foto giocatore
  photoUrl: text("photo_url"), // URL della foto profilo
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Match sessions table
export const matchSessions = pgTable("match_sessions", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD format
  opponent: text("opponent"),
  formation: text("formation"),
  convocationId: integer("convocation_id").references(() => convocations.id, { onDelete: 'set null' }), // Collegamento alla convocazione
  startTime: timestamp("start_time"),
  firstHalfEndTime: timestamp("first_half_end_time"),
  secondHalfStartTime: timestamp("second_half_start_time"),
  endTime: timestamp("end_time"),
  firstHalfExtraTime: integer("first_half_extra_time").default(0), // Minuti supplementari 1° tempo
  secondHalfExtraTime: integer("second_half_extra_time").default(0), // Minuti supplementari 2° tempo
  finalScore: text("final_score"), // e.g., "3-1" (noi-avversario)
  homeScore: integer("home_score"), // Our score
  awayScore: integer("away_score"), // Opponent's score
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Formation assignments table (for match squads)
export const formationAssignments = pgTable("formation_assignments", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matchSessions.id, { onDelete: 'cascade' }).notNull(),
  playerId: integer("player_id").references(() => players.id, { onDelete: 'cascade' }).notNull(),
  status: formationStatusEnum("status").notNull().default('N/D'),
  minutesPlayed: integer("minutes_played").default(0), // Minuti totali giocati
  minuteEntered: integer("minute_entered"), // Minuto di entrata (null se titolare, numero se subentrato)
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  // UNIQUE constraint su (matchId, playerId) - richiesto da upsertFormation onConflictDoUpdate
  uniqueMatchPlayer: unique().on(table.matchId, table.playerId),
}));

// Match events table
export const matchEvents = pgTable("match_events", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matchSessions.id, { onDelete: 'cascade' }).notNull(),
  playerId: integer("player_id").references(() => players.id, { onDelete: 'cascade' }),
  playerInId: integer("player_in_id").references(() => players.id, { onDelete: 'cascade' }), // For substitutions: player entering
  eventType: matchEventTypeEnum("event_type").notNull(),
  customEventName: text("custom_event_name"), // For custom events
  minute: integer("minute").notNull(),
  half: integer("half"), // 1 or 2 for first/second half
  rating: integer("rating"), // Player rating (1-10) for 'Punteggio' events
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Custom event types table (admin configurable)
export const customEventTypes = pgTable("custom_event_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  icon: text("icon"),
  color: text("color"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sync status table (app/backend synchronization tracking)
export const syncStatus = pgTable("sync_status", {
  id: serial("id").primaryKey(),
  tableName: text("table_name").notNull().unique(),
  lastSynced: timestamp("last_synced").notNull(),
  recordCount: integer("record_count").notNull().default(0),
  status: text("status").notNull().default('synced'), // synced, pending, error
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Training attendance table
export const trainingAttendances = pgTable("training_attendances", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD format
  playerId: integer("player_id").references(() => players.id, { onDelete: 'cascade' }).notNull(),
  status: attendanceStatusEnum("status").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueDatePlayer: unique().on(table.date, table.playerId),
}));

// Saved formations table (for visual formation builder)
export const savedFormations = pgTable("saved_formations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD format
  formationType: text("formation_type").notNull(), // e.g., "4-4-2", "4-3-3"
  positionsJson: jsonb("positions_json"), // playerId -> position {playerId: {x, y}}
  benchJson: jsonb("bench_json"), // array of playerIds on bench
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Temporary player type for convocations (giocatori esterni da altre categorie)
export type TemporaryPlayer = {
  name: string; // Cognome Nome
  role: string; // Ruolo (es: "Centrocampista Centrale", "Difensore Centrale")
  status: 'TITOLARE' | 'PANCHINA'; // Stato nella formazione
};

// Convocations table (match call-ups with details)
export const convocations = pgTable("convocations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Convocazione 2025-10-15"
  matchDate: text("match_date").notNull(), // YYYY-MM-DD format
  fieldArrivalTime: text("field_arrival_time"), // HH:MM format
  matchStartTime: text("match_start_time"), // HH:MM format
  matchAddress: text("match_address"),
  opponent: text("opponent"),
  isHome: integer("is_home").default(1), // 1 = in casa, 0 = fuori casa
  playerIds: jsonb("player_ids").$type<number[]>(), // Array of convocated player IDs
  temporaryPlayers: jsonb("temporary_players").$type<TemporaryPlayer[]>(), // Giocatori temporanei da altre categorie
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tactical Setups table (for saving tactical formations with drawings)
export const tacticalSetups = pgTable("tactical_setups", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => matchSessions.id, { onDelete: 'cascade' }).notNull(),
  name: text("name").notNull(), // e.g., "Calcio d'angolo passivo", "Pressing alto"
  formationSystem: text("formation_system"), // e.g., "4-4-2", "4-3-3" 
  playerPositions: jsonb("player_positions").$type<{ playerId: number; x: number; y: number }[]>(), // Player positions on field
  zoneLines: jsonb("zone_lines").$type<{ attackLineY: number; midfieldLineY: number; defenseLineY: number }>(), // Movable zone dividers
  drawingData: jsonb("drawing_data").$type<{ type: string; coords: any; color: string; width: number; text?: string }[]>(), // Canvas drawings (arrows, lines, shapes, text)
  tacticalOptions: jsonb("tactical_options").$type<{ goalkeeper: string; defense: string; midfield: string; attack: string }>(), // Zone-based tactical variants
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const playersRelations = relations(players, ({ many }) => ({
  formationAssignments: many(formationAssignments),
  matchEvents: many(matchEvents),
  trainingAttendances: many(trainingAttendances),
}));

export const matchSessionsRelations = relations(matchSessions, ({ many, one }) => ({
  formationAssignments: many(formationAssignments),
  events: many(matchEvents),
  tacticalSetups: many(tacticalSetups),
  convocation: one(convocations, {
    fields: [matchSessions.convocationId],
    references: [convocations.id],
  }),
}));

export const formationAssignmentsRelations = relations(formationAssignments, ({ one }) => ({
  match: one(matchSessions, {
    fields: [formationAssignments.matchId],
    references: [matchSessions.id],
  }),
  player: one(players, {
    fields: [formationAssignments.playerId],
    references: [players.id],
  }),
}));

export const matchEventsRelations = relations(matchEvents, ({ one }) => ({
  match: one(matchSessions, {
    fields: [matchEvents.matchId],
    references: [matchSessions.id],
  }),
  player: one(players, {
    fields: [matchEvents.playerId],
    references: [players.id],
  }),
}));

export const trainingAttendancesRelations = relations(trainingAttendances, ({ one }) => ({
  player: one(players, {
    fields: [trainingAttendances.playerId],
    references: [players.id],
  }),
}));

export const tacticalSetupsRelations = relations(tacticalSetups, ({ one }) => ({
  match: one(matchSessions, {
    fields: [tacticalSetups.matchId],
    references: [matchSessions.id],
  }),
}));

// Insert schemas
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true });
export const insertPlayerSchema = createInsertSchema(players).omit({ id: true, createdAt: true });
export const insertMatchSessionSchema = createInsertSchema(matchSessions).omit({ id: true, createdAt: true });
export const insertFormationAssignmentSchema = createInsertSchema(formationAssignments).omit({ id: true, createdAt: true });
export const insertMatchEventSchema = createInsertSchema(matchEvents).omit({ id: true, createdAt: true });
export const insertCustomEventTypeSchema = createInsertSchema(customEventTypes).omit({ id: true, createdAt: true });
export const insertSyncStatusSchema = createInsertSchema(syncStatus).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTrainingAttendanceSchema = createInsertSchema(trainingAttendances).omit({ id: true, createdAt: true });
export const insertSavedFormationSchema = createInsertSchema(savedFormations).omit({ id: true, createdAt: true });
export const insertConvocationSchema = createInsertSchema(convocations).omit({ id: true, createdAt: true });
export const insertTacticalSetupSchema = createInsertSchema(tacticalSetups).omit({ id: true, createdAt: true });

// Types
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof players.$inferSelect;

export type InsertMatchSession = z.infer<typeof insertMatchSessionSchema>;
export type MatchSession = typeof matchSessions.$inferSelect;

export type InsertFormationAssignment = z.infer<typeof insertFormationAssignmentSchema>;
export type FormationAssignment = typeof formationAssignments.$inferSelect;

export type InsertMatchEvent = z.infer<typeof insertMatchEventSchema>;
export type MatchEvent = typeof matchEvents.$inferSelect;

export type InsertCustomEventType = z.infer<typeof insertCustomEventTypeSchema>;
export type CustomEventType = typeof customEventTypes.$inferSelect;

export type InsertSyncStatus = z.infer<typeof insertSyncStatusSchema>;
export type SyncStatus = typeof syncStatus.$inferSelect;

export type InsertTrainingAttendance = z.infer<typeof insertTrainingAttendanceSchema>;
export type TrainingAttendance = typeof trainingAttendances.$inferSelect;

export type InsertSavedFormation = z.infer<typeof insertSavedFormationSchema>;
export type SavedFormation = typeof savedFormations.$inferSelect;

export type InsertConvocation = z.infer<typeof insertConvocationSchema>;
export type Convocation = typeof convocations.$inferSelect;

export type InsertTacticalSetup = z.infer<typeof insertTacticalSetupSchema>;
export type TacticalSetup = typeof tacticalSetups.$inferSelect;

// Utility types for frontend
export type PlayerWithStats = Player & {
  totalPresenze?: number;
  totalAssenze?: number;
  totalInfortuni?: number;
  totalRitardi?: number;
};

export type MatchWithDetails = MatchSession & {
  events?: MatchEvent[];
  formations?: FormationAssignment[];
};

// Unauthorized Actions Log - tracks changes made without explicit user request
export const unauthorizedActions = pgTable("unauthorized_actions", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  actionType: text("action_type").notNull(), // DELETE, MODIFY, REMOVE, ADD
  entity: text("entity").notNull(), // player_name, player_role, formation, etc.
  description: text("description").notNull(), // What was changed
  affectedData: jsonb("affected_data").$type<Record<string, any>>(), // Data before change
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUnauthorizedActionSchema = createInsertSchema(unauthorizedActions).omit({
  id: true,
  createdAt: true,
});
export type InsertUnauthorizedAction = z.infer<typeof insertUnauthorizedActionSchema>;
export type UnauthorizedAction = typeof unauthorizedActions.$inferSelect;

// Available roles for players
export const PLAYER_ROLES = [
  'Portiere',
  'Difensore Centrale',
  'Terzino Destro',
  'Terzino Sinistro',
  'Braccetto Dx',
  'Braccetto Sx',
  'Libero',
  'Centrocampista Centrale',
  'Mediano',
  'Regista (Play)',
  'Mezzala Dx',
  'Mezzala Sx',
  'Centrocampista Avanzato (Trequartista)',
  'Ala Dx',
  'Ala Sx',
  'Esterno a Tutta Fascia (Quinto)',
  'Prima Punta (Centravanti)',
  'Seconda Punta'
] as const;

// Available formations
export const FORMATIONS = ['4-4-2', '4-3-3', '3-5-2', '4-2-3-1', '3-4-3', '5-3-2'] as const;

// Formation statuses
export const FORMATION_STATUSES = ['TITOLARE', 'PANCHINA', 'N/D'] as const;

// Attendance statuses
export const ATTENDANCE_STATUSES = ['Presente', 'Assente', 'Infortunato'] as const;
