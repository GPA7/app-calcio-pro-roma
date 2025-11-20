import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, Users, CheckCircle2, AlertCircle, Goal, UserX, ShieldAlert, Scale, CornerDownRight, Save, ArrowLeftRight, ArrowLeft, FileText, Printer } from "lucide-react";

type Player = {
  id: number;
  firstName: string;
  lastName: string;
  number?: number;
  role?: string;
  suspensionDays?: number;
  yellowCards?: number;
  redCards?: number;
  convocationStatus?: string;
};

type MatchSession = {
  id: number;
  opponent: string;
  date: string;
  location?: string;
  convocationId?: number;
};

type Convocation = {
  id: number;
  name: string;
  matchDate: string;
  opponent: string;
  playerIds: number[];
};

type FormationStatus = 'TITOLARE' | 'PANCHINA' | 'NON_CONVOCATO';

type EventDialogData = {
  eventType: string;
  requiresPlayer: boolean;
  requiresSecondPlayer?: boolean;
};

export default function MatchOffline() {
  const { toast } = useToast();
  const [selectedConvocationId, setSelectedConvocationId] = useState<number | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [playerStatus, setPlayerStatus] = useState<Record<number, FormationStatus>>({});
  const [formationSaved, setFormationSaved] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventDialogData, setEventDialogData] = useState<EventDialogData | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [selectedSecondPlayerId, setSelectedSecondPlayerId] = useState<number | null>(null);
  const [eventMinute, setEventMinute] = useState("");
  const [eventHalf, setEventHalf] = useState<"1" | "2">("1");
  const [eventRating, setEventRating] = useState("");
  const [goalsScored, setGoalsScored] = useState(0);
  const [goalsConceded, setGoalsConceded] = useState(0);
  const [substitutedPlayers, setSubstitutedPlayers] = useState<number[]>([]);
  const [localEvents, setLocalEvents] = useState<any[]>([]);
  const [firstHalfExtraTime, setFirstHalfExtraTime] = useState(0);
  const [secondHalfExtraTime, setSecondHalfExtraTime] = useState(0);

  // Fetch match events (solo per visualizzare eventi già salvati)
  const { data: savedMatchEvents = [] } = useQuery<any[]>({
    queryKey: ['/api/matches', selectedMatchId, 'events'],
    enabled: !!selectedMatchId,
  });

  // Eventi da visualizzare: combina eventi salvati + eventi locali
  const matchEvents = useMemo(() => {
    return [...savedMatchEvents, ...localEvents];
  }, [savedMatchEvents, localEvents]);

  // Fetch all players
  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['/api/players'],
  });

  // Fetch all convocations
  const { data: convocations = [] } = useQuery<Convocation[]>({
    queryKey: ['/api/convocations'],
  });

  // Fetch all matches
  const { data: allMatches = [] } = useQuery<MatchSession[]>({
    queryKey: ['/api/matches'],
  });

  // Fetch formations for selected match
  const { data: existingFormations = [] } = useQuery<any[]>({
    queryKey: ['/api/formations', selectedMatchId],
    enabled: !!selectedMatchId,
  });

  // Get selected convocation
  const selectedConvocation = useMemo(() => {
    if (!selectedConvocationId) return null;
    return convocations.find(c => c.id === selectedConvocationId);
  }, [selectedConvocationId, convocations]);

  // Find or create match for selected convocation
  const selectedMatch = useMemo(() => {
    if (!selectedConvocation) return null;
    // Try to find existing match for this convocation
    return allMatches.find(m => 
      m.convocationId === selectedConvocation.id ||
      (m.opponent === selectedConvocation.opponent && m.date === selectedConvocation.matchDate)
    ) || null;
  }, [selectedConvocation, allMatches]);

  // Update selectedMatchId when selectedMatch changes
  useEffect(() => {
    if (selectedMatch) {
      setSelectedMatchId(selectedMatch.id);
    }
  }, [selectedMatch]);

  // Get convocati players
  const convocatiPlayers = useMemo(() => {
    if (!selectedConvocation) return [];
    return players.filter(p => selectedConvocation.playerIds?.includes(p.id));
  }, [players, selectedConvocation]);

  // Count yellow cards per player
  const playerYellowCards = useMemo(() => {
    const counts: Record<number, number> = {};
    matchEvents.forEach((event: any) => {
      if (event.eventType === 'Cartellino Giallo' && event.playerId) {
        counts[event.playerId] = (counts[event.playerId] || 0) + 1;
      }
    });
    return counts;
  }, [matchEvents]);

  // Count red cards per player
  const playerRedCards = useMemo(() => {
    const counts: Record<number, number> = {};
    matchEvents.forEach((event: any) => {
      if (event.eventType === 'Cartellino Rosso' && event.playerId) {
        counts[event.playerId] = (counts[event.playerId] || 0) + 1;
      }
    });
    return counts;
  }, [matchEvents]);

  // Categorize players by role
  const categorizeByRole = (players: Player[]) => {
    const categories = {
      portieri: [] as Player[],
      difensori: [] as Player[],
      centrocampisti: [] as Player[],
      attaccanti: [] as Player[],
    };

    players.forEach(player => {
      const role = player.role?.toLowerCase() || '';
      
      if (role.includes('portiere')) {
        categories.portieri.push(player);
      } else if (role.includes('difens') || role.includes('terzin')) {
        categories.difensori.push(player);
      } else if (role.includes('centroc') || role.includes('mediano') || role.includes('mezzala')) {
        categories.centrocampisti.push(player);
      } else if (role.includes('attacc') || role.includes('punta') || role.includes('ala') || role.includes('trequart') || role.includes('esterno')) {
        categories.attaccanti.push(player);
      } else {
        // Default to centrocampisti if role is unclear
        categories.centrocampisti.push(player);
      }
    });

    return categories;
  };

  const categorizedPlayers = useMemo(() => {
    return categorizeByRole(convocatiPlayers);
  }, [convocatiPlayers]);

  // Load existing formation data when formations are fetched
  useEffect(() => {
    if (existingFormations.length > 0) {
      // Formazione già salvata - carica i dati
      const statusMap: Record<number, FormationStatus> = {};
      existingFormations.forEach((formation: any) => {
        statusMap[formation.playerId] = formation.status;
      });
      setPlayerStatus(statusMap);
      setFormationSaved(true);
    } else if (selectedMatchId) {
      // Nessuna formazione salvata per questo match
      setFormationSaved(false);
      setPlayerStatus({});
    }
  }, [existingFormations, selectedMatchId]);

  // Initialize player status when convocation is selected
  const handleConvocationSelect = (convocationId: string) => {
    const id = parseInt(convocationId);
    setSelectedConvocationId(id);
    setGoalsScored(0);
    setGoalsConceded(0);
    setSubstitutedPlayers([]);
  };

  // Reset formation and go back to Step A
  const handleResetFormation = () => {
    setFormationSaved(false);
    setPlayerStatus({});
    setGoalsScored(0);
    setGoalsConceded(0);
    setSubstitutedPlayers([]);
  };

  // Toggle player as TITOLARE
  const togglePlayerStatus = (playerId: number) => {
    setPlayerStatus(prev => {
      const current = prev[playerId] === 'TITOLARE';
      const newStatus = { ...prev };
      
      if (current) {
        // Remove from titolari
        delete newStatus[playerId];
      } else {
        // Add as titolare (max 11)
        const currentTitolari = Object.values(newStatus).filter(s => s === 'TITOLARE').length;
        if (currentTitolari < 11) {
          newStatus[playerId] = 'TITOLARE';
        }
      }
      
      return newStatus;
    });
  };

  // Count titolari
  const titolariCount = useMemo(() => {
    return Object.values(playerStatus).filter(s => s === 'TITOLARE').length;
  }, [playerStatus]);

  // Save formation mutation
  const saveFormationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedConvocation) throw new Error("Nessuna convocazione selezionata");
      
      // Find or create match for this convocation
      let matchId = selectedMatch?.id;
      
      if (!matchId) {
        // Create new match for this convocation
        const newMatch: any = await apiRequest('POST', '/api/matches', {
          opponent: selectedConvocation.opponent,
          date: selectedConvocation.matchDate,
          convocationId: selectedConvocation.id,
        });
        matchId = newMatch.id;
        if (matchId) {
          setSelectedMatchId(matchId);
        }
        queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      }
      
      // All convocati players: titolari get TITOLARE, rest get PANCHINA
      const formationData = convocatiPlayers.map(player => ({
        playerId: player.id,
        status: playerStatus[player.id] === 'TITOLARE' ? 'TITOLARE' : 'PANCHINA',
      }));

      return apiRequest('POST', '/api/formations', { 
        matchId: matchId,
        formations: formationData 
      });
    },
    onSuccess: () => {
      setFormationSaved(true);
      toast({
        title: "✅ Formazione Salvata",
        description: `${titolariCount} titolari confermati`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/formations'] });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete all events mutation
  const deleteEventsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMatchId) throw new Error('Match ID non valido');
      return apiRequest('DELETE', `/api/matches/${selectedMatchId}/events`);
    },
    onSuccess: () => {
      toast({
        title: "✅ Eventi Cancellati",
        description: "Tutti gli eventi sono stati eliminati",
      });
      // Reset goals
      setGoalsScored(0);
      setGoalsConceded(0);
      // Cancella anche eventi locali
      setLocalEvents([]);
      // Invalidate events cache to refresh list
      queryClient.invalidateQueries({ queryKey: ['/api/matches', selectedMatchId, 'events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches/all-events'] });
    },
    onError: (error: Error) => {
      toast({
        title: "❌ Errore",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset local events when match changes
  useEffect(() => {
    setLocalEvents([]);
    setGoalsScored(0);
    setGoalsConceded(0);
    setSubstitutedPlayers([]);
  }, [selectedMatchId]);

  // Save match data and update all statistics
  const handleSaveMatchData = async () => {
    if (localEvents.length === 0) {
      toast({
        title: "⚠️ Nessun evento da salvare",
        description: "Non ci sono eventi locali da salvare nel database",
        variant: "destructive",
      });
      return;
    }

    if (!selectedMatchId) return;

    try {
      // STEP 1: Conta i goal fatti e subiti dagli eventi locali
      const homeGoals = localEvents.filter(e => e.eventType === 'Gol').length;
      const awayGoals = localEvents.filter(e => e.eventType === 'Goal Subito').length;

      // STEP 2: Salva minuti supplementari e punteggi nel match
      await apiRequest('PATCH', `/api/matches/${selectedMatchId}`, {
        firstHalfExtraTime,
        secondHalfExtraTime,
        homeScore: homeGoals,
        awayScore: awayGoals,
      });

      // STEP 3: Salva tutti gli eventi locali nel database
      for (const event of localEvents) {
        await apiRequest('POST', `/api/matches/${selectedMatchId}/events`, {
          matchId: event.matchId,
          playerId: event.playerId,
          eventType: event.eventType,
          minute: event.minute,
          half: event.half,
          rating: event.rating,
          secondPlayerId: event.secondPlayerId,
        });
      }

      // STEP 4: Calcola minutesPlayed per ogni giocatore
      const firstHalfMinutes = 45 + firstHalfExtraTime;
      const secondHalfMinutes = 45 + secondHalfExtraTime;
      const totalMinutes = firstHalfMinutes + secondHalfMinutes;

      // Trova eventi di sostituzione
      const substitutions = localEvents.filter(e => e.eventType === 'Sostituzione');

      // Calcola minuti per ogni giocatore nella formazione
      for (const formation of existingFormations) {
        const playerId = formation.playerId;
        let minutesPlayed = 0;
        let minuteEntered: number | undefined = undefined;

        // Verifica se il giocatore è uscito (sostituzione out)
        const subOut = substitutions.find(s => s.playerId === playerId);
        // Verifica se il giocatore è entrato (sostituzione in)
        const subIn = substitutions.find(s => s.secondPlayerId === playerId);

        if (formation.status === 'TITOLARE') {
          if (!subOut) {
            // Titolare che gioca tutto il match
            minutesPlayed = totalMinutes;
          } else {
            // Titolare che esce
            if (subOut.half === 1) {
              minutesPlayed = subOut.minute;
            } else {
              minutesPlayed = firstHalfMinutes + subOut.minute;
            }
          }
        } else if (formation.status === 'PANCHINA' && subIn) {
          // Giocatore che entra dalla panchina
          minuteEntered = subIn.half === 1 
            ? subIn.minute 
            : firstHalfMinutes + subIn.minute;

          if (subIn.half === 1) {
            // Entra nel primo tempo
            minutesPlayed = (firstHalfMinutes - subIn.minute) + secondHalfMinutes;
          } else {
            // Entra nel secondo tempo
            minutesPlayed = secondHalfMinutes - subIn.minute;
          }
        }

        // Aggiorna formation con minuti calcolati
        if (minutesPlayed > 0) {
          await apiRequest('PATCH', `/api/formations/${selectedMatchId}/${playerId}/minutes`, {
            minutesPlayed,
            ...(minuteEntered !== undefined && { minuteEntered }),
          });
        }
      }

      // STEP 5: Decrementa suspensionDays per tutti i giocatori squalificati
      const suspendedPlayers = players.filter(p => (p.suspensionDays || 0) > 0);
      for (const player of suspendedPlayers) {
        const newSuspensionDays = Math.max(0, (player.suspensionDays || 0) - 1);
        await apiRequest('PATCH', `/api/players/${player.id}`, {
          suspensionDays: newSuspensionDays,
          // Se le giornate diventano 0, il giocatore torna convocabile
          ...(newSuspensionDays === 0 && { convocationStatus: 'Convocabile' }),
        });
      }
      
      // Svuota eventi locali dopo salvataggio
      setLocalEvents([]);
      
      // Invalidate all caches to ensure Dashboard Rosa gets updated statistics
      queryClient.invalidateQueries({ queryKey: ['/api/matches', selectedMatchId, 'events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches/all-events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/formations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      
      toast({
        title: "💾 Dati Salvati nel Database",
        description: `${localEvents.length} eventi salvati. Minuti calcolati. Squalifiche aggiornate.`,
      });
    } catch (error) {
      toast({
        title: "❌ Errore Salvataggio",
        description: "Impossibile salvare gli eventi nel database",
        variant: "destructive",
      });
    }
  };

  // Open event dialog
  const openEventDialog = (eventType: string, requiresPlayer: boolean = true, requiresSecondPlayer: boolean = false) => {
    setEventDialogData({ eventType, requiresPlayer, requiresSecondPlayer });
    setEventDialogOpen(true);
  };

  // Handle save event
  const handleSaveEvent = () => {
    if (!selectedMatchId) return;
    
    const minute = parseInt(eventMinute);
    if (isNaN(minute) || minute < 0 || minute > 120) {
      toast({
        title: "❌ Minuto non valido",
        description: "Inserisci un minuto tra 0 e 120",
        variant: "destructive",
      });
      return;
    }

    // Goal Subito doesn't require player - save as local event
    if (eventDialogData?.eventType === 'Goal Subito') {
      setGoalsConceded(prev => prev + 1);
      
      const goalSubitoEvent = {
        matchId: selectedMatchId,
        playerId: null, // No player for goal conceded
        eventType: 'Goal Subito',
        minute: minute,
        half: parseInt(eventHalf),
        id: Date.now(),
        createdAt: new Date().toISOString(),
      };
      
      setLocalEvents(prev => [...prev, goalSubitoEvent]);
      
      toast({
        title: "🥅 Goal Subito Registrato",
        description: `Minuto ${minute} - ${eventHalf}° Tempo (in memoria locale)`,
      });
      setEventDialogOpen(false);
      setEventMinute("");
      return;
    }

    if (eventDialogData?.requiresPlayer && !selectedPlayerId) {
      toast({
        title: "❌ Seleziona Giocatore",
        description: "Devi selezionare un giocatore",
        variant: "destructive",
      });
      return;
    }

    if (eventDialogData?.requiresSecondPlayer && !selectedSecondPlayerId) {
      toast({
        title: "❌ Seleziona Secondo Giocatore",
        description: "Devi selezionare il giocatore che entra",
        variant: "destructive",
      });
      return;
    }

    // Validate rating for Punteggio event
    if (eventDialogData?.eventType === 'Punteggio') {
      const rating = parseInt(eventRating);
      if (isNaN(rating) || rating < 1 || rating > 10) {
        toast({
          title: "❌ Punteggio non valido",
          description: "Inserisci un voto da 1 a 10",
          variant: "destructive",
        });
        return;
      }
    }

    const eventData: any = {
      matchId: selectedMatchId,
      playerId: selectedPlayerId,
      eventType: eventDialogData?.eventType,
      minute: minute,
      half: parseInt(eventHalf),
    };

    // Add rating for Punteggio event
    if (eventDialogData?.eventType === 'Punteggio' && eventRating) {
      eventData.rating = parseInt(eventRating);
    }

    // For substitutions, add second player and track substitution
    if (eventDialogData?.requiresSecondPlayer && selectedSecondPlayerId) {
      eventData.secondPlayerId = selectedSecondPlayerId;
      // Mark player as substituted
      setSubstitutedPlayers(prev => [...prev, selectedPlayerId!]);
    }

    // Update goals scored counter
    if (eventDialogData?.eventType === 'Gol') {
      setGoalsScored(prev => prev + 1);
    }

    // Aggiungi evento alla lista locale (NON salvare nel database ancora)
    const localEvent = {
      ...eventData,
      id: Date.now(), // ID temporaneo
      createdAt: new Date().toISOString(),
    };
    
    setLocalEvents(prev => [...prev, localEvent]);
    
    toast({
      title: `✅ ${eventDialogData?.eventType} Registrato`,
      description: `Minuto ${minute} - ${eventHalf}° Tempo (in memoria locale)`,
    });
    
    // Reset form
    setEventDialogOpen(false);
    setSelectedPlayerId(null);
    setSelectedSecondPlayerId(null);
    setEventMinute("");
    setEventRating("");
  };

  const canSaveFormation = titolariCount === 11 && !formationSaved;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header with Back Button */}
        <div className="space-y-4">
          <Link href="/mobile">
            <Button variant="outline" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Torna Indietro
            </Button>
          </Link>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
              📝 PARTITA OFFLINE
            </h1>
            <p className="text-sm text-muted-foreground">
              Registra eventi partita senza cronometro
            </p>
          </div>
        </div>

        {/* Convocation Selection */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-400" />
              Seleziona Partita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select onValueChange={handleConvocationSelect} value={selectedConvocationId?.toString()}>
              <SelectTrigger data-testid="select-match" className="w-full">
                <SelectValue placeholder="Scegli una partita convocata..." />
              </SelectTrigger>
              <SelectContent>
                {convocations.map((convocation) => (
                  <SelectItem key={convocation.id} value={convocation.id.toString()}>
                    vs {convocation.opponent} - {new Date(convocation.matchDate).toLocaleDateString('it-IT')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Convocation Details */}
        {selectedMatch && selectedConvocation && (
          <Card className="bg-gradient-to-br from-cyan-900/20 to-pink-900/20 border-cyan-700/30">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                📋 Dettagli Convocazione
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <p className="text-xs text-muted-foreground mb-1">Avversario</p>
                  <p className="font-bold text-lg text-cyan-400">{selectedConvocation.opponent}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <p className="text-xs text-muted-foreground mb-1">Data Partita</p>
                  <p className="font-semibold">{new Date(selectedConvocation.matchDate).toLocaleDateString('it-IT')}</p>
                </div>
              </div>
              
              <div className="p-3 rounded-lg bg-slate-800/50">
                <p className="text-xs text-muted-foreground mb-1">🏟️ Campo</p>
                <p className="font-semibold">{(selectedConvocation as any).matchAddress || 'N/D'}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <p className="text-xs text-muted-foreground mb-1">⏰ Arrivo Campo</p>
                  <p className="font-semibold text-orange-400">{(selectedConvocation as any).fieldArrivalTime || 'N/D'}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50">
                  <p className="text-xs text-muted-foreground mb-1">⚽ Inizio Partita</p>
                  <p className="font-semibold text-green-400">{(selectedConvocation as any).matchStartTime || 'N/D'}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/50">
                <p className="text-xs text-muted-foreground mb-1">👥 Convocati</p>
                <p className="font-bold text-xl text-pink-400">{convocatiPlayers.length} giocatori</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP A: Formation Selection */}
        {selectedMatch && !formationSaved && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Formazione (Step A)
                </span>
                <Badge variant={titolariCount === 11 ? "default" : "destructive"}>
                  {titolariCount}/11 Titolari
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Portieri */}
              {categorizedPlayers.portieri.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                    🧤 PORTIERI ({categorizedPlayers.portieri.length})
                  </h3>
                  <div className="space-y-2">
                    {categorizedPlayers.portieri.map(player => {
                      const isTitolare = playerStatus[player.id] === 'TITOLARE';
                      const yellowCards = playerYellowCards[player.id] || 0;
                      const redCards = playerRedCards[player.id] || 0;
                      
                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover-elevate"
                          data-testid={`player-item-${player.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-sm font-bold text-cyan-400 min-w-10 text-center">
                              {player.number ? `#${player.number}` : '?'}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">
                                {player.lastName} {player.firstName}
                              </p>
                              <p className="text-xs text-muted-foreground">{player.role}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-900/30 border-yellow-600 text-yellow-400">
                                🟨 {yellowCards}
                              </Badge>
                              <Badge variant="outline" className="bg-red-900/30 border-red-600 text-red-400">
                                🟥 {redCards}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant={isTitolare ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => togglePlayerStatus(player.id)}
                            data-testid={`button-toggle-status-${player.id}`}
                            className="min-w-12 font-bold"
                          >
                            T
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Difensori */}
              {categorizedPlayers.difensori.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                    🛡️ DIFENSORI ({categorizedPlayers.difensori.length})
                  </h3>
                  <div className="space-y-2">
                    {categorizedPlayers.difensori.map(player => {
                      const isTitolare = playerStatus[player.id] === 'TITOLARE';
                      const yellowCards = playerYellowCards[player.id] || 0;
                      const redCards = playerRedCards[player.id] || 0;
                      
                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover-elevate"
                          data-testid={`player-item-${player.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-sm font-bold text-cyan-400 min-w-10 text-center">
                              {player.number ? `#${player.number}` : '?'}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">
                                {player.lastName} {player.firstName}
                              </p>
                              <p className="text-xs text-muted-foreground">{player.role}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-900/30 border-yellow-600 text-yellow-400">
                                🟨 {yellowCards}
                              </Badge>
                              <Badge variant="outline" className="bg-red-900/30 border-red-600 text-red-400">
                                🟥 {redCards}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant={isTitolare ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => togglePlayerStatus(player.id)}
                            data-testid={`button-toggle-status-${player.id}`}
                            className="min-w-12 font-bold"
                          >
                            T
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Centrocampisti */}
              {categorizedPlayers.centrocampisti.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                    ⚽ CENTROCAMPISTI ({categorizedPlayers.centrocampisti.length})
                  </h3>
                  <div className="space-y-2">
                    {categorizedPlayers.centrocampisti.map(player => {
                      const isTitolare = playerStatus[player.id] === 'TITOLARE';
                      const yellowCards = playerYellowCards[player.id] || 0;
                      const redCards = playerRedCards[player.id] || 0;
                      
                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover-elevate"
                          data-testid={`player-item-${player.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-sm font-bold text-cyan-400 min-w-10 text-center">
                              {player.number ? `#${player.number}` : '?'}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">
                                {player.lastName} {player.firstName}
                              </p>
                              <p className="text-xs text-muted-foreground">{player.role}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-900/30 border-yellow-600 text-yellow-400">
                                🟨 {yellowCards}
                              </Badge>
                              <Badge variant="outline" className="bg-red-900/30 border-red-600 text-red-400">
                                🟥 {redCards}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant={isTitolare ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => togglePlayerStatus(player.id)}
                            data-testid={`button-toggle-status-${player.id}`}
                            className="min-w-12 font-bold"
                          >
                            T
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Attaccanti */}
              {categorizedPlayers.attaccanti.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                    ⚡ ATTACCANTI ({categorizedPlayers.attaccanti.length})
                  </h3>
                  <div className="space-y-2">
                    {categorizedPlayers.attaccanti.map(player => {
                      const isTitolare = playerStatus[player.id] === 'TITOLARE';
                      const yellowCards = playerYellowCards[player.id] || 0;
                      const redCards = playerRedCards[player.id] || 0;
                      
                      return (
                        <div
                          key={player.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 hover-elevate"
                          data-testid={`player-item-${player.id}`}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="text-sm font-bold text-cyan-400 min-w-10 text-center">
                              {player.number ? `#${player.number}` : '?'}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">
                                {player.lastName} {player.firstName}
                              </p>
                              <p className="text-xs text-muted-foreground">{player.role}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="bg-yellow-900/30 border-yellow-600 text-yellow-400">
                                🟨 {yellowCards}
                              </Badge>
                              <Badge variant="outline" className="bg-red-900/30 border-red-600 text-red-400">
                                🟥 {redCards}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant={isTitolare ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => togglePlayerStatus(player.id)}
                            data-testid={`button-toggle-status-${player.id}`}
                            className="min-w-12 font-bold"
                          >
                            T
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 space-y-2">
                {titolariCount === 11 ? (
                  <div className="flex items-center gap-2 text-sm text-green-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>✅ 11 titolari selezionati - Pronto per salvare!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-yellow-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>Seleziona esattamente 11 titolari ({titolariCount}/11)</span>
                  </div>
                )}
                <Button
                  onClick={() => saveFormationMutation.mutate()}
                  disabled={!canSaveFormation || saveFormationMutation.isPending}
                  className="w-full"
                  size="lg"
                  data-testid="button-save-formation"
                >
                  {saveFormationMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvataggio...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Salva Formazione (Il resto va in panchina)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Formation Saved - Show Formation Status */}
        {formationSaved && (
          <>
            <Card className="bg-slate-900/50 border-slate-800">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Situazione Formazione
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {/* Titolari in Campo */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-purple-400">
                      <Users className="w-4 h-4" />
                      Titolari in Campo ({titolariCount})
                    </div>
                    <div className="space-y-1">
                      {convocatiPlayers
                        .filter(p => playerStatus[p.id] === 'TITOLARE' && !substitutedPlayers.includes(p.id))
                        .map(player => (
                          <div key={player.id} className="text-xs p-2 rounded bg-slate-800/50 text-slate-200">
                            {player.lastName} {player.firstName}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Panchina */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-orange-400">
                      <Users className="w-4 h-4" />
                      Panchina ({convocatiPlayers.length - titolariCount})
                    </div>
                    <div className="space-y-1">
                      {convocatiPlayers
                        .filter(p => playerStatus[p.id] !== 'TITOLARE')
                        .map(player => (
                          <div key={player.id} className="text-xs p-2 rounded bg-slate-800/50 text-slate-200">
                            {player.lastName} {player.firstName}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Sostituiti */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold text-blue-400">
                      <ArrowLeftRight className="w-4 h-4" />
                      Sostituiti
                    </div>
                    <div className="space-y-1">
                      {substitutedPlayers.length === 0 ? (
                        <div className="text-xs p-2 rounded bg-slate-800/50 text-slate-400 italic">
                          Nessuno
                        </div>
                      ) : (
                        substitutedPlayers.map(playerId => {
                          const player = convocatiPlayers.find(p => p.id === playerId);
                          return player ? (
                            <div key={player.id} className="text-xs p-2 rounded bg-blue-900/30 text-blue-200">
                              {player.lastName} {player.firstName}
                            </div>
                          ) : null;
                        })
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* STEP B: Event Registration */}
        {formationSaved && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CornerDownRight className="w-5 h-5 text-pink-400" />
                Registra Eventi (Step B)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Score Display */}
              <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-slate-800/50">
                <div className="text-center">
                  <p className="text-3xl font-black text-green-400">{goalsScored}</p>
                  <p className="text-xs text-muted-foreground">Goal Fatti</p>
                </div>
                <div className="text-2xl font-bold text-muted-foreground">-</div>
                <div className="text-center">
                  <p className="text-3xl font-black text-red-400">{goalsConceded}</p>
                  <p className="text-xs text-muted-foreground">Goal Subiti</p>
                </div>
              </div>

              {/* Extra Time Inputs */}
              <div className="space-y-3 p-4 rounded-lg bg-slate-800/50 border border-cyan-500/30">
                <h4 className="text-sm font-bold text-cyan-400">⏱️ Minuti Supplementari (Recupero)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-half-extra" className="text-xs text-muted-foreground">
                      1° Tempo
                    </Label>
                    <Input
                      id="first-half-extra"
                      type="number"
                      min="0"
                      max="15"
                      value={firstHalfExtraTime}
                      onChange={(e) => setFirstHalfExtraTime(parseInt(e.target.value) || 0)}
                      className="h-10 bg-slate-900/50 border-slate-700"
                      placeholder="0"
                      data-testid="input-first-half-extra"
                    />
                    <p className="text-[10px] text-muted-foreground">Totale: {45 + firstHalfExtraTime} min</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="second-half-extra" className="text-xs text-muted-foreground">
                      2° Tempo
                    </Label>
                    <Input
                      id="second-half-extra"
                      type="number"
                      min="0"
                      max="15"
                      value={secondHalfExtraTime}
                      onChange={(e) => setSecondHalfExtraTime(parseInt(e.target.value) || 0)}
                      className="h-10 bg-slate-900/50 border-slate-700"
                      placeholder="0"
                      data-testid="input-second-half-extra"
                    />
                    <p className="text-[10px] text-muted-foreground">Totale: {45 + secondHalfExtraTime} min</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <Link href={`/match-report/${selectedMatchId}`} className="contents">
                    <Button
                      variant="outline"
                      className="h-12"
                      data-testid="button-view-report"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Vedi Report
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="h-12"
                    onClick={() => window.print()}
                    data-testid="button-print-report"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Stampa Report
                  </Button>
                  <Button
                    variant="default"
                    className="h-12 bg-green-600 hover:bg-green-700"
                    onClick={handleSaveMatchData}
                    data-testid="button-save-match-data"
                    disabled={localEvents.length === 0}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salva Dati {localEvents.length > 0 && `(${localEvents.length} eventi)`}
                  </Button>
                  <Button
                    variant="destructive"
                    className="h-12"
                    onClick={() => deleteEventsMutation.mutate()}
                    disabled={deleteEventsMutation.isPending}
                    data-testid="button-delete-match-data"
                  >
                    <UserX className="w-4 h-4 mr-2" />
                    {deleteEventsMutation.isPending ? "Cancellazione..." : "Cancella Eventi"}
                  </Button>
                </div>
                
                {/* Reset Formation Button */}
                <Button
                  variant="outline"
                  className="w-full h-12 border-orange-600 text-orange-400 hover:bg-orange-900/20"
                  onClick={handleResetFormation}
                  data-testid="button-reset-formation"
                >
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Modifica Formazione
                </Button>
              </div>

              {/* 🎮 GAMING EVENT CONTROL PANEL 🎮 */}
              <div className="space-y-6">
                {/* OFFENSIVE ACTIONS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pb-2 border-b-2 border-green-500/30">
                    <div className="w-1 h-6 bg-gradient-to-b from-green-400 to-green-600 rounded-full shadow-lg shadow-green-500/50"></div>
                    <h3 className="text-sm font-black tracking-wider text-green-400 uppercase drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
                      ⚡ AZIONI OFFENSIVE
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => openEventDialog('Gol', true)}
                      className="group relative h-24 rounded-xl bg-gradient-to-br from-green-600 to-green-800 border-2 border-green-500/50 shadow-lg hover:shadow-green-500/50 hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden"
                      data-testid="button-event-goal"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative h-full flex flex-col items-center justify-center gap-1 p-2">
                        <Goal className="w-8 h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                        <span className="text-sm font-black tracking-wide drop-shadow-md">GOAL</span>
                        <div className="absolute top-1 right-1 bg-black/40 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {matchEvents.filter(e => e.eventType === 'Gol').length}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-200"></div>
                    </button>

                    <button
                      onClick={() => openEventDialog('Assist', true)}
                      className="group relative h-24 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 border-2 border-blue-500/50 shadow-lg hover:shadow-blue-500/50 hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden"
                      data-testid="button-event-assist"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative h-full flex flex-col items-center justify-center gap-1 p-2">
                        <CornerDownRight className="w-8 h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                        <span className="text-xs font-black tracking-wide drop-shadow-md">ASSIST</span>
                        <div className="absolute top-1 right-1 bg-black/40 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {matchEvents.filter(e => e.eventType === 'Assist').length}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-200"></div>
                    </button>

                    <button
                      onClick={() => openEventDialog('Rigore', true)}
                      className="group relative h-24 rounded-xl bg-gradient-to-br from-orange-600 to-orange-800 border-2 border-orange-500/50 shadow-lg hover:shadow-orange-500/50 hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden"
                      data-testid="button-event-penalty"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative h-full flex flex-col items-center justify-center gap-1 p-2">
                        <Scale className="w-8 h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                        <span className="text-xs font-black tracking-wide drop-shadow-md">RIGORE</span>
                        <div className="absolute top-1 right-1 bg-black/40 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {matchEvents.filter(e => e.eventType === 'Rigore').length}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-200"></div>
                    </button>

                    <button
                      onClick={() => openEventDialog('Errore Goal', true)}
                      className="group relative h-24 rounded-xl bg-gradient-to-br from-red-800 to-red-950 border-2 border-red-700/50 shadow-lg hover:shadow-red-700/50 hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden"
                      data-testid="button-event-miss"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative h-full flex flex-col items-center justify-center gap-1 p-2">
                        <span className="text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">❌</span>
                        <span className="text-[10px] font-black tracking-wide drop-shadow-md">ERRORE GOAL</span>
                        <div className="absolute top-1 right-1 bg-black/40 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {matchEvents.filter(e => e.eventType === 'Errore Goal').length}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-200"></div>
                    </button>
                  </div>
                </div>

                {/* DEFENSIVE ACTIONS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pb-2 border-b-2 border-red-500/30">
                    <div className="w-1 h-6 bg-gradient-to-b from-red-400 to-red-600 rounded-full shadow-lg shadow-red-500/50"></div>
                    <h3 className="text-sm font-black tracking-wider text-red-400 uppercase drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                      🛡️ DIFESA
                    </h3>
                  </div>
                  <div className="grid grid-cols-1">
                    <button
                      onClick={() => openEventDialog('Goal Subito', false)}
                      className="group relative h-24 rounded-xl bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-500/50 shadow-lg hover:shadow-red-500/50 hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden"
                      data-testid="button-event-goal-conceded"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative h-full flex flex-col items-center justify-center gap-1 p-2">
                        <Goal className="w-10 h-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                        <span className="text-sm font-black tracking-wide drop-shadow-md">GOAL SUBITO</span>
                        <div className="absolute top-1 right-1 bg-black/40 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {goalsConceded}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-200"></div>
                    </button>
                  </div>
                </div>

                {/* DISCIPLINARY ACTIONS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pb-2 border-b-2 border-yellow-500/30">
                    <div className="w-1 h-6 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full shadow-lg shadow-yellow-500/50"></div>
                    <h3 className="text-sm font-black tracking-wider text-yellow-400 uppercase drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">
                      ⚖️ DISCIPLINA
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => openEventDialog('Cartellino Giallo', true)}
                      className="group relative h-24 rounded-xl bg-gradient-to-br from-yellow-600 to-yellow-800 border-2 border-yellow-500/50 shadow-lg hover:shadow-yellow-500/50 hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden"
                      data-testid="button-event-yellow"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative h-full flex flex-col items-center justify-center gap-1 p-2">
                        <ShieldAlert className="w-8 h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                        <span className="text-xs font-black tracking-wide drop-shadow-md">GIALLO</span>
                        <div className="absolute top-1 right-1 bg-black/40 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {matchEvents.filter(e => e.eventType === 'Cartellino Giallo').length}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-200"></div>
                    </button>

                    <button
                      onClick={() => openEventDialog('Cartellino Rosso', true)}
                      className="group relative h-24 rounded-xl bg-gradient-to-br from-red-700 to-red-900 border-2 border-red-600/50 shadow-lg hover:shadow-red-600/50 hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden"
                      data-testid="button-event-red"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative h-full flex flex-col items-center justify-center gap-1 p-2">
                        <UserX className="w-8 h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                        <span className="text-xs font-black tracking-wide drop-shadow-md">ROSSO</span>
                        <div className="absolute top-1 right-1 bg-black/40 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {matchEvents.filter(e => e.eventType === 'Cartellino Rosso').length}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-200"></div>
                    </button>

                    <button
                      onClick={() => openEventDialog('Infortunio', true)}
                      className="group relative h-24 rounded-xl bg-gradient-to-br from-pink-600 to-pink-800 border-2 border-pink-500/50 shadow-lg hover:shadow-pink-500/50 hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden"
                      data-testid="button-event-injury"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative h-full flex flex-col items-center justify-center gap-1 p-2">
                        <span className="text-3xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">🤕</span>
                        <span className="text-[10px] font-black tracking-wide drop-shadow-md">INFORTUNIO</span>
                        <div className="absolute top-1 right-1 bg-black/40 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {matchEvents.filter(e => e.eventType === 'Infortunio').length}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-200"></div>
                    </button>
                  </div>
                </div>

                {/* GAME CONTROL */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 pb-2 border-b-2 border-cyan-500/30">
                    <div className="w-1 h-6 bg-gradient-to-b from-cyan-400 to-cyan-600 rounded-full shadow-lg shadow-cyan-500/50"></div>
                    <h3 className="text-sm font-black tracking-wider text-cyan-400 uppercase drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
                      🎯 CONTROLLO GIOCO
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openEventDialog('Sostituzione', true, true)}
                      className="group relative h-24 rounded-xl bg-gradient-to-br from-purple-600 to-purple-800 border-2 border-purple-500/50 shadow-lg hover:shadow-purple-500/50 hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden"
                      data-testid="button-event-substitution"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative h-full flex flex-col items-center justify-center gap-1 p-2">
                        <ArrowLeftRight className="w-8 h-8 drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]" />
                        <span className="text-xs font-black tracking-wide drop-shadow-md">CAMBIO</span>
                        <div className="absolute top-1 right-1 bg-black/40 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {matchEvents.filter(e => e.eventType === 'Sostituzione').length}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-200"></div>
                    </button>

                    <button
                      onClick={() => openEventDialog('Punteggio', true)}
                      className="group relative h-24 rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-800 border-2 border-cyan-500/50 shadow-lg hover:shadow-cyan-500/50 hover:scale-105 active:scale-95 transition-all duration-200 overflow-hidden"
                      data-testid="button-event-rating"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                      <div className="relative h-full flex flex-col items-center justify-center gap-1 p-2">
                        <span className="text-4xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">⭐</span>
                        <span className="text-xs font-black tracking-wide drop-shadow-md">VOTO</span>
                        <div className="absolute top-1 right-1 bg-black/40 rounded-full px-2 py-0.5 text-[10px] font-bold">
                          {matchEvents.filter(e => e.eventType === 'Punteggio').length}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/10 transition-opacity duration-200"></div>
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Events List - BY CATEGORY */}
        {formationSaved && (
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CornerDownRight className="w-5 h-5 text-pink-400" />
                Eventi Registrati ({matchEvents.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matchEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun evento registrato
                </div>
              ) : (
                <div className="space-y-6">
                  {/* SOSTITUZIONI */}
                  {matchEvents.filter(e => e.eventType === 'Sostituzione').length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-purple-400 flex items-center gap-2">
                        🔄 SOSTITUZIONI ({matchEvents.filter(e => e.eventType === 'Sostituzione').length})
                      </h3>
                      {matchEvents.filter(e => e.eventType === 'Sostituzione').map((event, idx) => {
                        const playerOut = players.find(p => p.id === event.playerId);
                        const playerIn = event.secondPlayerId ? players.find(p => p.id === event.secondPlayerId) : null;
                        return (
                          <div key={event.id || idx} className="p-3 rounded-lg bg-purple-900/20 border border-purple-700/30">
                            <p className="text-xs text-red-300">❌ ESCE: #{playerOut?.number || '?'} {playerOut?.lastName} {playerOut?.firstName}</p>
                            <p className="text-xs text-muted-foreground">⏱️ {event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</p>
                            <p className="text-xs text-green-300">✅ ENTRA: #{playerIn?.number || '?'} {playerIn?.lastName} {playerIn?.firstName}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ESPULSI */}
                  {matchEvents.filter(e => e.eventType === 'Cartellino Rosso').length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-red-400 flex items-center gap-2">
                        🟥 ESPULSI ({matchEvents.filter(e => e.eventType === 'Cartellino Rosso').length})
                      </h3>
                      {matchEvents.filter(e => e.eventType === 'Cartellino Rosso').map((event, idx) => {
                        const player = players.find(p => p.id === event.playerId);
                        return (
                          <div key={event.id || idx} className="p-3 rounded-lg bg-red-900/20 border border-red-700/30">
                            <p className="text-sm font-semibold text-red-300">🟥 ESPULSO</p>
                            <p className="text-xs">#{player?.number || '?'} {player?.lastName} {player?.firstName}</p>
                            <p className="text-xs text-muted-foreground">⏱️ {event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* AMMONITI */}
                  {matchEvents.filter(e => e.eventType === 'Cartellino Giallo').length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-yellow-400 flex items-center gap-2">
                        🟨 AMMONITI ({matchEvents.filter(e => e.eventType === 'Cartellino Giallo').length})
                      </h3>
                      {matchEvents.filter(e => e.eventType === 'Cartellino Giallo').map((event, idx) => {
                        const player = players.find(p => p.id === event.playerId);
                        return (
                          <div key={event.id || idx} className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-700/30">
                            <p className="text-sm font-semibold text-yellow-300">🟨 AMMONITO</p>
                            <p className="text-xs">#{player?.number || '?'} {player?.lastName} {player?.firstName}</p>
                            <p className="text-xs text-muted-foreground">⏱️ {event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* GOAL FATTI */}
                  {matchEvents.filter(e => e.eventType === 'Gol').length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-green-400 flex items-center gap-2">
                        ⚽ GOAL FATTI ({matchEvents.filter(e => e.eventType === 'Gol').length})
                      </h3>
                      {matchEvents.filter(e => e.eventType === 'Gol').map((event, idx) => {
                        const player = players.find(p => p.id === event.playerId);
                        return (
                          <div key={event.id || idx} className="p-3 rounded-lg bg-green-900/20 border border-green-700/30">
                            <p className="text-sm font-semibold text-green-300">⚽ GOL</p>
                            <p className="text-xs">#{player?.number || '?'} {player?.lastName} {player?.firstName}</p>
                            <p className="text-xs text-muted-foreground">⏱️ {event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* INFORTUNI */}
                  {matchEvents.filter(e => e.eventType === 'Infortunio').length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-orange-400 flex items-center gap-2">
                        🤕 INFORTUNI ({matchEvents.filter(e => e.eventType === 'Infortunio').length})
                      </h3>
                      {matchEvents.filter(e => e.eventType === 'Infortunio').map((event, idx) => {
                        const player = players.find(p => p.id === event.playerId);
                        return (
                          <div key={event.id || idx} className="p-3 rounded-lg bg-orange-900/20 border border-orange-700/30">
                            <p className="text-sm font-semibold text-orange-300">🤕 INFORTUNIO</p>
                            <p className="text-xs">#{player?.number || '?'} {player?.lastName} {player?.firstName}</p>
                            <p className="text-xs text-muted-foreground">⏱️ {event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* RIGORI */}
                  {matchEvents.filter(e => e.eventType === 'Rigore').length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-blue-400 flex items-center gap-2">
                        🎯 RIGORI ({matchEvents.filter(e => e.eventType === 'Rigore').length})
                      </h3>
                      {matchEvents.filter(e => e.eventType === 'Rigore').map((event, idx) => {
                        const player = players.find(p => p.id === event.playerId);
                        return (
                          <div key={event.id || idx} className="p-3 rounded-lg bg-blue-900/20 border border-blue-700/30">
                            <p className="text-sm font-semibold text-blue-300">🎯 RIGORE</p>
                            <p className="text-xs">#{player?.number || '?'} {player?.lastName} {player?.firstName}</p>
                            <p className="text-xs text-muted-foreground">⏱️ {event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* NOTE / ALTRI EVENTI */}
                  {matchEvents.filter(e => !['Sostituzione', 'Cartellino Rosso', 'Cartellino Giallo', 'Gol', 'Infortunio', 'Rigore'].includes(e.eventType)).length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-bold text-slate-400 flex items-center gap-2">
                        💬 ALTRI EVENTI ({matchEvents.filter(e => !['Sostituzione', 'Cartellino Rosso', 'Cartellino Giallo', 'Gol', 'Infortunio', 'Rigore'].includes(e.eventType)).length})
                      </h3>
                      {matchEvents.filter(e => !['Sostituzione', 'Cartellino Rosso', 'Cartellino Giallo', 'Gol', 'Infortunio', 'Rigore'].includes(e.eventType)).map((event, idx) => {
                        const player = event.playerId ? players.find(p => p.id === event.playerId) : null;
                        return (
                          <div key={event.id || idx} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/30">
                            <p className="text-sm font-semibold text-slate-300">{event.eventType}</p>
                            {player && (
                              <p className="text-xs">#{player?.number || '?'} {player?.lastName} {player?.firstName}</p>
                            )}
                            {event.description && (
                              <p className="text-xs text-slate-400 italic">{event.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">⏱️ {event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Event Dialog */}
        <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">
                {eventDialogData?.eventType}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Player Selection */}
              {eventDialogData?.requiresPlayer && (
                <div className="space-y-2">
                  <Label>
                    {eventDialogData.requiresSecondPlayer ? 'Chi Esce? (Titolare in campo)' : 'Chi?'}
                  </Label>
                  <Select onValueChange={(v) => setSelectedPlayerId(parseInt(v))} value={selectedPlayerId?.toString()}>
                    <SelectTrigger data-testid="select-event-player">
                      <SelectValue placeholder="Seleziona giocatore..." />
                    </SelectTrigger>
                    <SelectContent>
                      {eventDialogData.requiresSecondPlayer ? (
                        // For substitutions: only show TITOLARI in campo (not substituted)
                        convocatiPlayers
                          .filter(p => playerStatus[p.id] === 'TITOLARE' && !substitutedPlayers.includes(p.id))
                          .map(player => (
                            <SelectItem key={player.id} value={player.id.toString()}>
                              #{player.number || '?'} - {player.lastName} {player.firstName}
                            </SelectItem>
                          ))
                      ) : (
                        // For other events: show all convocati
                        convocatiPlayers.map(player => (
                          <SelectItem key={player.id} value={player.id.toString()}>
                            #{player.number || '?'} - {player.lastName} {player.firstName}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Second Player (for substitutions) - Only PANCHINA */}
              {eventDialogData?.requiresSecondPlayer && (
                <div className="space-y-2">
                  <Label>Chi Entra? (dalla Panchina)</Label>
                  <Select onValueChange={(v) => setSelectedSecondPlayerId(parseInt(v))} value={selectedSecondPlayerId?.toString()}>
                    <SelectTrigger data-testid="select-event-player-in">
                      <SelectValue placeholder="Seleziona dalla panchina..." />
                    </SelectTrigger>
                    <SelectContent>
                      {convocatiPlayers
                        .filter(p => 
                          playerStatus[p.id] !== 'TITOLARE' && 
                          !substitutedPlayers.includes(p.id) &&
                          p.id !== selectedPlayerId
                        )
                        .map(player => (
                          <SelectItem key={player.id} value={player.id.toString()}>
                            #{player.number || '?'} - {player.lastName} {player.firstName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Minute Input */}
              <div className="space-y-2">
                <Label>Minuto?</Label>
                <Input
                  type="number"
                  min="0"
                  max="120"
                  placeholder="es: 23"
                  value={eventMinute}
                  onChange={(e) => setEventMinute(e.target.value)}
                  data-testid="input-event-minute"
                />
              </div>

              {/* Rating Input (only for Punteggio) */}
              {eventDialogData?.eventType === 'Punteggio' && (
                <div className="space-y-2">
                  <Label>Voto Giocatore (1-10)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    placeholder="es: 7"
                    value={eventRating}
                    onChange={(e) => setEventRating(e.target.value)}
                    data-testid="input-event-rating"
                  />
                  <p className="text-xs text-muted-foreground">Inserisci un voto da 1 (pessimo) a 10 (eccellente)</p>
                </div>
              )}

              {/* Half Selection */}
              <div className="space-y-2">
                <Label>Tempo?</Label>
                <RadioGroup value={eventHalf} onValueChange={(v) => setEventHalf(v as "1" | "2")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1" id="half-1" data-testid="radio-half-1" />
                    <Label htmlFor="half-1">1° Tempo</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="2" id="half-2" data-testid="radio-half-2" />
                    <Label htmlFor="half-2">2° Tempo</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setEventDialogOpen(false)}
                data-testid="button-cancel-event"
              >
                Annulla
              </Button>
              <Button
                onClick={handleSaveEvent}
                data-testid="button-save-event"
              >
                Registra Evento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
