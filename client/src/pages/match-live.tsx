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
import { Play, Pause, Clock, Plus, Timer, Flag, AlertTriangle, UserX, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Navigation } from "@/components/Navigation";
import type { Player, MatchSession, MatchEvent } from "@shared/schema";

type MatchPhase = 'NOT_STARTED' | 'FIRST_HALF' | 'HALF_TIME' | 'SECOND_HALF' | 'FINISHED';

export default function MatchLivePage() {
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [selectedConvocationId, setSelectedConvocationId] = useState<number | null>(null);
  const [matchPhase, setMatchPhase] = useState<MatchPhase>('NOT_STARTED');
  const [isRunning, setIsRunning] = useState(false);
  const [firstHalfSeconds, setFirstHalfSeconds] = useState(0);
  const [secondHalfSeconds, setSecondHalfSeconds] = useState(0);
  const [wakeLock, setWakeLock] = useState<any>(null);
  const [playerFormationStatus, setPlayerFormationStatus] = useState<Record<number, 'TITOLARE' | 'PANCHINA'>>({});
  
  // Dialog states for events
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [showSubDialog, setShowSubDialog] = useState(false);
  const [showYellowDialog, setShowYellowDialog] = useState(false);
  const [showRedDialog, setShowRedDialog] = useState(false);
  const [showInjuryDialog, setShowInjuryDialog] = useState(false);
  const [showRigoreDialog, setShowRigoreDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  
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

  // Carica tutte le convocazioni disponibili
  const { data: convocations = [] } = useQuery<any[]>({
    queryKey: ['/api/convocations'],
  });

  // Carica i dettagli della match selezionata
  const { data: selectedMatchData } = useQuery<MatchSession>({
    queryKey: [`/api/matches/${selectedMatch}`],
    enabled: !!selectedMatch,
  });

  // Carica la convocazione selezionata
  const { data: selectedConvocation } = useQuery<any>({
    queryKey: [`/api/convocations/${selectedConvocationId}`],
    enabled: !!selectedConvocationId,
  });

  // Filtra i giocatori: mostra solo quelli convocati
  const convocatedPlayers = players.filter(player => {
    // Se c'è una convocazione selezionata, mostra solo i giocatori convocati
    if (selectedConvocation?.playerIds && Array.isArray(selectedConvocation.playerIds)) {
      return selectedConvocation.playerIds.includes(player.id);
    }
    // Altrimenti mostra tutti (fallback)
    return true;
  });

  // Raggruppa giocatori per ruolo
  const getRoleCategory = (role: string | null) => {
    if (!role) return 'Altro';
    const roleLower = role.toLowerCase();
    if (roleLower.includes('portiere')) return 'Portieri';
    if (roleLower.includes('difens') || roleLower.includes('terzin')) return 'Difensori';
    if (roleLower.includes('centrocampist') || roleLower.includes('mediano')) return 'Centrocampisti';
    if (roleLower.includes('attaccante') || roleLower.includes('ala') || roleLower.includes('trequartista') || roleLower.includes('punta')) return 'Attaccanti';
    return 'Altro';
  };

  const groupedPlayers = convocatedPlayers.reduce((acc, player) => {
    const category = getRoleCategory(player.role);
    if (!acc[category]) acc[category] = [];
    acc[category].push(player);
    return acc;
  }, {} as Record<string, typeof convocatedPlayers>);

  const roleOrder = ['Portieri', 'Difensori', 'Centrocampisti', 'Attaccanti', 'Altro'];

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
      } else {
        setSelectedMatch(matches[0].id);
      }
    } else if (matches.length > 0 && !selectedMatch && !isMobileMode) {
      // Normal mode: just auto-select first match
      setSelectedMatch(matches[0].id);
    }
  }, [matches, selectedMatch, isMobileMode]);

  // Reset all states when changing match - clean slate for each match
  useEffect(() => {
    if (selectedMatch) {
      setMatchPhase('NOT_STARTED');
      setIsRunning(false);
      setFirstHalfSeconds(0);
      setSecondHalfSeconds(0);
      
      // Reset all dialog states
      setShowGoalDialog(false);
      setShowSubDialog(false);
      setShowYellowDialog(false);
      setShowRedDialog(false);
      setShowInjuryDialog(false);
      setShowRigoreDialog(false);
      setShowNoteDialog(false);
      
      // Reset event data
      setSelectedPlayer(null);
      setAssistPlayer(null);
      setSubOutPlayer(null);
      setSubInPlayer(null);
      setInjuredPlayer(null);
      setNoteText('');
    }
  }, [selectedMatch]);

  const { data: events = [] } = useQuery<MatchEvent[]>({
    queryKey: [`/api/matches/${selectedMatch}/events`],
    enabled: !!selectedMatch,
  });

  // Carica la formazione salvata per visualizzare titolari/panchina/sostituiti
  const { data: formationData = [] } = useQuery<any[]>({
    queryKey: [`/api/formations/${selectedMatch}`],
    enabled: !!selectedMatch,
  });

  // Sincronizza playerFormationStatus da formationData quando carica
  useEffect(() => {
    const statusMap: Record<number, 'TITOLARE' | 'PANCHINA'> = {};
    
    // Se formationData è vuoto, reset a {} (evita dati vecchi di altre partite)
    if (formationData.length === 0) {
      setPlayerFormationStatus({});
      return;
    }
    
    // Popola da backend
    formationData.forEach(f => {
      // Ignora giocatori sostituiti: un giocatore è OUT se minutesPlayed !== null
      // (anche se = 0, es. sostituito al minuto 0)
      if (f.minutesPlayed !== null && f.minutesPlayed !== undefined) return;
      
      if (f.status === 'TITOLARE' || f.status === 'PANCHINA') {
        statusMap[f.playerId] = f.status;
      }
    });
    setPlayerFormationStatus(statusMap);
  }, [formationData]);

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
      // Reload match data to get updated startTime for event filtering
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${selectedMatch}`] });
      toast({ title: "Partita iniziata" });
    },
  });

  // Wake Lock - mantiene lo schermo acceso durante la partita
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (matchPhase === 'FIRST_HALF' || matchPhase === 'HALF_TIME' || matchPhase === 'SECOND_HALF')) {
          const lock = await (navigator as any).wakeLock.request('screen');
          setWakeLock(lock);
          console.log('🔒 Wake Lock attivato - lo schermo resterà acceso');
          
          lock.addEventListener('release', () => {
            console.log('🔓 Wake Lock rilasciato');
          });
        }
      } catch (err) {
        console.error('Wake Lock non disponibile:', err);
      }
    };

    const releaseWakeLock = async () => {
      if (wakeLock) {
        try {
          await wakeLock.release();
          setWakeLock(null);
          console.log('🔓 Wake Lock rilasciato manualmente');
        } catch (err) {
          console.error('Errore rilascio Wake Lock:', err);
        }
      }
    };

    if (matchPhase === 'FIRST_HALF' && !wakeLock) {
      // Attiva wake lock all'inizio della partita
      requestWakeLock();
    } else if (matchPhase === 'FINISHED' && wakeLock) {
      // Rilascia wake lock alla fine della partita
      releaseWakeLock();
    }

    // Cleanup: rilascia wake lock se il componente viene smontato
    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [matchPhase]);

  // Timer effect - continua sempre fino a fine partita
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        if (matchPhase === 'FIRST_HALF' || matchPhase === 'HALF_TIME') {
          // Durante 1° tempo e intervallo, continua a contare in firstHalfSeconds
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
    
    // ELIMINA SEMPRE tutti gli eventi prima di iniziare (anche se è un restart)
    apiRequest('DELETE', `/api/matches/${selectedMatch}/events`).then(() => {
      // POI aggiorna startTime
      startMatchMutation.mutate(undefined, {
        onSuccess: () => {
          // Crea evento automatico DOPO che startTime è stato aggiornato
          createEventMutation.mutate({
            eventType: 'Nota',
            minute: 0,
            description: '🟢 Inizio 1° Tempo',
          });
        }
      });
    });
  };

  const handleEndFirstHalf = () => {
    setMatchPhase('HALF_TIME');
    // NON fermare il timer - continua a contare
    toast({ title: "Fine 1° Tempo", description: `Durata: ${formatTime(firstHalfSeconds)}` });
    
    // Crea evento automatico: Fine 1° Tempo
    createEventMutation.mutate({
      eventType: 'Nota',
      minute: currentMinute,
      description: `⏸️ Fine 1° Tempo (${formatTime(firstHalfSeconds)})`,
    });
  };

  const handleStartSecondHalf = () => {
    setMatchPhase('SECOND_HALF');
    setIsRunning(true);
    toast({ title: "Inizio 2° Tempo" });
    
    // Crea evento automatico: Inizio 2° Tempo
    createEventMutation.mutate({
      eventType: 'Nota',
      minute: currentMinute,
      description: '🟢 Inizio 2° Tempo',
    });
  };

  const handleEndMatch = async () => {
    setMatchPhase('FINISHED');
    setIsRunning(false);
    
    // Calculate minutes for all players still on field
    try {
      const res = await apiRequest('GET', `/api/formations/${selectedMatch}`);
      const formationData = await res.json();
      
      // Update minutes for all TITOLARE players who haven't been substituted (minutesPlayed = 0)
      for (const formation of formationData) {
        if (formation.status === 'TITOLARE' && (formation.minutesPlayed === 0 || formation.minutesPlayed === null)) {
          const minuteEntered = formation.minuteEntered || 0;
          const minutesPlayed = currentMinute - minuteEntered;
          
          await apiRequest('PATCH', `/api/formations/${selectedMatch}/${formation.playerId}/minutes`, {
            minutesPlayed: minutesPlayed,
          });
        }
      }
    } catch (error) {
      console.error('Errore calcolo minuti finali:', error);
    }
    
    toast({ 
      title: "Fine Partita", 
      description: `1°T: ${formatTime(firstHalfSeconds)} | 2°T: ${formatTime(secondHalfSeconds)}` 
    });
    
    // Crea evento automatico: Fine Partita
    createEventMutation.mutate({
      eventType: 'Nota',
      minute: currentMinute,
      description: `🏁 Fine Partita (${formatTime(firstHalfSeconds + secondHalfSeconds)})`,
    });

    // Reset page after match ends (mobile mode only) - ONLY UI reset, NO data deletion
    if (isMobileMode) {
      setTimeout(() => {
        // Reset all states for next match (UI only)
        setMatchPhase('NOT_STARTED');
        setFirstHalfSeconds(0);
        setSecondHalfSeconds(0);
        toast({ title: "✅ Pagina pronta per la prossima partita" });
      }, 3000); // Wait 3 seconds to show final result
    }
  };

  // Get players on field vs bench (from formation status)
  // SOLO i TITOLARI possono generare eventi (gol, infortuni, cartellini)
  // Quando un giocatore entra (sostituzione), diventa TITOLARE e può fare tutto
  const playersOnField = convocatedPlayers.filter(p => playerFormationStatus[p.id] === 'TITOLARE');
  const playersOnBench = convocatedPlayers.filter(p => playerFormationStatus[p.id] === 'PANCHINA');
  
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
  
  const handleSubstitution = async (outId: number, inId: number) => {
    if (!canSubstitute) {
      toast({ title: "Cambi esauriti", description: `Hai già fatto ${maxSubstitutions} sostituzioni`, variant: "destructive" });
      return;
    }
    
    const outPlayer = players.find(p => p.id === outId);
    const inPlayer = players.find(p => p.id === inId);
    
    // Get OUT player's formation data to calculate minutes
    const res = await apiRequest('GET', `/api/formations/${selectedMatch}`);
    const formationData = await res.json();
    const outPlayerFormation = formationData.find((f: any) => f.playerId === outId);
    
    // Calculate minutes played for OUT player
    const minuteEntered = outPlayerFormation?.minuteEntered || 0;
    const minutesPlayed = currentMinute - minuteEntered;
    
    // Update OUT player minutes
    await apiRequest('PATCH', `/api/formations/${selectedMatch}/${outId}/minutes`, {
      minutesPlayed: minutesPlayed,
    });
    
    // Update IN player: set minute entered and make them TITOLARE
    await apiRequest('PATCH', `/api/formations/${selectedMatch}/${inId}/minutes`, {
      minuteEntered: currentMinute,
      status: 'TITOLARE',
    });
    
    // Aggiorna playerFormationStatus locale: 
    // - OUT player rimosso (sostituito, non più disponibile)
    // - IN player diventa TITOLARE
    setPlayerFormationStatus(prev => {
      const updated = { ...prev };
      delete updated[outId]; // OUT non più selezionabile
      updated[inId] = 'TITOLARE'; // IN diventa titolare
      return updated;
    });
    
    // Invalida query per ricaricare formationData con minutesPlayed aggiornati
    queryClient.invalidateQueries({ queryKey: [`/api/formations/${selectedMatch}`] });
    
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-primary">Partita Live</h1>
            <p className="text-lg text-muted-foreground">
              Gestisci la partita in tempo reale con timer ed eventi
            </p>
          </div>

          {/* Selezione Convocazione */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-xl">📋 Seleziona Convocazione</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedConvocationId?.toString() || ""}
                onValueChange={(value) => setSelectedConvocationId(parseInt(value))}
              >
                <SelectTrigger className="w-full" data-testid="select-convocation">
                  <SelectValue placeholder="Scegli una convocazione..." />
                </SelectTrigger>
                <SelectContent>
                  {convocations.map((conv) => (
                    <SelectItem 
                      key={conv.id} 
                      value={conv.id.toString()}
                      data-testid={`convocation-option-${conv.id}`}
                    >
                      {conv.opponent ? `vs ${conv.opponent}` : `Convocazione ${conv.id}`} - {new Date(conv.date).toLocaleDateString('it-IT')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Tabella Convocati per la Convocazione Selezionata */}
          {selectedConvocation && (
            <Card className="border-primary/30 border-2">
              <CardHeader>
                <CardTitle className="text-2xl text-primary">
                  👥 Giocatori Convocati ({convocatedPlayers.length})
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  vs {selectedConvocation.opponent} - {new Date(selectedConvocation.date).toLocaleDateString('it-IT')}
                </p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold text-sm">N°</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Giocatore</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm">Ruolo</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm">🟨</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm">T/P</th>
                      </tr>
                    </thead>
                    <tbody>
                      {convocatedPlayers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nessun giocatore convocato
                          </td>
                        </tr>
                      ) : (
                        roleOrder.flatMap(roleCategory => {
                          const playersInRole = groupedPlayers[roleCategory] || [];
                          if (playersInRole.length === 0) return [];
                          
                          return [
                            <tr key={`header-${roleCategory}`} className="bg-primary/10">
                              <td colSpan={5} className="py-2 px-4">
                                <span className="font-bold text-primary uppercase text-sm">
                                  {roleCategory}
                                </span>
                              </td>
                            </tr>,
                            ...playersInRole.map((player) => (
                              <tr 
                                key={player.id} 
                                className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                                data-testid={`convocated-player-row-${player.id}`}
                              >
                                <td className="py-3 px-4">
                                  <span className="font-bold text-secondary text-lg">
                                    {player.number ? `#${player.number}` : '--'}
                                  </span>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-col gap-1">
                                    <span className="font-semibold text-foreground">
                                      {player.lastName} {player.firstName}
                                    </span>
                                    {player.suspensionDays && player.suspensionDays > 0 && (
                                      <span className="text-xs text-red-400 font-semibold">
                                        🔴 Espulso {player.suspensionDays} {player.suspensionDays === 1 ? 'giornata' : 'giornate'}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="text-sm text-muted-foreground">
                                    {player.role || 'N/D'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {player.yellowCards && player.yellowCards > 0 ? (
                                    <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded text-sm font-bold text-yellow-400">
                                      {player.yellowCards}
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <Select
                                    value={playerFormationStatus[player.id] || ''}
                                    onValueChange={(value: 'TITOLARE' | 'PANCHINA') => {
                                      const newStatus = {
                                        ...playerFormationStatus,
                                        [player.id]: value
                                      };
                                      setPlayerFormationStatus(newStatus);
                                      
                                      // Salva automaticamente quando cambia lo status
                                      const formations = Object.entries(newStatus).map(([playerId, status]) => ({
                                        playerId: parseInt(playerId),
                                        status,
                                        // minutesPlayed: null = giocatore attivo (non sostituito)
                                        // minutesPlayed: 0 o >0 = giocatore sostituito (minuti giocati)
                                        minutesPlayed: null,
                                        minuteEntered: status === 'TITOLARE' ? 0 : null,
                                      }));
                                      
                                      apiRequest('POST', '/api/formations', {
                                        matchId: selectedMatch,
                                        formations,
                                      }).then(() => {
                                        queryClient.invalidateQueries({ queryKey: [`/api/formations/${selectedMatch}`] });
                                      });
                                    }}
                                  >
                                    <SelectTrigger className="w-24" data-testid={`select-status-${player.id}`}>
                                      <SelectValue placeholder="Scegli" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="TITOLARE">T</SelectItem>
                                      <SelectItem value="PANCHINA">P</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </td>
                              </tr>
                            ))
                          ];
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Titolari: </span>
                    <span className={`font-bold ${Object.values(playerFormationStatus).filter(s => s === 'TITOLARE').length === 11 ? 'text-green-500' : 'text-red-500'}`}>
                      {Object.values(playerFormationStatus).filter(s => s === 'TITOLARE').length}
                    </span>
                    <span className="text-muted-foreground"> / 11</span>
                    
                    <span className="ml-6 text-muted-foreground">Panchina: </span>
                    <span className="font-bold text-blue-500">
                      {Object.values(playerFormationStatus).filter(s => s === 'PANCHINA').length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabella Riepilogo Formazione Live */}
          {Object.keys(playerFormationStatus).length > 0 && (
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="text-xl">⚽ Situazione Formazione</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Titolari in Campo */}
                  <div>
                    <h3 className="font-semibold text-green-500 mb-3 flex items-center gap-2">
                      <span className="text-2xl">👕</span> Titolari in Campo ({Object.entries(playerFormationStatus).filter(([_, status]) => status === 'TITOLARE').length})
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(playerFormationStatus)
                        .filter(([_, status]) => status === 'TITOLARE')
                        .map(([playerId, _]) => {
                          const player = players.find(p => p.id === parseInt(playerId));
                          const formation = formationData.find(f => f.playerId === parseInt(playerId));
                          const isSub = formation && formation.minutesPlayed > 0;
                          
                          if (isSub) return null; // Già sostituito
                          
                          return player ? (
                            <div key={player.id} className="p-2 rounded bg-green-500/10 border border-green-500/30">
                              <span className="font-semibold">{player.lastName} {player.firstName}</span>
                              {player.number && <span className="ml-2 text-sm text-muted-foreground">#{player.number}</span>}
                            </div>
                          ) : null;
                        })}
                    </div>
                  </div>

                  {/* Panchina */}
                  <div>
                    <h3 className="font-semibold text-blue-500 mb-3 flex items-center gap-2">
                      <span className="text-2xl">🪑</span> Panchina ({Object.entries(playerFormationStatus).filter(([_, status]) => status === 'PANCHINA').length})
                    </h3>
                    <div className="space-y-2">
                      {Object.entries(playerFormationStatus)
                        .filter(([_, status]) => status === 'PANCHINA')
                        .map(([playerId, _]) => {
                          const player = players.find(p => p.id === parseInt(playerId));
                          const formation = formationData.find(f => f.playerId === parseInt(playerId));
                          const hasEntered = formation && formation.minuteEntered !== null && formation.minuteEntered !== undefined;
                          
                          if (hasEntered) return null; // Già entrato
                          
                          return player ? (
                            <div key={player.id} className="p-2 rounded bg-blue-500/10 border border-blue-500/30">
                              <span className="font-semibold">{player.lastName} {player.firstName}</span>
                              {player.number && <span className="ml-2 text-sm text-muted-foreground">#{player.number}</span>}
                            </div>
                          ) : null;
                        })}
                    </div>
                  </div>

                  {/* Sostituiti */}
                  <div>
                    <h3 className="font-semibold text-orange-500 mb-3 flex items-center gap-2">
                      <span className="text-2xl">🔄</span> Sostituiti
                    </h3>
                    <div className="space-y-2">
                      {formationData
                        .filter(f => f.minutesPlayed > 0)
                        .map(formation => {
                          const player = players.find(p => p.id === formation.playerId);
                          const subEvent = events.find(e => 
                            e.eventType === 'Sostituzione' && 
                            e.description?.includes(player?.lastName || '')
                          );
                          return player ? (
                            <div key={player.id} className="p-2 rounded bg-orange-500/10 border border-orange-500/30">
                              <div className="flex justify-between items-center">
                                <div>
                                  <span className="font-semibold">{player.lastName} {player.firstName}</span>
                                  {player.number && <span className="ml-2 text-sm text-muted-foreground">#{player.number}</span>}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {subEvent ? `${subEvent.minute}'` : `${formation.minutesPlayed}'`}
                                </span>
                              </div>
                            </div>
                          ) : null;
                        })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rosa - Tabella Giocatori (hidden in mobile mode) */}
          {!isMobileMode && (
          <Card className="border-primary/30 border-2">
            <CardHeader>
              <CardTitle className="text-2xl text-primary">Rosa Squadra ({convocatedPlayers.length} Convocati)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-sm">N°</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Giocatore</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Ruolo</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">⚽ Gol</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">🟨 Gialli</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">🟥 Rossi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {convocatedPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nessun giocatore convocato per questa partita
                        </td>
                      </tr>
                    ) : (
                      convocatedPlayers.map((player) => {
                        const playerGoals = events.filter(e => e.playerId === player.id && e.eventType === 'Gol').length;
                        const playerYellow = events.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Giallo').length;
                        const playerRed = events.filter(e => e.playerId === player.id && e.eventType === 'Cartellino Rosso').length;
                        
                        return (
                          <tr 
                            key={player.id} 
                            className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                            data-testid={`player-row-${player.id}`}
                          >
                            <td className="py-3 px-4">
                              <span className="font-bold text-secondary text-lg">
                                {player.number ? `#${player.number}` : '--'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-foreground">{player.lastName} {player.firstName}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-muted-foreground">
                                {player.role || 'N/D'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {playerGoals > 0 && (
                                <Badge variant="default" className="bg-green-600 text-white font-mono">
                                  {playerGoals}
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {playerYellow > 0 && (
                                <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                  {playerYellow}
                                </Badge>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {playerRed > 0 && (
                                <Badge variant="destructive" className="font-mono">
                                  {playerRed}
                                </Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          )}

              {/* Cronometro e Controlli Fase */}
              <Card className="border-primary/30 border-2 bg-gradient-to-br from-card/90 to-primary/5">
                <CardContent className="pt-6 pb-6">
                  <div className="space-y-6">
                    
                    {/* Informazioni Partita - Solo quando NON iniziata */}
                    {matchPhase === 'NOT_STARTED' && selectedConvocation && (
                      <div className="space-y-3 pb-4 border-b border-border/50">
                        <h3 className="text-center text-lg font-semibold text-primary mb-3">📋 Dati Partita</h3>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center">
                            <p className="text-xs text-muted-foreground mb-1">📅 Data Partita</p>
                            <p className="font-semibold text-sm">
                              {new Date(selectedConvocation.matchDate).toLocaleDateString('it-IT')}
                            </p>
                          </div>
                          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-center">
                            <p className="text-xs text-muted-foreground mb-1">🏟️ Avversario</p>
                            <p className="font-semibold text-sm">{selectedConvocation.opponent}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                            <p className="text-xs text-muted-foreground mb-1">📍 Ritrovo Campo</p>
                            <p className="font-semibold text-sm">{selectedConvocation.fieldArrivalTime}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-center">
                            <p className="text-xs text-muted-foreground mb-1">⏱️ Inizio Partita</p>
                            <p className="font-semibold text-sm">{selectedConvocation.matchStartTime}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Fase e Timer */}
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center gap-3 flex-wrap">
                        <Badge 
                          className={`text-lg px-6 py-2 font-bold ${getPhaseColor()}`}
                          data-testid="match-phase-badge"
                        >
                          <Clock className="h-5 w-5 mr-2" />
                          {getPhaseLabel()}
                        </Badge>
                        
                        {wakeLock && (
                          <Badge 
                            variant="outline" 
                            className="text-sm px-3 py-1 bg-green-500/20 border-green-500/50 text-green-400"
                          >
                            🔒 Schermo Acceso
                          </Badge>
                        )}
                      </div>
                      
                      <div className="text-6xl font-mono font-bold text-primary neon-glow-cyan" data-testid="timer-display">
                        {matchPhase === 'FIRST_HALF' && formatTime(firstHalfSeconds)}
                        {matchPhase === 'SECOND_HALF' && formatTime(secondHalfSeconds)}
                        {matchPhase === 'NOT_STARTED' && '00:00'}
                        {matchPhase === 'HALF_TIME' && 'INTERVALLO'}
                        {matchPhase === 'FINISHED' && 'FINITA'}
                      </div>
                      
                      {(matchPhase === 'FIRST_HALF' || matchPhase === 'SECOND_HALF') && (
                        <p className="text-sm text-muted-foreground">
                          Minuto: <span className="font-bold text-lg text-foreground">{currentMinute}'</span>
                        </p>
                      )}
                    </div>
                    
                    {/* Controlli Fase */}
                    <div className="flex gap-3 justify-center flex-wrap">
                      {matchPhase === 'NOT_STARTED' && (
                        <div className="flex flex-col items-center gap-2">
                          <Button
                            size="lg"
                            onClick={handleStartMatch}
                            disabled={Object.values(playerFormationStatus).filter(s => s === 'TITOLARE').length !== 11}
                            className="neon-glow-cyan text-lg px-8 py-6"
                            data-testid="button-start-match"
                          >
                            <Play className="h-6 w-6 mr-2" />
                            Inizia Partita
                          </Button>
                          {Object.values(playerFormationStatus).filter(s => s === 'TITOLARE').length !== 11 && (
                            <p className="text-sm text-red-500">
                              ⚠️ Seleziona 11 titolari per iniziare
                            </p>
                          )}
                        </div>
                      )}
                      
                      {matchPhase === 'FIRST_HALF' && (
                        <Button
                          size="lg"
                          variant="secondary"
                          onClick={handleEndFirstHalf}
                          className="neon-glow-pink text-lg px-8 py-6"
                          data-testid="button-end-first-half"
                        >
                          <Timer className="h-5 w-5 mr-2" />
                          Fine 1° Tempo
                        </Button>
                      )}
                      
                      {matchPhase === 'HALF_TIME' && (
                        <Button
                          size="lg"
                          onClick={handleStartSecondHalf}
                          className="neon-glow-cyan text-lg px-8 py-6"
                          data-testid="button-start-second-half"
                        >
                          <Play className="h-6 w-6 mr-2" />
                          Inizia 2° Tempo
                        </Button>
                      )}
                      
                      {matchPhase === 'SECOND_HALF' && (
                        <Button
                          size="lg"
                          variant="destructive"
                          onClick={handleEndMatch}
                          className="text-lg px-8 py-6"
                          data-testid="button-end-match"
                        >
                          <Flag className="h-5 w-5 mr-2" />
                          Fine Partita
                        </Button>
                      )}
                      
                      {matchPhase === 'FINISHED' && (
                        <div className="text-center space-y-2">
                          <p className="text-2xl font-bold text-green-600">🏁 Partita Conclusa</p>
                          <p className="text-muted-foreground">
                            Durata Totale: {formatTime(firstHalfSeconds + secondHalfSeconds)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Eventi registrati: {events.length}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Event Control Panel - Sempre visibile */}
              {(matchPhase === 'FIRST_HALF' || matchPhase === 'SECOND_HALF') && (
                <Card className="border-primary/30 border-2 bg-card/80 backdrop-blur">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <CardTitle className="text-2xl text-primary">🎮 Pannello Eventi</CardTitle>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="text-base px-3 py-1">
                          Cambi: {substitutionsMade}/{maxSubstitutions}
                        </Badge>
                        <Badge className="bg-primary text-primary-foreground text-base px-3 py-1">
                          ⚽ {goalsScored}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    
                    {/* EVENTI PRIMARI - 6 bottoni giganti */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        Eventi Primari
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Button
                          size="lg"
                          onClick={() => setShowGoalDialog(true)}
                          className="h-20 text-lg flex-col gap-1 bg-green-600 hover:bg-green-700 neon-glow-cyan"
                          data-testid="button-event-goal"
                        >
                          <span className="text-3xl">⚽</span>
                          <span>GOL</span>
                        </Button>
                        
                        <Button
                          size="lg"
                          onClick={() => setShowSubDialog(true)}
                          disabled={!canSubstitute}
                          className="h-20 text-lg flex-col gap-1 bg-purple-600 hover:bg-purple-700"
                          data-testid="button-event-substitution"
                        >
                          <span className="text-3xl">🔄</span>
                          <span>CAMBIO</span>
                        </Button>
                        
                        <Button
                          size="lg"
                          onClick={() => setShowYellowDialog(true)}
                          className="h-20 text-lg flex-col gap-1 bg-yellow-500 hover:bg-yellow-600 text-black"
                          data-testid="button-event-yellow"
                        >
                          <span className="text-3xl">🟨</span>
                          <span>GIALLO</span>
                        </Button>
                        
                        <Button
                          size="lg"
                          onClick={() => setShowRedDialog(true)}
                          className="h-20 text-lg flex-col gap-1 bg-red-600 hover:bg-red-700"
                          data-testid="button-event-red"
                        >
                          <span className="text-3xl">🟥</span>
                          <span>ROSSO</span>
                        </Button>
                        
                        <Button
                          size="lg"
                          onClick={() => setShowInjuryDialog(true)}
                          className="h-20 text-lg flex-col gap-1 bg-orange-600 hover:bg-orange-700"
                          data-testid="button-event-injury"
                        >
                          <span className="text-3xl">🚑</span>
                          <span>INFORTUNIO</span>
                        </Button>
                        
                        <Button
                          size="lg"
                          onClick={() => setIsRunning(!isRunning)}
                          variant="outline"
                          className="h-20 text-lg flex-col gap-1"
                          data-testid="button-pause-play"
                        >
                          <span className="text-3xl">{isRunning ? '⏸️' : '▶️'}</span>
                          <span>{isRunning ? 'PAUSA' : 'RIPRENDI'}</span>
                        </Button>
                      </div>
                    </div>
                    
                    {/* EVENTI SECONDARI - riga compatta */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                        Eventi Secondari
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          onClick={() => setShowRigoreDialog(true)}
                          variant="outline"
                          className="gap-2"
                          data-testid="button-event-rigore"
                        >
                          🎯 Rigore
                        </Button>
                        <Button
                          onClick={() => handleSimpleEvent('Corner')}
                          variant="outline"
                          className="gap-2"
                          data-testid="button-event-corner"
                        >
                          🚩 Corner
                        </Button>
                        <Button
                          onClick={() => handleSimpleEvent('Fuorigioco')}
                          variant="outline"
                          className="gap-2"
                          data-testid="button-event-fuorigioco"
                        >
                          ⚠️ Fuorigioco
                        </Button>
                        <Button
                          onClick={() => setShowNoteDialog(true)}
                          variant="outline"
                          className="gap-2"
                          data-testid="button-event-note"
                        >
                          💬 Nota
                        </Button>
                      </div>
                    </div>
                    
                  </CardContent>
                </Card>
              )}

              {/* 
                🚨 SEZIONE DESKTOP/MOBILE - NON MODIFICARE SENZA PERMESSO ESPLICITO 🚨
                
                REGOLA ASSOLUTA: Gli eventi devono mostrare SOLO quelli della partita corrente
                
                MECCANISMO DOPPIA PROTEZIONE:
                1. Al click "Inizia Partita": ELIMINA tutti gli eventi precedenti del match
                2. Filtro display: mostra solo eventi con createdAt > startTime
                
                Questo sistema è stato richiesto 10 volte e DEVE rimanere così.
                OGNI partita inizia con lista eventi COMPLETAMENTE VUOTA.
                Eventi di sessioni precedenti vengono CANCELLATI dal database.
              */}
              <Card className="border-border/50 transition-neon hover:border-primary/30">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl text-primary">
                    Eventi Partita Corrente ({events.filter(e => selectedMatchData?.startTime && new Date(e.createdAt) > new Date(selectedMatchData.startTime)).length})
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-2">
                    I dati sono relativi solo a questa partita
                  </p>
                </CardHeader>
                <CardContent>
                  {events.filter(e => selectedMatchData?.startTime && new Date(e.createdAt) > new Date(selectedMatchData.startTime)).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      Nessun evento registrato in questa sessione
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {events
                        .filter(e => selectedMatchData?.startTime && new Date(e.createdAt) > new Date(selectedMatchData.startTime))
                        .map((event, idx) => {
                          const player = players.find(p => p.id === event.playerId);
                          return (
                            <div 
                              key={event.id || idx}
                              className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover-elevate transition-neon"
                              data-testid={`event-${idx}`}
                            >
                              <Badge className="font-mono text-base px-3 py-1 bg-primary/20 text-primary border-primary/30">
                                {event.minute}'
                              </Badge>
                              <div className="text-3xl">{getEventIcon(event.eventType)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-lg truncate">
                                  {player ? `${player.lastName} ${player.firstName}` : 'Giocatore'} - {event.eventType}
                                </p>
                                {event.description && (
                                  <p className="text-sm text-muted-foreground truncate">{event.description}</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* ===== DIALOG SEZIONE ===== */}
              
              {/* Dialog GOL */}
              <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">⚽ Registra Gol</DialogTitle>
                    <DialogDescription>
                      Seleziona il marcatore ed eventualmente chi ha assistito
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Chi ha segnato?</label>
                      <Select value={selectedPlayer?.toString() || ""} onValueChange={(v) => setSelectedPlayer(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona marcatore" />
                        </SelectTrigger>
                        <SelectContent>
                          {playersOnField.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              #{p.number} {p.lastName} {p.firstName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Assist (opzionale)</label>
                      <Select value={assistPlayer?.toString() || "none"} onValueChange={(v) => setAssistPlayer(v === "none" ? null : parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Nessun assist" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nessuno</SelectItem>
                          {playersOnField.filter(p => p.id !== selectedPlayer).map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              #{p.number} {p.lastName} {p.firstName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700 neon-glow-cyan"
                      disabled={!selectedPlayer}
                      onClick={() => selectedPlayer && handleGoal(selectedPlayer, assistPlayer)}
                    >
                      ⚽ Conferma Gol - Minuto {currentMinute}'
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Dialog CAMBIO */}
              <Dialog open={showSubDialog} onOpenChange={setShowSubDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">🔄 Sostituzione</DialogTitle>
                    <DialogDescription>
                      Seleziona chi esce e chi entra (Cambi: {substitutionsMade}/{maxSubstitutions})
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block text-red-500">Chi ESCE? (in campo)</label>
                      <Select value={subOutPlayer?.toString() || ""} onValueChange={(v) => setSubOutPlayer(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Giocatore da sostituire" />
                        </SelectTrigger>
                        <SelectContent>
                          {playersOnField.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              #{p.number} {p.lastName} {p.firstName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold mb-2 block text-green-500">Chi ENTRA? (panchina)</label>
                      <Select value={subInPlayer?.toString() || ""} onValueChange={(v) => setSubInPlayer(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Giocatore che entra" />
                        </SelectTrigger>
                        <SelectContent>
                          {playersOnBench.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              #{p.number} {p.lastName} {p.firstName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      disabled={!subOutPlayer || !subInPlayer}
                      onClick={() => subOutPlayer && subInPlayer && handleSubstitution(subOutPlayer, subInPlayer)}
                    >
                      🔄 Conferma Cambio - Minuto {currentMinute}'
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Dialog GIALLO */}
              <Dialog open={showYellowDialog} onOpenChange={setShowYellowDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">🟨 Cartellino Giallo</DialogTitle>
                    <DialogDescription>Seleziona il giocatore ammonito</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Select value={selectedPlayer?.toString() || ""} onValueChange={(v) => setSelectedPlayer(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona giocatore" />
                      </SelectTrigger>
                      <SelectContent>
                        {playersOnField.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            #{p.number} {p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black"
                      disabled={!selectedPlayer}
                      onClick={() => selectedPlayer && handleCard(selectedPlayer, 'Cartellino Giallo')}
                    >
                      🟨 Conferma Ammonizione - Minuto {currentMinute}'
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Dialog ROSSO */}
              <Dialog open={showRedDialog} onOpenChange={setShowRedDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">🟥 Cartellino Rosso</DialogTitle>
                    <DialogDescription>Seleziona il giocatore espulso</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Select value={selectedPlayer?.toString() || ""} onValueChange={(v) => setSelectedPlayer(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona giocatore" />
                      </SelectTrigger>
                      <SelectContent>
                        {playersOnField.map(p => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            #{p.number} {p.firstName} {p.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700"
                      disabled={!selectedPlayer}
                      onClick={() => selectedPlayer && handleCard(selectedPlayer, 'Cartellino Rosso')}
                    >
                      🟥 Conferma Espulsione - Minuto {currentMinute}'
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Dialog INFORTUNIO */}
              <Dialog open={showInjuryDialog} onOpenChange={setShowInjuryDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">🚑 Infortunio</DialogTitle>
                    <DialogDescription>Registra infortunio e decidi se sostituire</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <label className="text-sm font-semibold mb-2 block">Giocatore infortunato</label>
                      <Select value={injuredPlayer?.toString() || ""} onValueChange={(v) => setInjuredPlayer(parseInt(v))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona giocatore" />
                        </SelectTrigger>
                        <SelectContent>
                          {playersOnField.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              #{p.number} {p.lastName} {p.firstName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {injuredPlayer && (
                      <div className="space-y-2">
                        <Button 
                          className="w-full bg-orange-600 hover:bg-orange-700"
                          onClick={() => handleInjury(injuredPlayer, false)}
                        >
                          Registra Solo Infortunio
                        </Button>
                        {canSubstitute && playersOnBench.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-sm text-center text-muted-foreground">Oppure sostituisci subito con:</p>
                            <div className="grid grid-cols-2 gap-2">
                              {playersOnBench.slice(0, 4).map(p => (
                                <Button
                                  key={p.id}
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => handleInjury(injuredPlayer, true, p.id)}
                                >
                                  #{p.number} {p.lastName} {p.firstName}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Dialog RIGORE */}
              <Dialog open={showRigoreDialog} onOpenChange={setShowRigoreDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">🎯 Calcio di Rigore</DialogTitle>
                    <DialogDescription>Registra l'esito del rigore</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-4">
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setShowRigoreDialog(false);
                        setShowGoalDialog(true);
                      }}
                    >
                      ⚽ GOAL - Rigore segnato
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        handleSimpleEvent('Rigore');
                        setShowRigoreDialog(false);
                      }}
                    >
                      🧤 PARATO - Rigore parato
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        handleSimpleEvent('Rigore');
                        setShowRigoreDialog(false);
                      }}
                    >
                      ⚠️ FUORI - Rigore sbagliato
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
              {/* Dialog NOTA */}
              <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl">💬 Aggiungi Nota</DialogTitle>
                    <DialogDescription>Registra un evento o annotazione personalizzata</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Textarea
                      placeholder="Scrivi la tua nota qui..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={4}
                    />
                    <Button 
                      className="w-full"
                      disabled={!noteText.trim()}
                      onClick={() => handleNote(noteText)}
                    >
                      💬 Salva Nota - Minuto {currentMinute}'
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              
        </div>
      </div>
    </div>
  );
}
