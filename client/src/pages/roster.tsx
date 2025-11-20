import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import type { Player, InsertPlayer } from "@shared/schema";
import { PLAYER_ROLES } from "@shared/schema";
import PlayerEditDialog from "@/components/PlayerEditDialog";
import PlayerCard from "@/components/PlayerCard";

export default function RosterPage() {
  const { toast } = useToast();
  const [newPlayer, setNewPlayer] = useState<InsertPlayer>({ firstName: "", lastName: "", role: undefined, number: undefined });
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  const { data: players = [], isLoading } = useQuery<Player[]>({
    queryKey: ['/api/players'],
  });

  // Helper to categorize players by role
  const getRoleCategory = (role: string | null): string => {
    if (!role) return 'Attaccanti';
    const roleLower = role.toLowerCase();
    
    if (roleLower.includes('portiere')) return 'Portieri';
    if (roleLower.includes('difensore') || roleLower.includes('terzino')) return 'Difensori';
    if (roleLower.includes('centrocampista') || roleLower.includes('mediano') || 
        roleLower.includes('trequartista') || roleLower.includes('ala')) return 'Centrocampisti';
    return 'Attaccanti';
  };

  // Fetch all match events to calculate minutes
  const { data: allEvents = [] } = useQuery<any[]>({
    queryKey: ['/api/matches/all-events'],
  });

  // Fetch all formations to calculate convocations
  const { data: allFormations = [] } = useQuery<any[]>({
    queryKey: ['/api/formations'],
  });

  // Fetch all matches to calculate wins/draws/losses
  const { data: allMatches = [] } = useQuery<any[]>({
    queryKey: ['/api/matches'],
  });

  // Calculate player stats
  const playerStats = useMemo(() => {
    const stats: Record<number, { 
      minutiGiocati: number; 
      partiteConvocato: number; 
      partiteTitolare: number;
      partiteEntrato: number;
      goal: number;
      assist: number;
      erroriGoal: number;
      cartelliniGialli: number;
      cartelliniRossi: number;
      rigori: number;
      infortuni: number;
      punteggiMedio: number | null;
      matchesWon: number;
      matchesDrawn: number;
      matchesLost: number;
      goalsConceded: number;
    }> = {};

    // CRITICAL: Only use matches with saved events (offline registered matches)
    const matchIdsWithEvents = new Set(allEvents.map(e => e.matchId));
    const registeredMatches = allMatches.filter(m => matchIdsWithEvents.has(m.id));

    players.forEach(player => {
      // Filter events for this player
      const playerEvents = allEvents.filter(e => e.playerId === player.id);
      
      // Calculate minutes played from formation assignments (not events!)
      const playerFormations = allFormations.filter(f => f.playerId === player.id);
      const minutiGiocati = playerFormations.reduce((total, formation) => {
        return total + (formation.minutesPlayed || 0);
      }, 0);

      // Count matches where player was in formation (convocato)
      const matchesConvocato = new Set(
        allFormations.filter(f => f.playerId === player.id).map(f => f.matchId)
      ).size;

      // Count matches where player was TITOLARE
      const matchesTitolare = new Set(
        allFormations.filter(f => f.playerId === player.id && f.status === 'TITOLARE').map(f => f.matchId)
      ).size;

      // Count matches where player ENTERED from bench (was PANCHINA and actually played)
      const matchesEntrato = new Set(
        allFormations.filter(f => 
          f.playerId === player.id && 
          f.status === 'PANCHINA' && 
          (f.minutesPlayed > 0 || f.minuteEntered != null)
        ).map(f => f.matchId)
      ).size;

      // Count all event types
      const goal = playerEvents.filter(e => e.eventType === 'Gol').length;
      const assist = playerEvents.filter(e => e.eventType === 'Assist').length;
      const erroriGoal = playerEvents.filter(e => e.eventType === 'Errore Goal').length;
      const cartelliniGialli = playerEvents.filter(e => e.eventType === 'Cartellino Giallo').length + (player.yellowCards || 0);
      const cartelliniRossi = playerEvents.filter(e => e.eventType === 'Cartellino Rosso').length + (player.redCards || 0);
      const rigori = playerEvents.filter(e => e.eventType === 'Rigore').length;
      const infortuni = playerEvents.filter(e => e.eventType === 'Infortunio').length;

      // Calculate average rating from Punteggio events
      const ratingEvents = playerEvents.filter(e => e.eventType === 'Punteggio' && e.rating);
      const punteggiMedio = ratingEvents.length > 0
        ? ratingEvents.reduce((sum, e) => sum + (e.rating || 0), 0) / ratingEvents.length
        : null;

      // NEW: Calculate wins/draws/losses for matches where player participated
      let matchesWon = 0;
      let matchesDrawn = 0;
      let matchesLost = 0;

      const playerMatchIds = playerFormations.map(f => f.matchId);
      const playerMatches = registeredMatches.filter(m => playerMatchIds.includes(m.id));

      playerMatches.forEach(match => {
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

      // NEW: Calculate goals conceded (only for goalkeepers)
      let goalsConceded = 0;
      const isGoalkeeper = player.role?.toLowerCase().includes('portiere');

      if (isGoalkeeper) {
        // For each match where goalkeeper played, count opponent goals
        playerFormations.forEach(formation => {
          const match = registeredMatches.find(m => m.id === formation.matchId);
          if (match && match.awayScore !== null && formation.minutesPlayed && formation.minutesPlayed > 0) {
            // Attribute all opponent goals to this goalkeeper
            goalsConceded += match.awayScore;
          }
        });
      }

      stats[player.id] = {
        minutiGiocati,
        partiteConvocato: matchesConvocato,
        partiteTitolare: matchesTitolare,
        partiteEntrato: matchesEntrato,
        goal,
        assist,
        erroriGoal,
        cartelliniGialli,
        cartelliniRossi,
        rigori,
        infortuni,
        punteggiMedio,
        matchesWon,
        matchesDrawn,
        matchesLost,
        goalsConceded,
      };
    });

    return stats;
  }, [players, allEvents, allFormations, allMatches]);

  // Group players by role and sort alphabetically
  const { groupedPlayers, sortedPlayers } = useMemo(() => {
    const grouped = {
      'Portieri': [] as Player[],
      'Difensori': [] as Player[],
      'Centrocampisti': [] as Player[],
      'Attaccanti': [] as Player[]
    };

    players.forEach(player => {
      const category = getRoleCategory(player.role);
      grouped[category as keyof typeof grouped].push(player);
    });

    // Sort each group alphabetically by lastName + firstName
    Object.keys(grouped).forEach(category => {
      grouped[category as keyof typeof grouped].sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`;
        const nameB = `${b.lastName} ${b.firstName}`;
        return nameA.localeCompare(nameB, 'it');
      });
    });

    const sorted = [
      ...grouped['Portieri'],
      ...grouped['Difensori'],
      ...grouped['Centrocampisti'],
      ...grouped['Attaccanti']
    ];

    return { groupedPlayers: grouped, sortedPlayers: sorted };
  }, [players]);

  const createMutation = useMutation({
    mutationFn: (player: InsertPlayer) => apiRequest('POST', '/api/players', player),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      setNewPlayer({ firstName: "", lastName: "", role: undefined, number: undefined });
      toast({ title: "Giocatore aggiunto con successo" });
    },
    onError: () => {
      toast({ title: "Errore durante l'aggiunta del giocatore", variant: "destructive" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (playerId: number) => apiRequest('DELETE', `/api/players/${playerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({ title: "Giocatore eliminato con successo" });
    },
    onError: () => {
      toast({ title: "Errore durante l'eliminazione", variant: "destructive" });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayer.firstName || !newPlayer.lastName) {
      toast({ title: "Nome e cognome sono obbligatori", variant: "destructive" });
      return;
    }
    createMutation.mutate(newPlayer);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-primary">Gestione Rosa</h1>
            <p className="text-lg text-muted-foreground">
              Aggiungi, modifica ed elimina giocatori dalla rosa
            </p>
          </div>

          <Card className="border-border/50 transition-neon hover:border-primary/30">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl text-primary">Aggiungi Nuovo Giocatore</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <Input
                    placeholder="Nome"
                    value={newPlayer.firstName}
                    onChange={(e) => setNewPlayer({ ...newPlayer, firstName: e.target.value })}
                    className="flex-1 transition-neon"
                    required
                    data-testid="input-player-firstName"
                  />
                  <Input
                    placeholder="Cognome"
                    value={newPlayer.lastName}
                    onChange={(e) => setNewPlayer({ ...newPlayer, lastName: e.target.value })}
                    className="flex-1 transition-neon"
                    required
                    data-testid="input-player-lastName"
                  />
                  <Select
                    value={newPlayer.role || undefined}
                    onValueChange={(value) => setNewPlayer({ ...newPlayer, role: value })}
                  >
                    <SelectTrigger className="w-full md:w-64 transition-neon" data-testid="select-player-role">
                      <SelectValue placeholder="Ruolo (opzionale)" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLAYER_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="N° Maglia"
                    min="1"
                    max="99"
                    value={newPlayer.number || ""}
                    onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full md:w-32 transition-neon"
                    data-testid="input-player-number"
                  />
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending}
                    className="neon-glow-cyan transition-neon"
                    data-testid="button-add-player"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Aggiungi
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-primary mb-2">
                Rosa Attuale ({players.length} Giocatori)
              </h2>
            </div>

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Caricamento...
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nessun giocatore nella rosa. Aggiungi il primo giocatore!
              </div>
            ) : (
              <div className="space-y-8">
                {/* Portieri Section */}
                {groupedPlayers['Portieri'].length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-primary border-b-2 border-primary/30 pb-2">
                      🧤 PORTIERI ({groupedPlayers['Portieri'].length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedPlayers['Portieri'].map((player, index) => (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          index={index}
                          onEdit={setEditingPlayer}
                          onDelete={(playerId) => deleteMutation.mutate(playerId)}
                          isDeleting={deleteMutation.isPending}
                          stats={playerStats[player.id]}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Difensori Section */}
                {groupedPlayers['Difensori'].length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-primary border-b-2 border-primary/30 pb-2">
                      🛡️ DIFENSORI ({groupedPlayers['Difensori'].length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedPlayers['Difensori'].map((player, index) => (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          index={index}
                          onEdit={setEditingPlayer}
                          onDelete={(playerId) => deleteMutation.mutate(playerId)}
                          isDeleting={deleteMutation.isPending}
                          stats={playerStats[player.id]}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Centrocampisti Section */}
                {groupedPlayers['Centrocampisti'].length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-primary border-b-2 border-primary/30 pb-2">
                      ⚽ CENTROCAMPISTI ({groupedPlayers['Centrocampisti'].length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedPlayers['Centrocampisti'].map((player, index) => (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          index={index}
                          onEdit={setEditingPlayer}
                          onDelete={(playerId) => deleteMutation.mutate(playerId)}
                          isDeleting={deleteMutation.isPending}
                          stats={playerStats[player.id]}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Attaccanti Section */}
                {groupedPlayers['Attaccanti'].length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-primary border-b-2 border-primary/30 pb-2">
                      ⚡ ATTACCANTI ({groupedPlayers['Attaccanti'].length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupedPlayers['Attaccanti'].map((player, index) => (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          index={index}
                          onEdit={setEditingPlayer}
                          onDelete={(playerId) => deleteMutation.mutate(playerId)}
                          isDeleting={deleteMutation.isPending}
                          stats={playerStats[player.id]}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {editingPlayer && (
        <PlayerEditDialog
          player={editingPlayer}
          open={!!editingPlayer}
          onOpenChange={(open) => !open && setEditingPlayer(null)}
        />
      )}
    </div>
  );
}
