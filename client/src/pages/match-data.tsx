import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Play, Pause, Clock, Plus, Timer, Flag, AlertTriangle, UserX, X, Download, Settings, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Navigation } from "@/components/Navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import * as XLSX from 'xlsx';
import type { Player, MatchSession, MatchEvent, TrainingAttendance } from "@shared/schema";

type MatchPhase = 'NOT_STARTED' | 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'FINISHED';

export default function MatchLivePage() {
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [matchPhase, setMatchPhase] = useState<MatchPhase>('NOT_STARTED');
  const [isRunning, setIsRunning] = useState(false);
  const [firstHalfSeconds, setFirstHalfSeconds] = useState(0);
  const [secondHalfSeconds, setSecondHalfSeconds] = useState(0);
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('week');
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    number: true,
    name: true,
    role: true,
    minutiGiocati: true,
    partiteConvocato: true,
    partiteTitolare: true,
    partiteEntrato: true,
    partiteVinte: true,
    partitePareggiate: true,
    partitePerse: true,
    goalSubitiFatti: true,
    presenti: true,
    assenti: true,
    infortuni: true,
    gialli: true,
    rossi: true,
  });
  
  // Dialog states for events
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showSubDialog, setShowSubDialog] = useState(false);
  const [showYellowDialog, setShowYellowDialog] = useState(false);
  const [showRedDialog, setShowRedDialog] = useState(false);
  const [showInjuryDialog, setShowInjuryDialog] = useState(false);
  const [showRigoreDialog, setShowRigoreDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  
  // Player edit dialog
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editNumber, setEditNumber] = useState<number | ''>('');
  const [editRole, setEditRole] = useState('');
  const [editAttendances, setEditAttendances] = useState<{ date: string; status: 'Presente' | 'Assente' | 'Infortunato' }[]>([]);
  
  // Event data
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [assistPlayer, setAssistPlayer] = useState<number | null>(null);
  const [subOutPlayer, setSubOutPlayer] = useState<number | null>(null);
  const [subInPlayer, setSubInPlayer] = useState<number | null>(null);
  const [injuredPlayer, setInjuredPlayer] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['/api/players'],
  });

  const { data: matches = [] } = useQuery<MatchSession[]>({
    queryKey: ['/api/matches'],
  });

  // Check if mobile mode (skip match selection)
  const isMobileMode = typeof window !== 'undefined' && window.location.search.includes('mobile=true');
  
  // Auto-select or create match for mobile mode
  useEffect(() => {
    if (isMobileMode && matches.length > 0 && !selectedMatch) {
      // Find today's match or select the most recent
      const today = new Date().toISOString().split('T')[0];
      const todayMatch = matches.find(m => m.date === today);
      
      if (todayMatch) {
        setSelectedMatch(todayMatch.id);
        setMatchPhase('FIRST_HALF');
        setIsRunning(true);
      } else {
        setSelectedMatch(matches[0].id);
      }
    } else if (matches.length > 0 && !selectedMatch && !isMobileMode) {
      // Normal mode: just auto-select first match
      setSelectedMatch(matches[0].id);
    }
  }, [matches, selectedMatch, isMobileMode]);

  // Get ALL events from ALL matches for stats calculation
  const { data: allEvents = [] } = useQuery<MatchEvent[]>({
    queryKey: ['/api/matches/all-events'],
  });

  // Get ALL formations from ALL matches for stats calculation
  const { data: allFormations = [] } = useQuery<any[]>({
    queryKey: ['/api/formations'],
  });

  // Get events for selected match only (for display purposes)
  const { data: events = [] } = useQuery<MatchEvent[]>({
    queryKey: [`/api/matches/${selectedMatch}/events`],
    enabled: !!selectedMatch,
  });

  const { data: attendances = [] } = useQuery<TrainingAttendance[]>({
    queryKey: ['/api/attendances'],
  });

  const createEventMutation = useMutation({
    mutationFn: (event: any) => apiRequest('POST', `/api/matches/${selectedMatch}/events`, event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${selectedMatch}/events`] });
      toast({ title: "✅ Evento registrato" });
    },
  });

  const startMatchMutation = useMutation({
    mutationFn: () => apiRequest('POST', `/api/matches/${selectedMatch}/start`),
    onSuccess: () => {
      toast({ title: "Partita iniziata" });
    },
  });

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        if (matchPhase === 'FIRST_HALF') {
          setFirstHalfSeconds(s => s + 1);
        } else if (matchPhase === 'SECOND_HALF') {
          setSecondHalfSeconds(s => s + 1);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, matchPhase]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentMinute = () => {
    if (matchPhase === 'FIRST_HALF') {
      return Math.floor(firstHalfSeconds / 60);
    } else if (matchPhase === 'SECOND_HALF') {
      return Math.floor((firstHalfSeconds + secondHalfSeconds) / 60);
    }
    return 0;
  };

  const currentMinute = getCurrentMinute();

  const handleStartMatch = () => {
    setMatchPhase('FIRST_HALF');
    setIsRunning(true);
    startMatchMutation.mutate();
  };

  const handleEndFirstHalf = () => {
    setMatchPhase('HALF_TIME');
    setIsRunning(false);
    toast({ title: "Fine 1° Tempo", description: `Durata: ${formatTime(firstHalfSeconds)}` });
  };

  const handleStartSecondHalf = () => {
    setMatchPhase('SECOND_HALF');
    setIsRunning(true);
    toast({ title: "Inizio 2° Tempo" });
  };

  const handleEndMatch = () => {
    setMatchPhase('FINISHED');
    setIsRunning(false);
    toast({ 
      title: "Fine Partita", 
      description: `1°T: ${formatTime(firstHalfSeconds)} | 2°T: ${formatTime(secondHalfSeconds)}` 
    });
  };

  // Get players on field vs bench (from formation data)
  const playersOnField = players.slice(0, 11); // First 11 are on field
  const playersOnBench = players.slice(11); // Rest are on bench
  
  // Count substitutions made
  const substitutionsMade = events.filter(e => e.eventType === 'Sostituzione').length / 2;
  const maxSubstitutions = 5;
  const canSubstitute = substitutionsMade < maxSubstitutions;
  
  // Count goals
  const goalsScored = events.filter(e => e.eventType === 'Gol').length;
  
  // Event handlers
  const handleGoal = (playerId: number, assistId: number | null) => {
    const assistPlayer = players.find(p => p.id === assistId);
    const goalPlayer = players.find(p => p.id === playerId);
    
    createEventMutation.mutate({
      playerId,
      eventType: 'Gol',
      minute: currentMinute,
      description: assistId && assistPlayer ? `Assist: ${assistPlayer.lastName} ${assistPlayer.firstName}` : undefined,
    });
    
    // If there's an assist, record it separately
    if (assistId && goalPlayer) {
      createEventMutation.mutate({
        playerId: assistId,
        eventType: 'Assist',
        minute: currentMinute,
        description: `Gol di: ${goalPlayer.lastName} ${goalPlayer.firstName}`,
      });
    }
    
    setShowGoalDialog(false);
    setSelectedPlayer(null);
    setAssistPlayer(null);
  };
  
  const handleSubstitution = (outId: number, inId: number) => {
    if (!canSubstitute) {
      toast({ title: "Cambi esauriti", description: `Hai già fatto ${maxSubstitutions} sostituzioni`, variant: "destructive" });
      return;
    }
    
    const outPlayer = players.find(p => p.id === outId);
    const inPlayer = players.find(p => p.id === inId);
    
    createEventMutation.mutate({
      playerId: outId,
      eventType: 'Sostituzione',
      minute: currentMinute,
      description: `OUT: ${outPlayer?.lastName} ${outPlayer?.firstName} | IN: ${inPlayer?.lastName} ${inPlayer?.firstName}`,
    });
    
    setShowSubDialog(false);
    setSubOutPlayer(null);
    setSubInPlayer(null);
  };
  
  const handleCard = (playerId: number, type: 'Cartellino Giallo' | 'Cartellino Rosso') => {
    createEventMutation.mutate({
      playerId,
      eventType: type,
      minute: currentMinute,
    });
    
    if (type === 'Cartellino Giallo') setShowYellowDialog(false);
    if (type === 'Cartellino Rosso') setShowRedDialog(false);
    setSelectedPlayer(null);
  };
  
  const handleInjury = (playerId: number, substitute: boolean, subPlayerId?: number) => {
    createEventMutation.mutate({
      playerId,
      eventType: 'Infortunio',
      minute: currentMinute,
    });
    
    if (substitute && subPlayerId) {
      handleSubstitution(playerId, subPlayerId);
    }
    
    setShowInjuryDialog(false);
    setInjuredPlayer(null);
  };
  
  const handleSimpleEvent = (eventType: 'Rigore' | 'Corner' | 'Fuorigioco', playerId?: number) => {
    createEventMutation.mutate({
      playerId,
      eventType,
      minute: currentMinute,
    });
  };
  
  const handleNote = (note: string) => {
    createEventMutation.mutate({
      eventType: 'Nota',
      minute: currentMinute,
      description: note,
    });
    setShowNoteDialog(false);
    setNoteText('');
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'Gol': return '⚽';
      case 'Assist': return '👟';
      case 'Sostituzione': return '🔄';
      case 'Cartellino Giallo': return '🟨';
      case 'Cartellino Rosso': return '🟥';
      case 'Infortunio': return '🚑';
      case 'Rigore': return '🎯';
      case 'Corner': return '🚩';
      case 'Fuorigioco': return '⚠️';
      case 'Nota': return '💬';
      default: return '📝';
    }
  };

  const getPhaseLabel = () => {
    switch (matchPhase) {
      case 'NOT_STARTED': return 'In Attesa';
      case 'FIRST_HALF': return '1° Tempo';
      case 'HALF_TIME': return 'Intervallo';
      case 'SECOND_HALF': return '2° Tempo';
      case 'FINISHED': return 'Finita';
      default: return '';
    }
  };

  const getPhaseColor = () => {
    switch (matchPhase) {
      case 'NOT_STARTED': return 'bg-muted text-muted-foreground';
      case 'FIRST_HALF': return 'bg-primary text-primary-foreground neon-glow-cyan';
      case 'HALF_TIME': return 'bg-secondary text-secondary-foreground';
      case 'SECOND_HALF': return 'bg-primary text-primary-foreground neon-glow-cyan';
      case 'FINISHED': return 'bg-green-600 text-white';
      default: return '';
    }
  };

  // Helper to get date range based on period
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (timePeriod === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      return { start: weekStart, end: now };
    } else if (timePeriod === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart, end: now };
    } else {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { start: yearStart, end: now };
    }
  };

  // Filter attendances by date range
  const filterAttendancesByRange = (playerId: number) => {
    const { start, end } = getDateRange();
    return attendances.filter(att => {
      if (att.playerId !== playerId) return false;
      // Parse date string to compare only dates (ignore time)
      const attDate = new Date(att.date + 'T00:00:00');
      const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
      return attDate >= startDate && attDate <= endDate;
    });
  };

  // Filter matches by date range
  const filterMatchesByRange = () => {
    const { start, end } = getDateRange();
    
    // CRITICAL: Only count matches with saved events (offline registered matches)
    const matchIdsWithEvents = new Set(allEvents.map(e => e.matchId));
    
    return matches.filter(match => {
      // Must have events saved (exclude live match experiments)
      if (!matchIdsWithEvents.has(match.id)) return false;
      
      // Must be in date range
      const matchDate = new Date(match.date + 'T00:00:00');
      const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
      return matchDate >= startDate && matchDate <= endDate;
    });
  };

  // Get filtered data based on time period
  const filteredMatches = filterMatchesByRange();
  const filteredMatchIds = filteredMatches.map(m => m.id);
  const filteredFormations = allFormations.filter(f => filteredMatchIds.includes(f.matchId));
  const filteredEvents = allEvents.filter(e => filteredMatchIds.includes(e.matchId));

  // Helper to categorize players by role
  const getRoleCategory = (role: string | null): string => {
    if (!role) return 'Attaccanti'; // Default
    const roleLower = role.toLowerCase();
    
    if (roleLower.includes('portiere')) return 'Portieri';
    if (roleLower.includes('difensore') || roleLower.includes('terzino')) return 'Difensori';
    if (roleLower.includes('centrocampista') || roleLower.includes('mediano') || 
        roleLower.includes('trequartista') || roleLower.includes('ala')) return 'Centrocampisti';
    return 'Attaccanti';
  };

  // Group players by role category and sort alphabetically within each group
  const groupedPlayers = {
    'Portieri': [] as Player[],
    'Difensori': [] as Player[],
    'Centrocampisti': [] as Player[],
    'Attaccanti': [] as Player[]
  };

  players.forEach(player => {
    const category = getRoleCategory(player.role);
    groupedPlayers[category as keyof typeof groupedPlayers].push(player);
  });

  // Sort each group alphabetically by last name
  Object.keys(groupedPlayers).forEach(category => {
    groupedPlayers[category as keyof typeof groupedPlayers].sort((a, b) => {
      const nameA = `${a.lastName} ${a.firstName}`;
      const nameB = `${b.lastName} ${b.firstName}`;
      return nameA.localeCompare(nameB, 'it');
    });
  });

  // Flatten into single array with category markers
  const sortedPlayers = [
    ...groupedPlayers['Portieri'],
    ...groupedPlayers['Difensori'],
    ...groupedPlayers['Centrocampisti'],
    ...groupedPlayers['Attaccanti']
  ];

  // Open edit dialog
  const handleEditPlayer = (player: Player) => {
    setEditingPlayer(player);
    setEditFirstName(player.firstName);
    setEditLastName(player.lastName);
    setEditNumber(player.number || '');
    setEditRole(player.role || '');
    
    // Load player attendances for the selected period
    const playerAttendances = filterAttendancesByRange(player.id);
    setEditAttendances(playerAttendances.map(att => ({
      date: att.date,
      status: att.status as 'Presente' | 'Assente' | 'Infortunato'
    })));
    
    setShowEditDialog(true);
  };

  // Update player mutation
  const updatePlayerMutation = useMutation({
    mutationFn: async (data: { 
      id: number; 
      firstName: string;
      lastName: string;
      number: number | null; 
      role: string | null;
      attendances: { date: string; status: 'Presente' | 'Assente' | 'Infortunato' }[];
    }) => {
      // Update player data
      await apiRequest('PUT', `/api/players/${data.id}`, {
        firstName: data.firstName,
        lastName: data.lastName,
        number: data.number,
        role: data.role,
      });

      // Update attendances
      for (const att of data.attendances) {
        await apiRequest('POST', '/api/attendances', {
          date: att.date,
          playerId: data.id,
          status: att.status,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendances'] });
      toast({ title: "✅ Giocatore e presenze aggiornati" });
      setShowEditDialog(false);
      setEditingPlayer(null);
    },
  });

  const handleSavePlayer = () => {
    if (!editingPlayer || !editFirstName.trim() || !editLastName.trim()) {
      toast({ title: "Nome e cognome obbligatori", variant: "destructive" });
      return;
    }

    updatePlayerMutation.mutate({
      id: editingPlayer.id,
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      number: editNumber === '' ? null : Number(editNumber),
      role: editRole.trim() || null,
      attendances: editAttendances,
    });
  };

  // Export to Excel
  // Calculate total matches with registered events (filtered by time period)
  const matchesWithEvents = filteredMatchIds.length;

  const handleExportExcel = () => {
    const exportData = sortedPlayers.map(player => {
      const playerAttendances = filterAttendancesByRange(player.id);
      const presentiCount = playerAttendances.filter(a => a.status === 'Presente').length;
      const assentiCount = playerAttendances.filter(a => a.status === 'Assente').length;
      const infortuniCount = playerAttendances.filter(a => a.status === 'Infortunato').length;
      
      // Use filtered events based on time period
      const playerGoals = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Gol').length;
      const playerYellow = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Giallo').length;
      const playerRed = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Rosso').length;

      // Calculate match stats from filtered formations
      const playerFormations = filteredFormations.filter(f => f.playerId === player.id);
      const minutiGiocati = playerFormations.reduce((total, f) => total + (f.minutesPlayed || 0), 0);
      const partiteConvocato = new Set(playerFormations.map(f => f.matchId)).size;
      const partiteTitolare = new Set(playerFormations.filter(f => f.status === 'TITOLARE').map(f => f.matchId)).size;
      const partiteEntrato = new Set(playerFormations.filter(f => 
        f.status === 'PANCHINA' && (f.minutesPlayed > 0 || f.minuteEntered != null)
      ).map(f => f.matchId)).size;

      // Calculate wins/draws/losses from filtered matches
      let partiteVinte = 0;
      let partitePareggiate = 0;
      let partitePerse = 0;
      const playerMatchIds = playerFormations.map(f => f.matchId);
      const playerMatches = filteredMatches.filter(m => playerMatchIds.includes(m.id));
      playerMatches.forEach(match => {
        if (match.homeScore !== null && match.awayScore !== null) {
          if (match.homeScore > match.awayScore) {
            partiteVinte++;
          } else if (match.homeScore === match.awayScore) {
            partitePareggiate++;
          } else {
            partitePerse++;
          }
        }
      });

      // Calculate goals conceded (for goalkeepers) from filtered matches
      let goalsConceded = 0;
      const isGoalkeeper = player.role?.toLowerCase().includes('portiere');
      if (isGoalkeeper) {
        playerFormations.forEach(formation => {
          const match = filteredMatches.find(m => m.id === formation.matchId);
          if (match && match.awayScore !== null && formation.minutesPlayed && formation.minutesPlayed > 0) {
            goalsConceded += match.awayScore;
          }
        });
      }

      const row: any = {};
      if (visibleColumns.number) row['N°'] = player.number || '';
      if (visibleColumns.name) row['Giocatore'] = `${player.lastName} ${player.firstName}`;
      if (visibleColumns.role) row['Ruolo'] = player.role || 'N/D';
      if (visibleColumns.minutiGiocati) row['Minuti di Gioco'] = minutiGiocati;
      if (visibleColumns.partiteConvocato) row['Partite Convocato'] = partiteConvocato;
      if (visibleColumns.partiteTitolare) row['Partite Titolare'] = partiteTitolare;
      if (visibleColumns.partiteEntrato) row['Partite Entrato'] = partiteEntrato;
      if (visibleColumns.partiteVinte) row['Partite Vinte'] = partiteVinte;
      if (visibleColumns.partitePareggiate) row['Partite Pareggiate'] = partitePareggiate;
      if (visibleColumns.partitePerse) row['Partite Perse'] = partitePerse;
      if (visibleColumns.goalSubitiFatti) row[isGoalkeeper ? 'Goal Subiti' : 'Goal Fatti'] = isGoalkeeper ? goalsConceded : playerGoals;
      if (visibleColumns.presenti) row['Presenti'] = presentiCount;
      if (visibleColumns.assenti) row['Assenti'] = assentiCount;
      if (visibleColumns.infortuni) row['Infortuni'] = infortuniCount;
      if (visibleColumns.gialli) row['Gialli'] = playerYellow;
      if (visibleColumns.rossi) row['Rossi'] = playerRed;
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Planner Operativo');
    
    const periodLabel = timePeriod === 'week' ? 'Settimana' : timePeriod === 'month' ? 'Mese' : 'Anno';
    const fileName = `Planner_Operativo_${periodLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    toast({ title: "✅ Export Excel completato", description: `File: ${fileName}` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-primary">Analisi Squadra</h1>
            <p className="text-lg text-muted-foreground">
              Analisi dettagliata con timer, fasi partita e statistiche
            </p>
          </div>

          {/* Rosa - Tabella Giocatori (hidden in mobile mode) */}
          {!isMobileMode && (
          <Card className="border-primary/30 border-2">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-2xl text-primary">Planner Operativo ({players.length} Giocatori)</CardTitle>
                  <p className="text-sm text-muted-foreground font-semibold">
                    📊 Partite Registrate: <span className="text-primary">{matchesWithEvents}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-muted-foreground font-semibold">Periodo:</span>
                  <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as any)}>
                    <SelectTrigger className="w-32" data-testid="select-time-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Settimana</SelectItem>
                      <SelectItem value="month">Mese</SelectItem>
                      <SelectItem value="year">Anno</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Column Filter */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2" data-testid="button-column-filter">
                        <Settings className="h-4 w-4" />
                        Colonne
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56" align="end">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Mostra/Nascondi Colonne</h4>
                        <div className="space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.number}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, number: !!checked }))}
                            />
                            <span className="text-sm">N°</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.name}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, name: !!checked }))}
                            />
                            <span className="text-sm">Giocatore</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.role}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, role: !!checked }))}
                            />
                            <span className="text-sm">Ruolo</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.minutiGiocati}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, minutiGiocati: !!checked }))}
                            />
                            <span className="text-sm">⏱️ Minuti di Gioco</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.partiteConvocato}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, partiteConvocato: !!checked }))}
                            />
                            <span className="text-sm">📋 Partite Convocato</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.partiteTitolare}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, partiteTitolare: !!checked }))}
                            />
                            <span className="text-sm">⭐ Partite Titolare</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.partiteEntrato}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, partiteEntrato: !!checked }))}
                            />
                            <span className="text-sm">🔄 Partite Entrato</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.partiteVinte}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, partiteVinte: !!checked }))}
                            />
                            <span className="text-sm">✅ Partite Vinte</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.partitePareggiate}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, partitePareggiate: !!checked }))}
                            />
                            <span className="text-sm">🟰 Partite Pareggiate</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.partitePerse}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, partitePerse: !!checked }))}
                            />
                            <span className="text-sm">❌ Partite Perse</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.goalSubitiFatti}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, goalSubitiFatti: !!checked }))}
                            />
                            <span className="text-sm">⚽ Goal Subiti/Fatti</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.presenti}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, presenti: !!checked }))}
                            />
                            <span className="text-sm">✅ Presenti</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.assenti}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, assenti: !!checked }))}
                            />
                            <span className="text-sm">❌ Assenti</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.infortuni}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, infortuni: !!checked }))}
                            />
                            <span className="text-sm">🤕 Infortuni</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.gialli}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, gialli: !!checked }))}
                            />
                            <span className="text-sm">🟨 Gialli</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.rossi}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, rossi: !!checked }))}
                            />
                            <span className="text-sm">🟥 Rossi</span>
                          </label>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Export Excel */}
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="gap-2 neon-glow-cyan"
                    onClick={handleExportExcel}
                    data-testid="button-export-excel"
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </Button>

                  {/* Report PDF */}
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="gap-2 neon-glow-pink"
                    onClick={() => toast({ title: "🚧 Report PDF - In Sviluppo", description: "Dammi le specifiche per il report" })}
                    data-testid="button-report-pdf"
                  >
                    <Download className="h-4 w-4" />
                    Report PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="sticky top-0 bg-background z-10 shadow-md">
                    <tr className="border-b-2 border-primary">
                      {visibleColumns.number && <th className="text-left py-3 px-4 font-semibold text-sm bg-background">N°</th>}
                      {visibleColumns.name && <th className="text-left py-3 px-4 font-semibold text-sm bg-background">Giocatore</th>}
                      {visibleColumns.role && <th className="text-left py-3 px-4 font-semibold text-sm bg-background">Ruolo</th>}
                      {visibleColumns.minutiGiocati && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">⏱️ Minuti</th>}
                      {visibleColumns.partiteConvocato && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">📋 Conv</th>}
                      {visibleColumns.partiteTitolare && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">⭐ Tit</th>}
                      {visibleColumns.partiteEntrato && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">🔄 Ent</th>}
                      {visibleColumns.partiteVinte && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">✅ Vinte</th>}
                      {visibleColumns.partitePareggiate && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">🟰 Pareggi</th>}
                      {visibleColumns.partitePerse && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">❌ Perse</th>}
                      {visibleColumns.goalSubitiFatti && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">⚽ Goal</th>}
                      {visibleColumns.presenti && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">✅ Presenti</th>}
                      {visibleColumns.assenti && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">❌ Assenti</th>}
                      {visibleColumns.infortuni && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">🤕 Infortuni</th>}
                      {visibleColumns.gialli && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">🟨 Gialli</th>}
                      {visibleColumns.rossi && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">🟥 Rossi</th>}
                      <th className="text-center py-3 px-4 font-semibold text-sm bg-background">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-8 text-muted-foreground">
                          Nessun giocatore nella rosa
                        </td>
                      </tr>
                    ) : (
                      <>
                        {/* Portieri Section */}
                        {groupedPlayers['Portieri'].length > 0 && (
                          <>
                            <tr className="bg-primary/10">
                              <td colSpan={14} className="py-3 px-4 font-bold text-lg text-primary">
                                🧤 PORTIERI ({groupedPlayers['Portieri'].length})
                              </td>
                            </tr>
                            {groupedPlayers['Portieri'].map((player) => {
                              const playerAttendances = filterAttendancesByRange(player.id);
                              const presentiCount = playerAttendances.filter(a => a.status === 'Presente').length;
                              const assentiCount = playerAttendances.filter(a => a.status === 'Assente').length;
                              const infortuniCount = playerAttendances.filter(a => a.status === 'Infortunato').length;
                              
                              const playerGoals = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Gol').length;
                              const playerYellow = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Giallo').length;
                              const playerRed = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Rosso').length;
                              
                              const playerFormations = filteredFormations.filter(f => f.playerId === player.id);
                              const minutiGiocati = playerFormations.reduce((total, f) => total + (f.minutesPlayed || 0), 0);
                              const partiteConvocato = new Set(playerFormations.map(f => f.matchId)).size;
                              const partiteTitolare = new Set(playerFormations.filter(f => f.status === 'TITOLARE').map(f => f.matchId)).size;
                              const partiteEntrato = new Set(playerFormations.filter(f => 
                                f.status === 'PANCHINA' && (f.minutesPlayed > 0 || f.minuteEntered != null)
                              ).map(f => f.matchId)).size;

                              // Calculate wins/draws/losses from filtered matches
                              let partiteVinte = 0;
                              let partitePareggiate = 0;
                              let partitePerse = 0;
                              const playerMatchIds = playerFormations.map(f => f.matchId);
                              const playerMatches = filteredMatches.filter(m => playerMatchIds.includes(m.id));
                              playerMatches.forEach(match => {
                                if (match.homeScore !== null && match.awayScore !== null) {
                                  if (match.homeScore > match.awayScore) {
                                    partiteVinte++;
                                  } else if (match.homeScore === match.awayScore) {
                                    partitePareggiate++;
                                  } else {
                                    partitePerse++;
                                  }
                                }
                              });

                              // Calculate goals conceded (for goalkeepers) from filtered matches
                              let goalsConceded = 0;
                              const isGoalkeeper = player.role?.toLowerCase().includes('portiere');
                              if (isGoalkeeper) {
                                playerFormations.forEach(formation => {
                                  const match = filteredMatches.find(m => m.id === formation.matchId);
                                  if (match && match.awayScore !== null && formation.minutesPlayed && formation.minutesPlayed > 0) {
                                    goalsConceded += match.awayScore;
                                  }
                                });
                              }
                              
                              return (
                                <tr 
                                  key={player.id} 
                                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                                  data-testid={`player-row-${player.id}`}
                                >
                                  {visibleColumns.number && (
                                    <td className="py-3 px-4">
                                      <span className="font-bold text-secondary text-lg">
                                        {player.number ? `#${player.number}` : '--'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.name && (
                                    <td className="py-3 px-4">
                                      <span className="font-semibold text-foreground">{player.lastName} {player.firstName}</span>
                                    </td>
                                  )}
                                  {visibleColumns.role && (
                                    <td className="py-3 px-4">
                                      <span className="text-sm text-muted-foreground">
                                        {player.role || 'N/D'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.minutiGiocati && (
                                    <td className="py-3 px-4 text-center">
                                      {minutiGiocati > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {minutiGiocati}'
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteConvocato && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteConvocato > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {partiteConvocato}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteTitolare && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteTitolare > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {partiteTitolare}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteEntrato && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteEntrato > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {partiteEntrato}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteVinte && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteVinte > 0 && (
                                        <Badge variant="default" className="bg-green-600 text-white font-mono">
                                          {partiteVinte}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partitePareggiate && (
                                    <td className="py-3 px-4 text-center">
                                      {partitePareggiate > 0 && (
                                        <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                          {partitePareggiate}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partitePerse && (
                                    <td className="py-3 px-4 text-center">
                                      {partitePerse > 0 && (
                                        <Badge variant="destructive" className="font-mono">
                                          {partitePerse}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.goalSubitiFatti && (
                                    <td className="py-3 px-4 text-center">
                                      {(isGoalkeeper ? goalsConceded : playerGoals) > 0 && (
                                        <Badge 
                                          variant="default" 
                                          className={isGoalkeeper ? "bg-red-600 text-white font-mono" : "bg-green-600 text-white font-mono"}
                                        >
                                          {isGoalkeeper ? goalsConceded : playerGoals}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.presenti && (
                                    <td className="py-3 px-4 text-center">
                                      {presentiCount > 0 && (
                                        <Badge variant="default" className="bg-green-600 text-white font-mono">
                                          {presentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.assenti && (
                                    <td className="py-3 px-4 text-center">
                                      {assentiCount > 0 && (
                                        <Badge variant="destructive" className="font-mono">
                                          {assentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.infortuni && (
                                    <td className="py-3 px-4 text-center">
                                      {infortuniCount > 0 && (
                                        <Badge variant="default" className="bg-orange-600 text-white font-mono">
                                          {infortuniCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.gialli && (
                                    <td className="py-3 px-4 text-center">
                                      {playerYellow > 0 && (
                                        <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                          {playerYellow}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.rossi && (
                                    <td className="py-3 px-4 text-center">
                                      {playerRed > 0 && (
                                        <Badge variant="destructive" className="font-mono">
                                          {playerRed}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  <td className="py-3 px-4 text-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditPlayer(player)}
                                      className="gap-2"
                                      data-testid={`button-edit-${player.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                      Modifica
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        )}

                        {/* Difensori Section */}
                        {groupedPlayers['Difensori'].length > 0 && (
                          <>
                            <tr className="bg-primary/10">
                              <td colSpan={14} className="py-3 px-4 font-bold text-lg text-primary">
                                🛡️ DIFENSORI ({groupedPlayers['Difensori'].length})
                              </td>
                            </tr>
                            {groupedPlayers['Difensori'].map((player) => {
                              const playerAttendances = filterAttendancesByRange(player.id);
                              const presentiCount = playerAttendances.filter(a => a.status === 'Presente').length;
                              const assentiCount = playerAttendances.filter(a => a.status === 'Assente').length;
                              const infortuniCount = playerAttendances.filter(a => a.status === 'Infortunato').length;
                              
                              const playerGoals = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Gol').length;
                              const playerYellow = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Giallo').length;
                              const playerRed = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Rosso').length;
                              
                              const playerFormations = filteredFormations.filter(f => f.playerId === player.id);
                              const minutiGiocati = playerFormations.reduce((total, f) => total + (f.minutesPlayed || 0), 0);
                              const partiteConvocato = new Set(playerFormations.map(f => f.matchId)).size;
                              const partiteTitolare = new Set(playerFormations.filter(f => f.status === 'TITOLARE').map(f => f.matchId)).size;
                              const partiteEntrato = new Set(playerFormations.filter(f => 
                                f.status === 'PANCHINA' && (f.minutesPlayed > 0 || f.minuteEntered != null)
                              ).map(f => f.matchId)).size;

                              // Calculate wins/draws/losses from filtered matches
                              let partiteVinte = 0;
                              let partitePareggiate = 0;
                              let partitePerse = 0;
                              const playerMatchIds = playerFormations.map(f => f.matchId);
                              const playerMatches = filteredMatches.filter(m => playerMatchIds.includes(m.id));
                              playerMatches.forEach(match => {
                                if (match.homeScore !== null && match.awayScore !== null) {
                                  if (match.homeScore > match.awayScore) {
                                    partiteVinte++;
                                  } else if (match.homeScore === match.awayScore) {
                                    partitePareggiate++;
                                  } else {
                                    partitePerse++;
                                  }
                                }
                              });

                              // Calculate goals conceded (for goalkeepers) from filtered matches
                              let goalsConceded = 0;
                              const isGoalkeeper = player.role?.toLowerCase().includes('portiere');
                              if (isGoalkeeper) {
                                playerFormations.forEach(formation => {
                                  const match = filteredMatches.find(m => m.id === formation.matchId);
                                  if (match && match.awayScore !== null && formation.minutesPlayed && formation.minutesPlayed > 0) {
                                    goalsConceded += match.awayScore;
                                  }
                                });
                              }
                        
                        return (
                          <tr 
                            key={player.id} 
                            className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                            data-testid={`player-row-${player.id}`}
                          >
                            {visibleColumns.number && (
                              <td className="py-3 px-4">
                                <span className="font-bold text-secondary text-lg">
                                  {player.number ? `#${player.number}` : '--'}
                                </span>
                              </td>
                            )}
                            {visibleColumns.name && (
                              <td className="py-3 px-4">
                                <span className="font-semibold text-foreground">{player.lastName} {player.firstName}</span>
                              </td>
                            )}
                            {visibleColumns.role && (
                              <td className="py-3 px-4">
                                <span className="text-sm text-muted-foreground">
                                  {player.role || 'N/D'}
                                </span>
                              </td>
                            )}
                            {visibleColumns.minutiGiocati && (
                              <td className="py-3 px-4 text-center">
                                {minutiGiocati > 0 && (
                                  <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                    {minutiGiocati}'
                                  </Badge>
                                )}
                              </td>
                            )}
                            {visibleColumns.partiteConvocato && (
                              <td className="py-3 px-4 text-center">
                                {partiteConvocato > 0 && (
                                  <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                    {partiteConvocato}
                                  </Badge>
                                )}
                              </td>
                            )}
                            {visibleColumns.partiteTitolare && (
                              <td className="py-3 px-4 text-center">
                                {partiteTitolare > 0 && (
                                  <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                    {partiteTitolare}
                                  </Badge>
                                )}
                              </td>
                            )}
                            {visibleColumns.partiteEntrato && (
                              <td className="py-3 px-4 text-center">
                                {partiteEntrato > 0 && (
                                  <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                    {partiteEntrato}
                                  </Badge>
                                )}
                              </td>
                            )}
                            {visibleColumns.presenti && (
                              <td className="py-3 px-4 text-center">
                                {presentiCount > 0 && (
                                  <Badge variant="default" className="bg-green-600 text-white font-mono">
                                    {presentiCount}
                                  </Badge>
                                )}
                              </td>
                            )}
                            {visibleColumns.assenti && (
                              <td className="py-3 px-4 text-center">
                                {assentiCount > 0 && (
                                  <Badge variant="destructive" className="font-mono">
                                    {assentiCount}
                                  </Badge>
                                )}
                              </td>
                            )}
                            {visibleColumns.infortuni && (
                              <td className="py-3 px-4 text-center">
                                {infortuniCount > 0 && (
                                  <Badge variant="default" className="bg-orange-600 text-white font-mono">
                                    {infortuniCount}
                                  </Badge>
                                )}
                              </td>
                            )}
                            {visibleColumns.gialli && (
                              <td className="py-3 px-4 text-center">
                                {playerYellow > 0 && (
                                  <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                    {playerYellow}
                                  </Badge>
                                )}
                              </td>
                            )}
                            {visibleColumns.rossi && (
                              <td className="py-3 px-4 text-center">
                                {playerRed > 0 && (
                                  <Badge variant="destructive" className="font-mono">
                                    {playerRed}
                                  </Badge>
                                )}
                              </td>
                            )}
                            <td className="py-3 px-4 text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditPlayer(player)}
                                className="gap-2"
                                data-testid={`button-edit-${player.id}`}
                              >
                                <Edit className="h-4 w-4" />
                                Modifica
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                          </>
                        )}

                        {/* Centrocampisti Section */}
                        {groupedPlayers['Centrocampisti'].length > 0 && (
                          <>
                            <tr className="bg-primary/10">
                              <td colSpan={14} className="py-3 px-4 font-bold text-lg text-primary">
                                ⚽ CENTROCAMPISTI ({groupedPlayers['Centrocampisti'].length})
                              </td>
                            </tr>
                            {groupedPlayers['Centrocampisti'].map((player) => {
                              const playerAttendances = filterAttendancesByRange(player.id);
                              const presentiCount = playerAttendances.filter(a => a.status === 'Presente').length;
                              const assentiCount = playerAttendances.filter(a => a.status === 'Assente').length;
                              const infortuniCount = playerAttendances.filter(a => a.status === 'Infortunato').length;
                              
                              const playerGoals = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Gol').length;
                              const playerYellow = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Giallo').length;
                              const playerRed = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Rosso').length;
                              
                              const playerFormations = filteredFormations.filter(f => f.playerId === player.id);
                              const minutiGiocati = playerFormations.reduce((total, f) => total + (f.minutesPlayed || 0), 0);
                              const partiteConvocato = new Set(playerFormations.map(f => f.matchId)).size;
                              const partiteTitolare = new Set(playerFormations.filter(f => f.status === 'TITOLARE').map(f => f.matchId)).size;
                              const partiteEntrato = new Set(playerFormations.filter(f => 
                                f.status === 'PANCHINA' && (f.minutesPlayed > 0 || f.minuteEntered != null)
                              ).map(f => f.matchId)).size;

                              // Calculate wins/draws/losses from filtered matches
                              let partiteVinte = 0;
                              let partitePareggiate = 0;
                              let partitePerse = 0;
                              const playerMatchIds = playerFormations.map(f => f.matchId);
                              const playerMatches = filteredMatches.filter(m => playerMatchIds.includes(m.id));
                              playerMatches.forEach(match => {
                                if (match.homeScore !== null && match.awayScore !== null) {
                                  if (match.homeScore > match.awayScore) {
                                    partiteVinte++;
                                  } else if (match.homeScore === match.awayScore) {
                                    partitePareggiate++;
                                  } else {
                                    partitePerse++;
                                  }
                                }
                              });

                              // Calculate goals conceded (for goalkeepers) from filtered matches
                              let goalsConceded = 0;
                              const isGoalkeeper = player.role?.toLowerCase().includes('portiere');
                              if (isGoalkeeper) {
                                playerFormations.forEach(formation => {
                                  const match = filteredMatches.find(m => m.id === formation.matchId);
                                  if (match && match.awayScore !== null && formation.minutesPlayed && formation.minutesPlayed > 0) {
                                    goalsConceded += match.awayScore;
                                  }
                                });
                              }
                              
                              return (
                                <tr 
                                  key={player.id} 
                                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                                  data-testid={`player-row-${player.id}`}
                                >
                                  {visibleColumns.number && (
                                    <td className="py-3 px-4">
                                      <span className="font-bold text-secondary text-lg">
                                        {player.number ? `#${player.number}` : '--'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.name && (
                                    <td className="py-3 px-4">
                                      <span className="font-semibold text-foreground">{player.lastName} {player.firstName}</span>
                                    </td>
                                  )}
                                  {visibleColumns.role && (
                                    <td className="py-3 px-4">
                                      <span className="text-sm text-muted-foreground">
                                        {player.role || 'N/D'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.minutiGiocati && (
                                    <td className="py-3 px-4 text-center">
                                      {minutiGiocati > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {minutiGiocati}'
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteConvocato && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteConvocato > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {partiteConvocato}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteTitolare && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteTitolare > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {partiteTitolare}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteEntrato && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteEntrato > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {partiteEntrato}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteVinte && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteVinte > 0 && (
                                        <Badge variant="default" className="bg-green-600 text-white font-mono">
                                          {partiteVinte}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partitePareggiate && (
                                    <td className="py-3 px-4 text-center">
                                      {partitePareggiate > 0 && (
                                        <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                          {partitePareggiate}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partitePerse && (
                                    <td className="py-3 px-4 text-center">
                                      {partitePerse > 0 && (
                                        <Badge variant="destructive" className="font-mono">
                                          {partitePerse}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.goalSubitiFatti && (
                                    <td className="py-3 px-4 text-center">
                                      {(isGoalkeeper ? goalsConceded : playerGoals) > 0 && (
                                        <Badge 
                                          variant="default" 
                                          className={isGoalkeeper ? "bg-red-600 text-white font-mono" : "bg-green-600 text-white font-mono"}
                                        >
                                          {isGoalkeeper ? goalsConceded : playerGoals}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.presenti && (
                                    <td className="py-3 px-4 text-center">
                                      {presentiCount > 0 && (
                                        <Badge variant="default" className="bg-green-600 text-white font-mono">
                                          {presentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.assenti && (
                                    <td className="py-3 px-4 text-center">
                                      {assentiCount > 0 && (
                                        <Badge variant="destructive" className="font-mono">
                                          {assentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.infortuni && (
                                    <td className="py-3 px-4 text-center">
                                      {infortuniCount > 0 && (
                                        <Badge variant="default" className="bg-orange-600 text-white font-mono">
                                          {infortuniCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.gialli && (
                                    <td className="py-3 px-4 text-center">
                                      {playerYellow > 0 && (
                                        <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                          {playerYellow}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.rossi && (
                                    <td className="py-3 px-4 text-center">
                                      {playerRed > 0 && (
                                        <Badge variant="destructive" className="font-mono">
                                          {playerRed}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  <td className="py-3 px-4 text-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditPlayer(player)}
                                      className="gap-2"
                                      data-testid={`button-edit-${player.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                      Modifica
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        )}

                        {/* Attaccanti Section */}
                        {groupedPlayers['Attaccanti'].length > 0 && (
                          <>
                            <tr className="bg-primary/10">
                              <td colSpan={14} className="py-3 px-4 font-bold text-lg text-primary">
                                ⚡ ATTACCANTI ({groupedPlayers['Attaccanti'].length})
                              </td>
                            </tr>
                            {groupedPlayers['Attaccanti'].map((player) => {
                              const playerAttendances = filterAttendancesByRange(player.id);
                              const presentiCount = playerAttendances.filter(a => a.status === 'Presente').length;
                              const assentiCount = playerAttendances.filter(a => a.status === 'Assente').length;
                              const infortuniCount = playerAttendances.filter(a => a.status === 'Infortunato').length;
                              
                              const playerGoals = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Gol').length;
                              const playerYellow = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Giallo').length;
                              const playerRed = filteredEvents.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Rosso').length;
                              
                              const playerFormations = filteredFormations.filter(f => f.playerId === player.id);
                              const minutiGiocati = playerFormations.reduce((total, f) => total + (f.minutesPlayed || 0), 0);
                              const partiteConvocato = new Set(playerFormations.map(f => f.matchId)).size;
                              const partiteTitolare = new Set(playerFormations.filter(f => f.status === 'TITOLARE').map(f => f.matchId)).size;
                              const partiteEntrato = new Set(playerFormations.filter(f => 
                                f.status === 'PANCHINA' && (f.minutesPlayed > 0 || f.minuteEntered != null)
                              ).map(f => f.matchId)).size;

                              // Calculate wins/draws/losses from filtered matches
                              let partiteVinte = 0;
                              let partitePareggiate = 0;
                              let partitePerse = 0;
                              const playerMatchIds = playerFormations.map(f => f.matchId);
                              const playerMatches = filteredMatches.filter(m => playerMatchIds.includes(m.id));
                              playerMatches.forEach(match => {
                                if (match.homeScore !== null && match.awayScore !== null) {
                                  if (match.homeScore > match.awayScore) {
                                    partiteVinte++;
                                  } else if (match.homeScore === match.awayScore) {
                                    partitePareggiate++;
                                  } else {
                                    partitePerse++;
                                  }
                                }
                              });

                              // Calculate goals conceded (for goalkeepers) from filtered matches
                              let goalsConceded = 0;
                              const isGoalkeeper = player.role?.toLowerCase().includes('portiere');
                              if (isGoalkeeper) {
                                playerFormations.forEach(formation => {
                                  const match = filteredMatches.find(m => m.id === formation.matchId);
                                  if (match && match.awayScore !== null && formation.minutesPlayed && formation.minutesPlayed > 0) {
                                    goalsConceded += match.awayScore;
                                  }
                                });
                              }
                              
                              return (
                                <tr 
                                  key={player.id} 
                                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                                  data-testid={`player-row-${player.id}`}
                                >
                                  {visibleColumns.number && (
                                    <td className="py-3 px-4">
                                      <span className="font-bold text-secondary text-lg">
                                        {player.number ? `#${player.number}` : '--'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.name && (
                                    <td className="py-3 px-4">
                                      <span className="font-semibold text-foreground">{player.lastName} {player.firstName}</span>
                                    </td>
                                  )}
                                  {visibleColumns.role && (
                                    <td className="py-3 px-4">
                                      <span className="text-sm text-muted-foreground">
                                        {player.role || 'N/D'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.minutiGiocati && (
                                    <td className="py-3 px-4 text-center">
                                      {minutiGiocati > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {minutiGiocati}'
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteConvocato && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteConvocato > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {partiteConvocato}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteTitolare && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteTitolare > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {partiteTitolare}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteEntrato && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteEntrato > 0 && (
                                        <Badge variant="default" className="bg-cyan-600 text-white font-mono">
                                          {partiteEntrato}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partiteVinte && (
                                    <td className="py-3 px-4 text-center">
                                      {partiteVinte > 0 && (
                                        <Badge variant="default" className="bg-green-600 text-white font-mono">
                                          {partiteVinte}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partitePareggiate && (
                                    <td className="py-3 px-4 text-center">
                                      {partitePareggiate > 0 && (
                                        <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                          {partitePareggiate}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.partitePerse && (
                                    <td className="py-3 px-4 text-center">
                                      {partitePerse > 0 && (
                                        <Badge variant="destructive" className="font-mono">
                                          {partitePerse}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.goalSubitiFatti && (
                                    <td className="py-3 px-4 text-center">
                                      {(isGoalkeeper ? goalsConceded : playerGoals) > 0 && (
                                        <Badge 
                                          variant="default" 
                                          className={isGoalkeeper ? "bg-red-600 text-white font-mono" : "bg-green-600 text-white font-mono"}
                                        >
                                          {isGoalkeeper ? goalsConceded : playerGoals}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.presenti && (
                                    <td className="py-3 px-4 text-center">
                                      {presentiCount > 0 && (
                                        <Badge variant="default" className="bg-green-600 text-white font-mono">
                                          {presentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.assenti && (
                                    <td className="py-3 px-4 text-center">
                                      {assentiCount > 0 && (
                                        <Badge variant="destructive" className="font-mono">
                                          {assentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.infortuni && (
                                    <td className="py-3 px-4 text-center">
                                      {infortuniCount > 0 && (
                                        <Badge variant="default" className="bg-orange-600 text-white font-mono">
                                          {infortuniCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.gialli && (
                                    <td className="py-3 px-4 text-center">
                                      {playerYellow > 0 && (
                                        <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                          {playerYellow}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.rossi && (
                                    <td className="py-3 px-4 text-center">
                                      {playerRed > 0 && (
                                        <Badge variant="destructive" className="font-mono">
                                          {playerRed}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  <td className="py-3 px-4 text-center">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditPlayer(player)}
                                      className="gap-2"
                                      data-testid={`button-edit-${player.id}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                      Modifica
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          )}

          {/* Edit Player Dialog */}
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">✏️ Modifica Giocatore</DialogTitle>
                <DialogDescription>
                  Aggiorna i dati del giocatore e le presenze
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Player Data Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-primary">Dati Giocatore</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Nome</label>
                      <Input
                        value={editFirstName}
                        onChange={(e) => setEditFirstName(e.target.value)}
                        placeholder="Nome"
                        data-testid="input-edit-firstName"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Cognome</label>
                      <Input
                        value={editLastName}
                        onChange={(e) => setEditLastName(e.target.value)}
                        placeholder="Cognome"
                        data-testid="input-edit-lastName"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Numero Maglia</label>
                      <Input
                        type="number"
                        value={editNumber}
                        onChange={(e) => setEditNumber(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="Es: 10"
                        data-testid="input-edit-number"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold mb-2 block">Ruolo</label>
                      <Input
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        placeholder="Es: Centrocampista"
                        data-testid="input-edit-role"
                      />
                    </div>
                  </div>
                </div>

                {/* Attendances Section */}
                {editAttendances.length > 0 && (
                  <div className="space-y-4 border-t pt-4">
                    <h3 className="text-lg font-semibold text-primary">
                      Presenze ({timePeriod === 'week' ? 'Settimana' : timePeriod === 'month' ? 'Mese' : 'Anno'})
                    </h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {editAttendances.map((att, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 bg-muted/30 rounded-md">
                          <span className="text-sm font-mono min-w-24">
                            {new Date(att.date).toLocaleDateString('it-IT', { 
                              day: '2-digit', 
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </span>
                          <Select
                            value={att.status}
                            onValueChange={(value: 'Presente' | 'Assente' | 'Infortunato') => {
                              const newAttendances = [...editAttendances];
                              newAttendances[index].status = value;
                              setEditAttendances(newAttendances);
                            }}
                          >
                            <SelectTrigger className="w-40" data-testid={`select-status-${index}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Presente">✅ Presente</SelectItem>
                              <SelectItem value="Assente">❌ Assente</SelectItem>
                              <SelectItem value="Infortunato">🤕 Infortunato</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowEditDialog(false)}
                    className="flex-1"
                    data-testid="button-cancel-edit"
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={handleSavePlayer}
                    disabled={!editFirstName.trim() || !editLastName.trim() || updatePlayerMutation.isPending}
                    className="flex-1 neon-glow-cyan"
                    data-testid="button-save-edit"
                  >
                    {updatePlayerMutation.isPending ? 'Salvataggio...' : '💾 Salva Modifiche'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    </div>
  );
}
