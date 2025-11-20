import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Navigation } from "@/components/Navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart3, TrendingUp, Award, Clock, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Player, MatchSession, MatchEvent, Convocation } from "@shared/schema";

export default function AnalisiPartitaPage() {
  const { toast } = useToast();
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [showAddEventDialog, setShowAddEventDialog] = useState(false);
  const [newEventPlayerId, setNewEventPlayerId] = useState<number | null>(null);
  const [newEventPlayerInId, setNewEventPlayerInId] = useState<number | null>(null); // Per sostituzioni: chi entra
  const [newEventType, setNewEventType] = useState<string>('Gol');
  const [newEventMinute, setNewEventMinute] = useState<number>(1);
  const [newEventHalf, setNewEventHalf] = useState<number>(1);
  
  // Read matchId from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const matchIdParam = params.get('matchId');
    if (matchIdParam) {
      setSelectedMatch(parseInt(matchIdParam));
    }
  }, []);

  const { data: matches = [] } = useQuery<MatchSession[]>({
    queryKey: ['/api/matches'],
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['/api/players'],
  });

  const { data: convocations = [] } = useQuery<Convocation[]>({
    queryKey: ['/api/convocations'],
  });

  // Get all events to filter matches with registered events
  const { data: allEvents = [] } = useQuery<MatchEvent[]>({
    queryKey: ['/api/matches/all-events'],
  });

  // Filter matches to show only those with registered events
  const matchesWithEvents = matches.filter(match => 
    allEvents.some(event => event.matchId === match.id)
  );

  const { data: formations = [] } = useQuery<any[]>({
    queryKey: [`/api/formations/${selectedMatch}`],
    enabled: !!selectedMatch,
  });

  const { data: events = [] } = useQuery<MatchEvent[]>({
    queryKey: [`/api/matches/${selectedMatch}/events`],
    enabled: !!selectedMatch,
  });

  // Build player stats from formations and events
  const playerStats = formations.map(formation => {
    const player = players.find(p => p.id === formation.playerId);
    if (!player) return null;

    // Get all events for this player
    const playerEvents = events.filter(e => e.playerId === formation.playerId);
    
    // Count event types
    const goals = playerEvents.filter(e => e.eventType === 'Gol').length;
    const assists = playerEvents.filter(e => e.eventType === 'Assist').length;
    const yellowCards = playerEvents.filter(e => e.eventType === 'Cartellino Giallo').length;
    const redCards = playerEvents.filter(e => e.eventType === 'Cartellino Rosso').length;
    const injuries = playerEvents.filter(e => e.eventType === 'Infortunio').length;

    return {
      playerId: player.id,
      lastName: player.lastName,
      firstName: player.firstName,
      number: player.number,
      status: formation.status,
      minutesPlayed: formation.minutesPlayed || 0,
      minuteEntered: formation.minuteEntered,
      goals,
      assists,
      yellowCards,
      redCards,
      injuries,
      events: playerEvents,
    };
  }).filter(Boolean);

  // Sort: Titolari first, then by number
  const sortedStats = playerStats.sort((a, b) => {
    if (!a || !b) return 0;
    if (a.status === 'TITOLARE' && b.status !== 'TITOLARE') return -1;
    if (a.status !== 'TITOLARE' && b.status === 'TITOLARE') return 1;
    return (a.number || 999) - (b.number || 999);
  });

  // Mutations for adding/deleting events
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => apiRequest('DELETE', `/api/match-events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${selectedMatch}/events`] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches/all-events'] });
      toast({ title: "✅ Evento eliminato" });
    },
    onError: () => {
      toast({ title: "Errore durante l'eliminazione", variant: "destructive" });
    }
  });

  const addEventMutation = useMutation({
    mutationFn: (event: any) => apiRequest('POST', `/api/matches/${selectedMatch}/events`, event),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/matches/${selectedMatch}/events`] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches/all-events'] });
      setShowAddEventDialog(false);
      setNewEventPlayerId(null);
      setNewEventPlayerInId(null);
      setNewEventType('Gol');
      setNewEventMinute(1);
      setNewEventHalf(1);
      toast({ title: "✅ Evento aggiunto" });
    },
    onError: () => {
      toast({ title: "Errore durante l'aggiunta", variant: "destructive" });
    }
  });

  const handleAddEvent = () => {
    if (!newEventPlayerId) {
      toast({ title: "Seleziona un giocatore", variant: "destructive" });
      return;
    }
    
    // Validazione sostituzione
    if (newEventType === 'Sostituzione' && !newEventPlayerInId) {
      toast({ title: "Seleziona chi entra dalla panchina", variant: "destructive" });
      return;
    }
    
    const eventData: any = {
      playerId: newEventPlayerId,
      eventType: newEventType,
      minute: newEventMinute,
      half: newEventHalf,
    };
    
    // Aggiungi playerInId solo per sostituzioni
    if (newEventType === 'Sostituzione' && newEventPlayerInId) {
      eventData.playerInId = newEventPlayerInId;
    }
    
    addEventMutation.mutate(eventData);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'TITOLARE':
        return <Badge variant="default" className="bg-green-600">Titolare</Badge>;
      case 'PANCHINA':
        return <Badge variant="secondary">Panchina</Badge>;
      default:
        return <Badge variant="outline">N/D</Badge>;
    }
  };

  const selectedMatchData = matches.find(m => m.id === selectedMatch);
  const matchConvocation = selectedMatchData ? convocations.find(c => c.id === selectedMatchData.convocationId) : null;
  
  // Get players from formations for event selection
  const formationPlayers = formations
    .map(f => players.find(p => p.id === f.playerId))
    .filter(Boolean) as Player[];
  
  // Filtra titolari e panchina per sostituzioni
  const titolari = formations
    .filter(f => f.status === 'TITOLARE')
    .map(f => players.find(p => p.id === f.playerId))
    .filter(Boolean) as Player[];
    
  const panchina = formations
    .filter(f => f.status === 'PANCHINA')
    .map(f => players.find(p => p.id === f.playerId))
    .filter(Boolean) as Player[];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3" data-testid="title-analisi">
                <BarChart3 className="h-10 w-10 text-primary" />
                Statistiche Partite
              </h1>
              <p className="text-muted-foreground">
                Dettagli completi: convocazione, formazione, eventi e statistiche
              </p>
            </div>
          </div>

          {/* Match Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Seleziona Partita</CardTitle>
            </CardHeader>
            <CardContent>
              <Select 
                value={selectedMatch?.toString()} 
                onValueChange={(val) => setSelectedMatch(parseInt(val))}
              >
                <SelectTrigger className="w-full" data-testid="select-match">
                  <SelectValue placeholder="Scegli una partita..." />
                </SelectTrigger>
                <SelectContent>
                  {matchesWithEvents.map(match => (
                    <SelectItem key={match.id} value={match.id.toString()}>
                      {match.date} - vs {match.opponent}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Dettagli Convocazione */}
          {selectedMatch && matchConvocation && (
            <Card>
              <CardHeader>
                <CardTitle>📋 Dettagli Partita e Convocazione</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <p className="text-xs text-muted-foreground mb-1">📅 Data Partita</p>
                    <p className="font-semibold">
                      {new Date(matchConvocation.matchDate).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <p className="text-xs text-muted-foreground mb-1">🏟️ Avversario</p>
                    <p className="font-semibold">{matchConvocation.opponent}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-muted-foreground mb-1">📍 Ritrovo Campo</p>
                    <p className="font-semibold">{matchConvocation.fieldArrivalTime}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-muted-foreground mb-1">⏱️ Inizio Partita</p>
                    <p className="font-semibold">{matchConvocation.matchStartTime}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Table */}
          {selectedMatch && sortedStats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Statistiche Giocatori - {selectedMatchData?.opponent}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Giocatore</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Min. Giocati</TableHead>
                        <TableHead className="text-center">Min. Entrata</TableHead>
                        <TableHead className="text-center">⚽ Gol</TableHead>
                        <TableHead className="text-center">👟 Assist</TableHead>
                        <TableHead className="text-center">🟨 Gialli</TableHead>
                        <TableHead className="text-center">🟥 Rossi</TableHead>
                        <TableHead className="text-center">🚑 Infortuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedStats.map((stat: any) => (
                        <TableRow key={stat.playerId} data-testid={`row-player-${stat.playerId}`}>
                          <TableCell className="font-medium">{stat.number || '-'}</TableCell>
                          <TableCell className="font-semibold">
                            {stat.lastName} {stat.firstName}
                          </TableCell>
                          <TableCell>{getStatusBadge(stat.status)}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" />
                              {stat.minutesPlayed}'
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {stat.minuteEntered !== null && stat.minuteEntered !== undefined 
                              ? `${stat.minuteEntered}'` 
                              : '-'
                            }
                          </TableCell>
                          <TableCell className="text-center">
                            {stat.goals > 0 ? (
                              <Badge variant="default" className="bg-green-600">{stat.goals}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {stat.assists > 0 ? (
                              <Badge variant="default" className="bg-blue-600">{stat.assists}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {stat.yellowCards > 0 ? (
                              <Badge variant="default" className="bg-yellow-600">{stat.yellowCards}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {stat.redCards > 0 ? (
                              <Badge variant="destructive">{stat.redCards}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {stat.injuries > 0 ? (
                              <Badge variant="default" className="bg-orange-600">{stat.injuries}</Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Summary Stats */}
                <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Gol Totali</p>
                          <p className="text-2xl font-bold">
                            {sortedStats.reduce((sum: number, s: any) => sum + s.goals, 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="text-sm text-muted-foreground">Assist Totali</p>
                          <p className="text-2xl font-bold">
                            {sortedStats.reduce((sum: number, s: any) => sum + s.assists, 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🟨</span>
                        <div>
                          <p className="text-sm text-muted-foreground">Cartellini Gialli</p>
                          <p className="text-2xl font-bold">
                            {sortedStats.reduce((sum: number, s: any) => sum + s.yellowCards, 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🟥</span>
                        <div>
                          <p className="text-sm text-muted-foreground">Cartellini Rossi</p>
                          <p className="text-2xl font-bold">
                            {sortedStats.reduce((sum: number, s: any) => sum + s.redCards, 0)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Eventi Partita - Section for editing events */}
          {selectedMatch && (
            <Card className="border-pink-500/50">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl text-pink-400">📋 Eventi Partita</CardTitle>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setShowAddEventDialog(true)}
                  className="gap-2 neon-glow-pink"
                  data-testid="button-add-event"
                >
                  <Plus className="h-4 w-4" />
                  Aggiungi Evento
                </Button>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nessun evento registrato per questa partita
                  </p>
                ) : (
                  <div className="space-y-2">
                    {events
                      .sort((a, b) => {
                        if ((a.half || 1) !== (b.half || 1)) return (a.half || 1) - (b.half || 1);
                        return a.minute - b.minute;
                      })
                      .map(event => {
                        const player = players.find(p => p.id === event.playerId);
                        const playerIn = event.playerInId ? players.find(p => p.id === event.playerInId) : null;
                        
                        return (
                          <div 
                            key={event.id} 
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <Badge variant="outline" className="font-mono">
                                {event.minute}' {event.half === 1 ? '1T' : '2T'}
                              </Badge>
                              
                              {/* Visualizzazione speciale per sostituzioni */}
                              {event.eventType === 'Sostituzione' && playerIn ? (
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-destructive">
                                    {player ? `${player.lastName} ${player.firstName}` : 'N/D'}
                                  </span>
                                  <span className="text-muted-foreground">🔄</span>
                                  <span className="font-semibold text-green-600">
                                    {playerIn ? `${playerIn.lastName} ${playerIn.firstName}` : 'N/D'}
                                  </span>
                                </div>
                              ) : (
                                <span className="font-semibold">
                                  {player ? `${player.lastName} ${player.firstName}` : 'N/D'}
                                </span>
                              )}
                              
                              <Badge variant="secondary">{event.eventType}</Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Eliminare l'evento "${event.eventType}" di ${player?.lastName} ${player?.firstName} al minuto ${event.minute}'?`)) {
                                  deleteEventMutation.mutate(event.id);
                                }
                              }}
                              disabled={deleteEventMutation.isPending}
                              className="text-destructive hover:text-destructive"
                              data-testid={`button-delete-event-${event.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedMatch && sortedStats.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Nessun dato disponibile per questa partita.
                  <br />
                  Assicurati di aver assegnato i giocatori alla formazione.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add Event Dialog */}
      <Dialog open={showAddEventDialog} onOpenChange={setShowAddEventDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="event-type">Tipo Evento</Label>
              <Select
                value={newEventType}
                onValueChange={(val) => {
                  setNewEventType(val);
                  // Reset player selections quando cambia tipo evento
                  setNewEventPlayerId(null);
                  setNewEventPlayerInId(null);
                }}
              >
                <SelectTrigger id="event-type" data-testid="select-event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gol">⚽ Gol</SelectItem>
                  <SelectItem value="Assist">👟 Assist</SelectItem>
                  <SelectItem value="Cartellino Giallo">🟨 Cartellino Giallo</SelectItem>
                  <SelectItem value="Cartellino Rosso">🟥 Cartellino Rosso</SelectItem>
                  <SelectItem value="Sostituzione">🔄 Sostituzione</SelectItem>
                  <SelectItem value="Infortunio">🚑 Infortunio</SelectItem>
                  <SelectItem value="Parata">🧤 Parata</SelectItem>
                  <SelectItem value="Tiro">🎯 Tiro</SelectItem>
                  <SelectItem value="Angolo">⛳ Angolo</SelectItem>
                  <SelectItem value="Fuorigioco">🚩 Fuorigioco</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-player">
                {newEventType === 'Sostituzione' ? 'Giocatore che esce (Titolare)' : 'Giocatore'}
              </Label>
              <Select
                value={newEventPlayerId?.toString() || ''}
                onValueChange={(val) => setNewEventPlayerId(parseInt(val))}
              >
                <SelectTrigger id="event-player" data-testid="select-event-player">
                  <SelectValue placeholder="Seleziona giocatore..." />
                </SelectTrigger>
                <SelectContent>
                  {(newEventType === 'Sostituzione' ? titolari : formationPlayers).map((player) => (
                    <SelectItem key={player.id} value={player.id.toString()}>
                      #{player.number || '-'} {player.lastName} {player.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campo condizionale: chi entra (solo per sostituzioni) */}
            {newEventType === 'Sostituzione' && (
              <div className="space-y-2 border-l-4 border-l-primary pl-4 bg-primary/5 py-2 rounded-r">
                <Label htmlFor="event-player-in" className="text-primary">
                  🔄 Giocatore che entra (Panchina)
                </Label>
                <Select
                  value={newEventPlayerInId?.toString() || ''}
                  onValueChange={(val) => setNewEventPlayerInId(parseInt(val))}
                >
                  <SelectTrigger id="event-player-in" data-testid="select-event-player-in">
                    <SelectValue placeholder="Seleziona dalla panchina..." />
                  </SelectTrigger>
                  <SelectContent>
                    {panchina.map((player) => (
                      <SelectItem key={player.id} value={player.id.toString()}>
                        #{player.number || '-'} {player.lastName} {player.firstName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {panchina.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nessun giocatore in panchina disponibile</p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-minute">Minuto</Label>
                <Input
                  id="event-minute"
                  type="number"
                  min={1}
                  max={90}
                  value={newEventMinute}
                  onChange={(e) => setNewEventMinute(parseInt(e.target.value) || 1)}
                  data-testid="input-event-minute"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="event-half">Tempo</Label>
                <Select
                  value={newEventHalf.toString()}
                  onValueChange={(val) => setNewEventHalf(parseInt(val))}
                >
                  <SelectTrigger id="event-half" data-testid="select-event-half">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1° Tempo</SelectItem>
                    <SelectItem value="2">2° Tempo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddEventDialog(false)}
              data-testid="button-cancel-add-event"
            >
              Annulla
            </Button>
            <Button
              onClick={handleAddEvent}
              disabled={addEventMutation.isPending}
              className="neon-glow-pink"
              data-testid="button-save-add-event"
            >
              Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
