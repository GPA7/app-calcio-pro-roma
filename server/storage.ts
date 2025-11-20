import { 
  teams,
  players, 
  matchSessions,
  formationAssignments,
  matchEvents,
  customEventTypes,
  syncStatus,
  trainingAttendances,
  savedFormations,
  tacticalSetups,
  unauthorizedActions,
  type Team,
  type InsertTeam,
  type Player, 
  type InsertPlayer,
  type MatchSession,
  type InsertMatchSession,
  type FormationAssignment,
  type InsertFormationAssignment,
  type MatchEvent,
  type InsertMatchEvent,
  type CustomEventType,
  type InsertCustomEventType,
  type SyncStatus,
  type InsertSyncStatus,
  type TrainingAttendance,
  type InsertTrainingAttendance,
  type SavedFormation,
  type InsertSavedFormation,
  type TacticalSetup,
  type InsertTacticalSetup,
  type Convocation,
  type InsertConvocation,
  type UnauthorizedAction,
  type InsertUnauthorizedAction,
  convocations
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql, or, inArray } from "drizzle-orm";

export interface IStorage {
  // Teams
  getTeams(): Promise<Team[]>;
  getTeam(id: number): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: number, team: InsertTeam): Promise<Team | undefined>;
  deleteTeam(id: number): Promise<void>;
  
  // Players
  getPlayers(): Promise<Player[]>;
  getPlayer(id: number): Promise<Player | undefined>;
  createPlayer(player: InsertPlayer): Promise<Player>;
  updatePlayer(id: number, player: InsertPlayer): Promise<Player | undefined>;
  deletePlayer(id: number): Promise<void>;
  
  // Match Sessions
  getMatches(): Promise<MatchSession[]>;
  getMatch(id: number): Promise<MatchSession | undefined>;
  createMatch(match: InsertMatchSession): Promise<MatchSession>;
  updateMatch(id: number, match: Partial<InsertMatchSession>): Promise<MatchSession | undefined>;
  deleteMatch(id: number): Promise<void>;
  
  // Formation Assignments
  getAllFormations(): Promise<FormationAssignment[]>;
  getFormationsByMatch(matchId: number): Promise<FormationAssignment[]>;
  upsertFormation(formation: InsertFormationAssignment): Promise<FormationAssignment>;
  updateFormationMinutes(matchId: number, playerId: number, updates: { minutesPlayed?: number; minuteEntered?: number; status?: 'TITOLARE' | 'PANCHINA' | 'N/D' }): Promise<FormationAssignment | undefined>;
  
  // Match Events
  getMatchEvents(matchId: number): Promise<MatchEvent[]>;
  getAllMatchEvents(): Promise<MatchEvent[]>;
  getMatchEventsByPlayer(playerId: number): Promise<MatchEvent[]>;
  createMatchEvent(event: InsertMatchEvent): Promise<MatchEvent>;
  deleteMatchEvent(id: number): Promise<void>;
  deleteAllMatchEvents(matchId: number): Promise<void>;
  getMatchStats(matchId: number): Promise<any>;
  
  // Custom Event Types
  getCustomEventTypes(): Promise<CustomEventType[]>;
  createCustomEventType(eventType: InsertCustomEventType): Promise<CustomEventType>;
  
  // Sync Status
  getSyncStatus(): Promise<SyncStatus[]>;
  updateSyncStatus(tableName: string, recordCount: number, status: string): Promise<SyncStatus>;
  
  // Training Attendances
  getAllAttendances(): Promise<TrainingAttendance[]>;
  getAttendancesByDate(date: string): Promise<TrainingAttendance[]>;
  upsertAttendance(attendance: InsertTrainingAttendance): Promise<TrainingAttendance>;
  deleteAttendance(id: number): Promise<void>;
  getTrainingSessions(): Promise<{ date: string; presenti: number; assenti: number; infortunati: number; totale: number }[]>;
  deleteTrainingSession(date: string): Promise<void>;
  getRecentAttendancesByPlayer(days?: number): Promise<{ playerId: number; presentiCount: number; infortunatoCount: number }[]>;
  getWeeklyPlanner(weekStartDate: string): Promise<{
    weekStart: string;
    days: { monday: string; wednesday: string; thursday: string };
    players: Array<{
      id: number;
      firstName: string;
      lastName: string;
      number: number | null;
      role: string | null;
      attendances: {
        monday: string | null;
        wednesday: string | null;
        thursday: string | null;
      };
    }>;
  }>;
  
  getMonthlyPlanner(yearMonth: string): Promise<{
    yearMonth: string;
    trainingDays: Array<{ date: string; dayName: string; dayNum: number; monthAbbr: string }>;
    players: Array<{
      id: number;
      firstName: string;
      lastName: string;
      number: number | null;
      role: string | null;
      attendances: Record<string, string | null>;
      totalPresenze: number;
      totalAssenze: number;
    }>;
  }>;
  
  // Saved Formations
  getSavedFormations(): Promise<SavedFormation[]>;
  getSavedFormation(id: number): Promise<SavedFormation | undefined>;
  createSavedFormation(formation: InsertSavedFormation): Promise<SavedFormation>;
  deleteSavedFormation(id: number): Promise<void>;
  getPlayersWithStatus(): Promise<Array<Player & { isInjured: boolean; lowAttendance: boolean }>>;
  
  // Convocations
  getConvocations(): Promise<Convocation[]>;
  getConvocation(id: number): Promise<Convocation | undefined>;
  createConvocation(convocation: InsertConvocation): Promise<Convocation>;
  updateConvocation(id: number, convocation: Partial<InsertConvocation>): Promise<Convocation | undefined>;
  deleteConvocation(id: number): Promise<void>;
  
  // Tactical Setups
  getAllTacticalSetups(): Promise<TacticalSetup[]>;
  getTacticalSetupsByMatch(matchId: number): Promise<TacticalSetup[]>;
  createTacticalSetup(setup: InsertTacticalSetup): Promise<TacticalSetup>;
  deleteTacticalSetup(id: number): Promise<void>;
  
  // Unauthorized Actions Log
  getUnauthorizedActions(): Promise<UnauthorizedAction[]>;
  createUnauthorizedAction(action: InsertUnauthorizedAction): Promise<UnauthorizedAction>;
  clearUnauthorizedActions(): Promise<void>;
  
  // Player Statistics (Advanced)
  getPlayerMatchStats(playerId: number): Promise<{
    matchesWon: number;
    matchesDrawn: number;
    matchesLost: number;
    goalsScored: number;
    goalsConceded: number; // Only for goalkeepers
  }>;
}

export class DatabaseStorage implements IStorage {
  // Teams
  async getTeams(): Promise<Team[]> {
    return db.select().from(teams).orderBy(teams.name);
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db.insert(teams).values(team).returning();
    return newTeam;
  }

  async updateTeam(id: number, team: InsertTeam): Promise<Team | undefined> {
    const [updated] = await db.update(teams)
      .set(team)
      .where(eq(teams.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteTeam(id: number): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }

  // Players
  async getPlayers(): Promise<Player[]> {
    return db.select().from(players).orderBy(players.number);
  }

  async getPlayer(id: number): Promise<Player | undefined> {
    const [player] = await db.select().from(players).where(eq(players.id, id));
    return player || undefined;
  }

  async createPlayer(player: InsertPlayer): Promise<Player> {
    const [newPlayer] = await db.insert(players).values(player).returning();
    return newPlayer;
  }

  async updatePlayer(id: number, player: InsertPlayer): Promise<Player | undefined> {
    const [updated] = await db.update(players)
      .set(player)
      .where(eq(players.id, id))
      .returning();
    return updated || undefined;
  }

  async deletePlayer(id: number): Promise<void> {
    await db.delete(players).where(eq(players.id, id));
  }

  // Match Sessions
  async getMatches(): Promise<MatchSession[]> {
    return db.select().from(matchSessions).orderBy(matchSessions.date);
  }

  async getMatch(id: number): Promise<MatchSession | undefined> {
    const [match] = await db.select().from(matchSessions).where(eq(matchSessions.id, id));
    return match || undefined;
  }

  async createMatch(match: InsertMatchSession): Promise<MatchSession> {
    const [newMatch] = await db.insert(matchSessions).values(match).returning();
    return newMatch;
  }

  async updateMatch(id: number, match: Partial<InsertMatchSession>): Promise<MatchSession | undefined> {
    const [updated] = await db.update(matchSessions)
      .set(match)
      .where(eq(matchSessions.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteMatch(id: number): Promise<void> {
    await db.delete(matchSessions).where(eq(matchSessions.id, id));
  }

  // Formation Assignments
  async getAllFormations(): Promise<FormationAssignment[]> {
    return db.select().from(formationAssignments);
  }

  async getFormationsByMatch(matchId: number): Promise<FormationAssignment[]> {
    return db.select().from(formationAssignments).where(eq(formationAssignments.matchId, matchId));
  }

  async upsertFormation(formation: InsertFormationAssignment): Promise<FormationAssignment> {
    const [result] = await db.insert(formationAssignments)
      .values(formation)
      .onConflictDoUpdate({
        target: [formationAssignments.matchId, formationAssignments.playerId],
        set: {
          // Status sempre presente (evita updateFields vuoti che causano SQL invalido)
          status: formation.status,
          // Campi opzionali aggiunti solo se presenti
          ...(formation.minutesPlayed !== undefined && { minutesPlayed: formation.minutesPlayed }),
          ...(formation.minuteEntered !== undefined && { minuteEntered: formation.minuteEntered }),
        }
      })
      .returning();
    return result;
  }

  async updateFormationMinutes(matchId: number, playerId: number, updates: { minutesPlayed?: number; minuteEntered?: number; status?: 'TITOLARE' | 'PANCHINA' | 'N/D' }): Promise<FormationAssignment | undefined> {
    const [updated] = await db.update(formationAssignments)
      .set(updates)
      .where(and(
        eq(formationAssignments.matchId, matchId),
        eq(formationAssignments.playerId, playerId)
      ))
      .returning();
    return updated || undefined;
  }

  // Match Events
  async getMatchEvents(matchId: number): Promise<MatchEvent[]> {
    return db.select().from(matchEvents)
      .where(eq(matchEvents.matchId, matchId))
      .orderBy(matchEvents.minute);
  }

  async getAllMatchEvents(): Promise<MatchEvent[]> {
    return db.select().from(matchEvents).orderBy(matchEvents.createdAt);
  }

  async createMatchEvent(event: InsertMatchEvent): Promise<MatchEvent> {
    const [newEvent] = await db.insert(matchEvents).values(event).returning();
    return newEvent;
  }

  async getMatchEventsByPlayer(playerId: number): Promise<MatchEvent[]> {
    return db.select().from(matchEvents).where(eq(matchEvents.playerId, playerId)).orderBy(matchEvents.createdAt);
  }

  async deleteMatchEvent(id: number): Promise<void> {
    await db.delete(matchEvents).where(eq(matchEvents.id, id));
  }

  async deleteAllMatchEvents(matchId: number): Promise<void> {
    await db.delete(matchEvents).where(eq(matchEvents.matchId, matchId));
  }

  async getMatchStats(matchId: number): Promise<any> {
    const match = await this.getMatch(matchId);
    if (!match) return null;

    const events = await this.getMatchEvents(matchId);
    const players = await this.getPlayers();
    const playersMap = new Map(players.map(p => [p.id, p]));

    // Group events by type
    const goals = events.filter(e => e.eventType === 'Gol').map(e => ({
      ...e,
      playerName: playersMap.get(e.playerId!)
        ? `${playersMap.get(e.playerId!)!.lastName} ${playersMap.get(e.playerId!)!.firstName}`
        : 'Sconosciuto'
    }));

    const redCards = events.filter(e => e.eventType === 'Cartellino Rosso').map(e => ({
      ...e,
      playerName: playersMap.get(e.playerId!)
        ? `${playersMap.get(e.playerId!)!.lastName} ${playersMap.get(e.playerId!)!.firstName}`
        : 'Sconosciuto'
    }));

    const substitutions = events.filter(e => e.eventType === 'Sostituzione').map(e => ({
      ...e,
      playerName: e.description || 'Sostituzione'
    }));

    return {
      match,
      goals,
      redCards,
      substitutions,
      totals: {
        goals: goals.length,
        redCards: redCards.length,
        substitutions: substitutions.length,
      }
    };
  }

  // Custom Event Types
  async getCustomEventTypes(): Promise<CustomEventType[]> {
    return db.select().from(customEventTypes);
  }

  async createCustomEventType(eventType: InsertCustomEventType): Promise<CustomEventType> {
    const [newType] = await db.insert(customEventTypes).values(eventType).returning();
    return newType;
  }

  // Sync Status
  async getSyncStatus(): Promise<SyncStatus[]> {
    return db.select().from(syncStatus).orderBy(syncStatus.tableName);
  }

  async updateSyncStatus(tableName: string, recordCount: number, status: string): Promise<SyncStatus> {
    const [result] = await db.insert(syncStatus)
      .values({
        tableName,
        recordCount,
        status,
        lastSynced: new Date()
      })
      .onConflictDoUpdate({
        target: syncStatus.tableName,
        set: {
          recordCount,
          status,
          lastSynced: new Date(),
          updatedAt: new Date()
        }
      })
      .returning();
    return result;
  }

  // Training Attendances
  async getAllAttendances(): Promise<TrainingAttendance[]> {
    return db.select().from(trainingAttendances)
      .orderBy(trainingAttendances.date, trainingAttendances.playerId);
  }

  async getAttendancesByDate(date: string): Promise<TrainingAttendance[]> {
    return db.select().from(trainingAttendances)
      .where(eq(trainingAttendances.date, date))
      .orderBy(trainingAttendances.playerId);
  }

  async upsertAttendance(attendance: InsertTrainingAttendance): Promise<TrainingAttendance> {
    const [result] = await db.insert(trainingAttendances)
      .values(attendance)
      .onConflictDoUpdate({
        target: [trainingAttendances.date, trainingAttendances.playerId],
        set: { 
          status: attendance.status,
          notes: attendance.notes 
        }
      })
      .returning();
    return result;
  }

  async deleteAttendance(id: number): Promise<void> {
    await db.delete(trainingAttendances).where(eq(trainingAttendances.id, id));
  }

  async getTrainingSessions(): Promise<{ date: string; presenti: number; assenti: number; infortunati: number; totale: number }[]> {
    const allAttendances = await db.select().from(trainingAttendances).orderBy(trainingAttendances.date);
    
    const grouped = allAttendances.reduce((acc, att) => {
      if (!acc[att.date]) {
        acc[att.date] = { date: att.date, presenti: 0, assenti: 0, infortunati: 0, totale: 0 };
      }
      acc[att.date].totale++;
      if (att.status === 'Presente') acc[att.date].presenti++;
      if (att.status === 'Assente') acc[att.date].assenti++;
      if (att.status === 'Infortunato') acc[att.date].infortunati++;
      return acc;
    }, {} as Record<string, { date: string; presenti: number; assenti: number; infortunati: number; totale: number }>);

    return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
  }

  async deleteTrainingSession(date: string): Promise<void> {
    await db.delete(trainingAttendances).where(eq(trainingAttendances.date, date));
  }

  async getRecentAttendancesByPlayer(days: number = 7): Promise<{ playerId: number; presentiCount: number; infortunatoCount: number }[]> {
    // Calculate current week's Monday, Wednesday, Thursday
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Get Monday of current week
    const monday = new Date(now);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    monday.setDate(now.getDate() + diff);
    
    const wednesday = new Date(monday);
    wednesday.setDate(monday.getDate() + 2);
    
    const thursday = new Date(monday);
    thursday.setDate(monday.getDate() + 3);
    
    const mondayStr = monday.toISOString().split('T')[0];
    const wednesdayStr = wednesday.toISOString().split('T')[0];
    const thursdayStr = thursday.toISOString().split('T')[0];
    
    const allPlayers = await this.getPlayers();
    
    // Get attendances ONLY for current week's training days (Mon, Wed, Thu)
    const currentWeekAttendances = await db.select()
      .from(trainingAttendances)
      .where(
        or(
          eq(trainingAttendances.date, mondayStr),
          eq(trainingAttendances.date, wednesdayStr),
          eq(trainingAttendances.date, thursdayStr)
        )
      );
    
    const result = allPlayers.map(player => {
      const playerAttendances = currentWeekAttendances.filter(att => att.playerId === player.id);
      return {
        playerId: player.id,
        presentiCount: playerAttendances.filter(att => att.status === 'Presente').length,
        infortunatoCount: playerAttendances.filter(att => att.status === 'Infortunato').length,
      };
    });
    
    return result;
  }

  async getWeeklyPlanner(weekStartDate: string): Promise<{
    weekStart: string;
    days: { monday: string; wednesday: string; thursday: string };
    players: Array<{
      id: number;
      firstName: string;
      lastName: string;
      number: number | null;
      role: string | null;
      attendances: {
        monday: string | null;
        wednesday: string | null;
        thursday: string | null;
      };
    }>;
  }> {
    // Calculate Monday, Wednesday, Thursday dates from week start
    const weekStart = new Date(weekStartDate);
    const dayOfWeek = weekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Adjust to get Monday of the week
    const monday = new Date(weekStart);
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, else go to Monday
    monday.setDate(weekStart.getDate() + diff);
    
    const wednesday = new Date(monday);
    wednesday.setDate(monday.getDate() + 2);
    
    const thursday = new Date(monday);
    thursday.setDate(monday.getDate() + 3);
    
    const mondayStr = monday.toISOString().split('T')[0];
    const wednesdayStr = wednesday.toISOString().split('T')[0];
    const thursdayStr = thursday.toISOString().split('T')[0];
    
    // Get all players
    const allPlayers = await this.getPlayers();
    
    // Get attendances for these 3 days
    const attendances = await db.select()
      .from(trainingAttendances)
      .where(
        or(
          eq(trainingAttendances.date, mondayStr),
          eq(trainingAttendances.date, wednesdayStr),
          eq(trainingAttendances.date, thursdayStr)
        )
      );
    
    // Build player data with attendances
    const players = allPlayers.map(player => {
      const mondayAtt = attendances.find(att => att.playerId === player.id && att.date === mondayStr);
      const wednesdayAtt = attendances.find(att => att.playerId === player.id && att.date === wednesdayStr);
      const thursdayAtt = attendances.find(att => att.playerId === player.id && att.date === thursdayStr);
      
      return {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        number: player.number,
        role: player.role,
        attendances: {
          monday: mondayAtt?.status || null,
          wednesday: wednesdayAtt?.status || null,
          thursday: thursdayAtt?.status || null,
        },
      };
    });
    
    return {
      weekStart: mondayStr,
      days: {
        monday: mondayStr,
        wednesday: wednesdayStr,
        thursday: thursdayStr,
      },
      players,
    };
  }

  async getMonthlyPlanner(yearMonth: string): Promise<{
    yearMonth: string;
    trainingDays: Array<{ date: string; dayName: string; dayNum: number; monthAbbr: string }>;
    players: Array<{
      id: number;
      firstName: string;
      lastName: string;
      number: number | null;
      role: string | null;
      attendances: Record<string, string | null>;
      totalPresenze: number;
      totalAssenze: number;
    }>;
  }> {
    // Parse yearMonth (format: "2025-10")
    const [year, month] = yearMonth.split('-').map(Number);
    
    // Get all training days (Monday, Wednesday, Thursday) of the month
    const trainingDays: Array<{ date: string; dayName: string; dayNum: number; monthAbbr: string }> = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const monthAbbr = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'][month - 1];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      
      // Training days: Monday (1), Wednesday (3), Thursday (4)
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 4) {
        const dateStr = date.toISOString().split('T')[0];
        trainingDays.push({
          date: dateStr,
          dayName: dayNames[dayOfWeek],
          dayNum: day,
          monthAbbr,
        });
      }
    }
    
    // Get all players
    const allPlayers = await this.getPlayers();
    
    // Get all attendances for these days
    const datesList = trainingDays.map(d => d.date);
    const attendances = await db.select()
      .from(trainingAttendances)
      .where(
        sql`${trainingAttendances.date} IN (${sql.join(datesList.map(d => sql`${d}`), sql`, `)})`
      );
    
    // Build player data with attendances
    const players = allPlayers.map(player => {
      const playerAttendances: Record<string, string | null> = {};
      let totalPresenze = 0;
      let totalAssenze = 0;
      
      trainingDays.forEach(day => {
        const att = attendances.find(a => a.playerId === player.id && a.date === day.date);
        const status = att?.status || null;
        playerAttendances[day.date] = status;
        
        if (status === 'Presente') totalPresenze++;
        if (status === 'Assente') totalAssenze++;
      });
      
      return {
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        number: player.number,
        role: player.role,
        attendances: playerAttendances,
        totalPresenze,
        totalAssenze,
      };
    });
    
    return {
      yearMonth,
      trainingDays,
      players,
    };
  }

  // Saved Formations
  async getSavedFormations(): Promise<SavedFormation[]> {
    return db.select().from(savedFormations).orderBy(sql`${savedFormations.date} DESC`);
  }

  async getSavedFormation(id: number): Promise<SavedFormation | undefined> {
    const [formation] = await db.select().from(savedFormations).where(eq(savedFormations.id, id));
    return formation || undefined;
  }

  async createSavedFormation(formation: InsertSavedFormation): Promise<SavedFormation> {
    const [newFormation] = await db.insert(savedFormations).values(formation).returning();
    return newFormation;
  }

  async deleteSavedFormation(id: number): Promise<void> {
    await db.delete(savedFormations).where(eq(savedFormations.id, id));
  }

  async getPlayersWithStatus(): Promise<Array<Player & { isInjured: boolean; lowAttendance: boolean }>> {
    const allPlayers = await this.getPlayers();
    
    return allPlayers.map(player => ({
      ...player,
      isInjured: false,
      lowAttendance: false,
    }));
  }

  // Convocations
  async getConvocations(): Promise<Convocation[]> {
    return db.select().from(convocations).orderBy(sql`${convocations.matchDate} DESC`);
  }

  async getConvocation(id: number): Promise<Convocation | undefined> {
    const [convocation] = await db.select().from(convocations).where(eq(convocations.id, id));
    return convocation || undefined;
  }

  async createConvocation(convocation: InsertConvocation): Promise<Convocation> {
    const [newConvocation] = await db.insert(convocations).values(convocation as any).returning();
    return newConvocation;
  }

  async updateConvocation(id: number, convocation: Partial<InsertConvocation>): Promise<Convocation | undefined> {
    const [updated] = await db.update(convocations)
      .set(convocation as any)
      .where(eq(convocations.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteConvocation(id: number): Promise<void> {
    await db.delete(convocations).where(eq(convocations.id, id));
  }

  // Tactical Setups
  async getAllTacticalSetups(): Promise<TacticalSetup[]> {
    return db.select().from(tacticalSetups).orderBy(sql`${tacticalSetups.createdAt} DESC`);
  }

  async getTacticalSetupsByMatch(matchId: number): Promise<TacticalSetup[]> {
    return db.select().from(tacticalSetups).where(eq(tacticalSetups.matchId, matchId)).orderBy(tacticalSetups.createdAt);
  }

  async createTacticalSetup(setup: InsertTacticalSetup): Promise<TacticalSetup> {
    const [newSetup] = await db.insert(tacticalSetups).values(setup as any).returning();
    return newSetup;
  }

  async deleteTacticalSetup(id: number): Promise<void> {
    await db.delete(tacticalSetups).where(eq(tacticalSetups.id, id));
  }

  // Unauthorized Actions Log
  async getUnauthorizedActions(): Promise<UnauthorizedAction[]> {
    return db.select().from(unauthorizedActions).orderBy(sql`${unauthorizedActions.timestamp} DESC`);
  }

  async createUnauthorizedAction(action: InsertUnauthorizedAction): Promise<UnauthorizedAction> {
    const [newAction] = await db.insert(unauthorizedActions).values(action).returning();
    return newAction;
  }

  async clearUnauthorizedActions(): Promise<void> {
    await db.delete(unauthorizedActions);
  }

  // Player Statistics (Advanced)
  async getPlayerMatchStats(playerId: number): Promise<{
    matchesWon: number;
    matchesDrawn: number;
    matchesLost: number;
    goalsScored: number;
    goalsConceded: number;
  }> {
    // Get player info to check if goalkeeper
    const player = await this.getPlayer(playerId);
    if (!player) {
      return { matchesWon: 0, matchesDrawn: 0, matchesLost: 0, goalsScored: 0, goalsConceded: 0 };
    }
    
    const isGoalkeeper = player.role?.toLowerCase().includes('portiere') || player.role?.toLowerCase().includes('por');
    
    // Get all matches where player participated
    const playerFormations = await db.select({
      matchId: formationAssignments.matchId,
      minutesPlayed: formationAssignments.minutesPlayed,
      minuteEntered: formationAssignments.minuteEntered,
      status: formationAssignments.status,
    })
    .from(formationAssignments)
    .where(eq(formationAssignments.playerId, playerId));

    if (playerFormations.length === 0) {
      return { matchesWon: 0, matchesDrawn: 0, matchesLost: 0, goalsScored: 0, goalsConceded: 0 };
    }

    const matchIds = playerFormations.map(f => f.matchId);
    
    // Get match sessions for these matches
    const matches = await db.select()
      .from(matchSessions)
      .where(inArray(matchSessions.id, matchIds));

    // Calculate wins/draws/losses
    let matchesWon = 0;
    let matchesDrawn = 0;
    let matchesLost = 0;

    matches.forEach(match => {
      if (match.homeScore !== null && match.awayScore !== null) {
        if (match.homeScore > match.awayScore) {
          matchesWon++;
        } else if (match.homeScore === match.awayScore) {
          matchesDrawn++;
        } else {
          matchesLost++;
        }
      }
    });

    // Count goals scored by player
    const goalsScored = await db.select({ count: sql<number>`count(*)` })
      .from(matchEvents)
      .where(and(
        eq(matchEvents.playerId, playerId),
        eq(matchEvents.eventType, 'Gol')
      ))
      .then(result => Number(result[0]?.count || 0));

    // Count goals conceded (only for goalkeepers)
    let goalsConceded = 0;
    
    if (isGoalkeeper) {
      // For each match, check goals scored by opponent and verify if goalkeeper was in field
      for (const formation of playerFormations) {
        const match = matches.find(m => m.id === formation.matchId);
        if (!match || match.awayScore === null) continue;

        const opponentGoals = match.awayScore; // Goals scored by opponent
        
        if (opponentGoals > 0 && formation.minutesPlayed && formation.minutesPlayed > 0) {
          // Get all goals scored by opponent in this match
          // Since we don't track opponent goals in matchEvents, we assume all opponent goals
          // happened while this goalkeeper was playing if he played significant time
          // This is a simplification - ideally we'd track exact minute of each opponent goal
          
          // For now: if goalkeeper played the match, attribute all opponent goals to him
          goalsConceded += opponentGoals;
        }
      }
    }

    return {
      matchesWon,
      matchesDrawn,
      matchesLost,
      goalsScored,
      goalsConceded,
    };
  }
}

export const storage = new DatabaseStorage();
