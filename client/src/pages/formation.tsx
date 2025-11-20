import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, Users, LayoutGrid, X, Info, MousePointer, Hand, Save } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import type { Player, MatchSession } from "@shared/schema";
import { FORMATION_STATUSES } from "@shared/schema";

type FormationType = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2' | '3-4-3' | '4-5-1' | '4-1-4-1' | '3-4-1-2' | '4-3-1-2';

const FORMATIONS: Record<FormationType, { name: string; positions: Array<{ x: number; y: number; role: string }> }> = {
  '4-4-2': {
    name: '4-4-2 Classica',
    positions: [
      { x: 50, y: 5, role: 'GK' },
      { x: 15, y: 22, role: 'LB' }, { x: 38, y: 22, role: 'CB' }, { x: 62, y: 22, role: 'CB' }, { x: 85, y: 22, role: 'RB' },
      { x: 15, y: 50, role: 'LM' }, { x: 38, y: 50, role: 'CM' }, { x: 62, y: 50, role: 'CM' }, { x: 85, y: 50, role: 'RM' },
      { x: 38, y: 80, role: 'ST' }, { x: 62, y: 80, role: 'ST' },
    ],
  },
  '4-3-3': {
    name: '4-3-3 Offensiva',
    positions: [
      { x: 50, y: 5, role: 'GK' },
      { x: 15, y: 22, role: 'LB' }, { x: 38, y: 22, role: 'CB' }, { x: 62, y: 22, role: 'CB' }, { x: 85, y: 22, role: 'RB' },
      { x: 30, y: 45, role: 'CM' }, { x: 50, y: 45, role: 'CM' }, { x: 70, y: 45, role: 'CM' },
      { x: 15, y: 80, role: 'LW' }, { x: 50, y: 80, role: 'ST' }, { x: 85, y: 80, role: 'RW' },
    ],
  },
  '3-5-2': {
    name: '3-5-2 Centrocampo',
    positions: [
      { x: 50, y: 5, role: 'GK' },
      { x: 25, y: 22, role: 'CB' }, { x: 50, y: 22, role: 'CB' }, { x: 75, y: 22, role: 'CB' },
      { x: 10, y: 50, role: 'LWB' }, { x: 30, y: 50, role: 'CM' }, { x: 50, y: 50, role: 'CM' }, { x: 70, y: 50, role: 'CM' }, { x: 90, y: 50, role: 'RWB' },
      { x: 38, y: 80, role: 'ST' }, { x: 62, y: 80, role: 'ST' },
    ],
  },
  '4-2-3-1': {
    name: '4-2-3-1 Moderna',
    positions: [
      { x: 50, y: 5, role: 'GK' },
      { x: 15, y: 22, role: 'LB' }, { x: 38, y: 22, role: 'CB' }, { x: 62, y: 22, role: 'CB' }, { x: 85, y: 22, role: 'RB' },
      { x: 38, y: 40, role: 'CDM' }, { x: 62, y: 40, role: 'CDM' },
      { x: 15, y: 65, role: 'LM' }, { x: 50, y: 65, role: 'CAM' }, { x: 85, y: 65, role: 'RM' },
      { x: 50, y: 85, role: 'ST' },
    ],
  },
  '5-3-2': {
    name: '5-3-2 Difensiva',
    positions: [
      { x: 50, y: 5, role: 'GK' },
      { x: 10, y: 22, role: 'LWB' }, { x: 30, y: 22, role: 'CB' }, { x: 50, y: 22, role: 'CB' }, { x: 70, y: 22, role: 'CB' }, { x: 90, y: 22, role: 'RWB' },
      { x: 30, y: 50, role: 'CM' }, { x: 50, y: 50, role: 'CM' }, { x: 70, y: 50, role: 'CM' },
      { x: 38, y: 80, role: 'ST' }, { x: 62, y: 80, role: 'ST' },
    ],
  },
  '3-4-3': {
    name: '3-4-3 Aggressiva',
    positions: [
      { x: 50, y: 5, role: 'GK' },
      { x: 25, y: 22, role: 'CB' }, { x: 50, y: 22, role: 'CB' }, { x: 75, y: 22, role: 'CB' },
      { x: 15, y: 50, role: 'LM' }, { x: 38, y: 50, role: 'CM' }, { x: 62, y: 50, role: 'CM' }, { x: 85, y: 50, role: 'RM' },
      { x: 20, y: 80, role: 'LW' }, { x: 50, y: 80, role: 'ST' }, { x: 80, y: 80, role: 'RW' },
    ],
  },
  '4-5-1': {
    name: '4-5-1 Difesa',
    positions: [
      { x: 50, y: 5, role: 'GK' },
      { x: 15, y: 22, role: 'LB' }, { x: 38, y: 22, role: 'CB' }, { x: 62, y: 22, role: 'CB' }, { x: 85, y: 22, role: 'RB' },
      { x: 15, y: 50, role: 'LM' }, { x: 33, y: 50, role: 'CM' }, { x: 50, y: 50, role: 'CM' }, { x: 67, y: 50, role: 'CM' }, { x: 85, y: 50, role: 'RM' },
      { x: 50, y: 80, role: 'ST' },
    ],
  },
  '4-1-4-1': {
    name: '4-1-4-1 Regista',
    positions: [
      { x: 50, y: 5, role: 'GK' },
      { x: 15, y: 22, role: 'LB' }, { x: 38, y: 22, role: 'CB' }, { x: 62, y: 22, role: 'CB' }, { x: 85, y: 22, role: 'RB' },
      { x: 50, y: 38, role: 'CDM' },
      { x: 15, y: 58, role: 'LM' }, { x: 38, y: 58, role: 'CM' }, { x: 62, y: 58, role: 'CM' }, { x: 85, y: 58, role: 'RM' },
      { x: 50, y: 80, role: 'ST' },
    ],
  },
  '3-4-1-2': {
    name: '3-4-1-2 Trequartista',
    positions: [
      { x: 50, y: 5, role: 'GK' },
      { x: 25, y: 22, role: 'CB' }, { x: 50, y: 22, role: 'CB' }, { x: 75, y: 22, role: 'CB' },
      { x: 15, y: 45, role: 'LM' }, { x: 38, y: 45, role: 'CM' }, { x: 62, y: 45, role: 'CM' }, { x: 85, y: 45, role: 'RM' },
      { x: 50, y: 65, role: 'CAM' },
      { x: 38, y: 82, role: 'ST' }, { x: 62, y: 82, role: 'ST' },
    ],
  },
  '4-3-1-2': {
    name: '4-3-1-2 Diamante',
    positions: [
      { x: 50, y: 5, role: 'GK' },
      { x: 15, y: 22, role: 'LB' }, { x: 38, y: 22, role: 'CB' }, { x: 62, y: 22, role: 'CB' }, { x: 85, y: 22, role: 'RB' },
      { x: 30, y: 45, role: 'CM' }, { x: 50, y: 45, role: 'CM' }, { x: 70, y: 45, role: 'CM' },
      { x: 50, y: 65, role: 'CAM' },
      { x: 38, y: 82, role: 'ST' }, { x: 62, y: 82, role: 'ST' },
    ],
  },
};

export default function FormationPage() {
  const { toast } = useToast();
  const [formationStatus, setFormationStatus] = useState<Record<number, string>>({});
  const [selectedMatch, setSelectedMatch] = useState<number | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<FormationType>('4-4-2');
  const [playerPositions, setPlayerPositions] = useState<Record<number, { x: number; y: number; positionIndex: number }>>({});
  const [viewMode, setViewMode] = useState<'visual' | 'list'>('visual');

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['/api/players'],
  });

  const { data: matches = [] } = useQuery<MatchSession[]>({
    queryKey: ['/api/matches'],
  });

  const { data: currentFormations = [] } = useQuery<any[]>({
    queryKey: [`/api/formations/${selectedMatch}`],
    enabled: !!selectedMatch,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { matchId: number; formations: Array<{ playerId: number; status: string }> }) => 
      apiRequest('POST', '/api/formations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/formations/${selectedMatch}`] });
      toast({ title: "✅ Formazione salvata con successo" });
    },
    onError: () => {
      toast({ title: "Errore nel salvare la formazione", variant: "destructive" });
    }
  });

  useEffect(() => {
    const initialStatus: Record<number, string> = {};
    currentFormations.forEach((form: any) => {
      initialStatus[form.playerId] = form.status;
    });
    players.forEach(player => {
      if (!initialStatus[player.id]) {
        initialStatus[player.id] = 'N/D';
      }
    });
    setFormationStatus(initialStatus);
  }, [currentFormations, players]);

  const handleSaveFormation = () => {
    if (!selectedMatch) {
      toast({ title: "Seleziona una partita", variant: "destructive" });
      return;
    }

    const formations = players.map(player => ({
      playerId: player.id,
      status: formationStatus[player.id] || 'N/D'
    }));

    saveMutation.mutate({
      matchId: selectedMatch,
      formations
    });
  };

  const titolari = players.filter(p => formationStatus[p.id] === 'TITOLARE');
  const panchina = players.filter(p => formationStatus[p.id] === 'PANCHINA');
  const nonDisponibili = players.filter(p => !formationStatus[p.id] || formationStatus[p.id] === 'N/D');

  const titolariCount = titolari.length;
  const panchinaCount = panchina.length;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'TITOLARE': return 'bg-primary text-primary-foreground';
      case 'PANCHINA': return 'bg-secondary text-secondary-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handlePlayerClick = (playerId: number) => {
    const currentStatus = formationStatus[playerId];
    let newStatus = 'N/D';
    
    if (currentStatus === 'N/D') {
      if (titolariCount < 11) newStatus = 'TITOLARE';
      else if (panchinaCount < 12) newStatus = 'PANCHINA';
    } else if (currentStatus === 'TITOLARE') {
      newStatus = 'PANCHINA';
    } else if (currentStatus === 'PANCHINA') {
      newStatus = 'N/D';
    }
    
    setFormationStatus({ ...formationStatus, [playerId]: newStatus });
  };

  const handlePositionClick = (positionIndex: number) => {
    const assignedPlayer = Object.entries(playerPositions).find(([_, pos]) => pos.positionIndex === positionIndex);
    
    if (assignedPlayer) {
      const newPositions = { ...playerPositions };
      delete newPositions[parseInt(assignedPlayer[0])];
      setPlayerPositions(newPositions);
    }
  };

  const handleAssignPlayer = (playerId: number, positionIndex: number) => {
    const occupiedPosition = Object.entries(playerPositions).find(([_, pos]) => pos.positionIndex === positionIndex);
    
    if (occupiedPosition) {
      const newPositions = { ...playerPositions };
      delete newPositions[parseInt(occupiedPosition[0])];
      setPlayerPositions(newPositions);
    }
    
    const formationPos = FORMATIONS[selectedFormation].positions[positionIndex];
    setPlayerPositions({
      ...playerPositions,
      [playerId]: { x: formationPos.x, y: formationPos.y, positionIndex }
    });
    
    if (formationStatus[playerId] !== 'TITOLARE') {
      setFormationStatus({ ...formationStatus, [playerId]: 'TITOLARE' });
    }
  };

  const [draggedPlayer, setDraggedPlayer] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, playerId: number) => {
    setDraggedPlayer(playerId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, positionIndex: number) => {
    e.preventDefault();
    if (draggedPlayer !== null) {
      handleAssignPlayer(draggedPlayer, positionIndex);
      setDraggedPlayer(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-[1800px]">
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-primary">⚽ Formazione Tattica</h1>
            <p className="text-lg text-muted-foreground">
              Scegli la formazione e posiziona i giocatori sul campo
            </p>
          </div>

          <Card className="border-cyan-500/50 bg-gradient-to-r from-cyan-500/10 via-primary/10 to-pink-500/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-primary flex items-center gap-2">
                <Info className="h-5 w-5" />
                📖 Come Utilizzare la Formazione
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-primary">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Seleziona Partita</h4>
                      <p className="text-xs text-muted-foreground">Scegli la partita dal menu a tendina</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-primary">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Scegli Modulo</h4>
                      <p className="text-xs text-muted-foreground">Clicca su una formazione tattica (4-4-2, 4-3-3, ecc.)</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Hand className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Posiziona Giocatori</h4>
                      <p className="text-xs text-muted-foreground">Trascina i giocatori dalla rosa sul campo nelle posizioni desiderate</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Save className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Salva</h4>
                      <p className="text-xs text-muted-foreground">Clicca "Salva Formazione" per confermare</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border/50">
                <div className="flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <MousePointer className="h-4 w-4 text-cyan-400" />
                    <span className="text-muted-foreground"><strong className="text-foreground">Click su giocatore:</strong> Cambia status (N/D → Titolare → Panchina → N/D)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hand className="h-4 w-4 text-cyan-400" />
                    <span className="text-muted-foreground"><strong className="text-foreground">Drag & Drop:</strong> Trascina dalla rosa sul campo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-400" />
                    <span className="text-muted-foreground"><strong className="text-foreground">Bottone X:</strong> Rimuovi giocatore dalla posizione</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-cyan-400" />
                    <span className="text-muted-foreground"><strong className="text-foreground">Vista Lista:</strong> Per gestione rapida senza campo visuale</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4 items-center flex-wrap">
            <Card className="border-border/50 flex-1 min-w-[300px]">
              <CardContent className="p-4">
                <Select
                  value={selectedMatch?.toString() || ""}
                  onValueChange={(value) => setSelectedMatch(parseInt(value))}
                >
                  <SelectTrigger className="transition-neon" data-testid="select-match">
                    <SelectValue placeholder="📅 Seleziona partita" />
                  </SelectTrigger>
                  <SelectContent>
                    {matches.map((match) => (
                      <SelectItem key={match.id} value={match.id.toString()}>
                        {match.opponent || 'Partita'} - {match.date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button
                variant={viewMode === 'visual' ? 'default' : 'outline'}
                onClick={() => setViewMode('visual')}
                className="neon-glow-cyan"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Campo Visuale
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
              >
                <Users className="h-4 w-4 mr-2" />
                Vista Lista
              </Button>
            </div>

            <div className="flex gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Titolari:</span>
                <span className={`font-bold text-lg ${titolariCount > 11 ? 'text-destructive' : 'text-primary'}`}>
                  {titolariCount}/11
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Panchina:</span>
                <span className={`font-bold text-lg ${panchinaCount > 12 ? 'text-destructive' : 'text-secondary'}`}>
                  {panchinaCount}/12
                </span>
              </div>
            </div>
          </div>

          {!selectedMatch ? (
            <Card className="border-border/50">
              <CardContent className="p-12 text-center text-muted-foreground">
                📅 Seleziona una partita per configurare la formazione
              </CardContent>
            </Card>
          ) : viewMode === 'list' ? (
            <Card className="border-border/50 transition-neon hover:border-primary/30">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-primary flex items-center gap-2">
                  <Shield className="h-6 w-6" />
                  Assegna Ruoli (Vista Lista)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {players.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Aggiungi giocatori alla rosa
                  </div>
                ) : (
                  <div className="space-y-3">
                    {players.map(player => (
                      <div 
                        key={player.id}
                        className="flex items-center gap-4 p-4 rounded-lg border border-border/50 hover-elevate transition-neon"
                        data-testid={`formation-row-${player.id}`}
                      >
                        <div className="w-14 h-14 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                          <span className="font-bold text-xl text-primary">
                            {player.number || "--"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-lg truncate">{player.lastName} {player.firstName}</p>
                          {player.role && (
                            <p className="text-sm text-muted-foreground">{player.role}</p>
                          )}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {FORMATION_STATUSES.map(status => (
                            <Badge
                              key={status}
                              className={`cursor-pointer transition-neon ${
                                formationStatus[player.id] === status
                                  ? getStatusBadgeColor(status) + ' neon-glow-cyan'
                                  : 'bg-muted text-muted-foreground hover-elevate'
                              }`}
                              onClick={() => setFormationStatus({ ...formationStatus, [player.id]: status })}
                              data-testid={`formation-status-${player.id}-${status.toLowerCase()}`}
                            >
                              {status}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {players.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-border/50">
                    <Button
                      onClick={handleSaveFormation}
                      disabled={saveMutation.isPending}
                      className="w-full neon-glow-cyan transition-neon"
                      data-testid="button-save-formation"
                    >
                      💾 Salva Formazione
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex gap-6 flex-col lg:flex-row">
              <div className="flex-1 space-y-6">
                <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-primary">🎯 Seleziona Modulo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      {Object.entries(FORMATIONS).map(([key, formation]) => (
                        <Button
                          key={key}
                          variant={selectedFormation === key ? 'default' : 'outline'}
                          onClick={() => setSelectedFormation(key as FormationType)}
                          className={`h-auto py-3 flex flex-col items-center gap-1 transition-neon ${
                            selectedFormation === key ? 'neon-glow-cyan' : ''
                          }`}
                        >
                          <span className="font-bold text-lg">{key}</span>
                          <span className="text-xs opacity-70">{formation.name}</span>
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/50 overflow-hidden">
                  <CardContent className="p-0">
                    <div 
                      className="relative bg-gradient-to-b from-green-600 via-green-500 to-green-600"
                      style={{
                        backgroundImage: `
                          linear-gradient(90deg, transparent 49%, rgba(255,255,255,0.2) 49%, rgba(255,255,255,0.2) 51%, transparent 51%),
                          repeating-linear-gradient(0deg, #16a34a 0px, #16a34a 40px, #15803d 40px, #15803d 80px)
                        `,
                        aspectRatio: '3/4',
                        perspective: '1000px',
                      }}
                    >
                      <div 
                        className="absolute inset-0"
                        style={{
                          transform: 'rotateX(45deg)',
                          transformOrigin: 'center bottom',
                        }}
                      >
                        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <rect x="0" y="0" width="100" height="100" fill="none" stroke="white" strokeWidth="0.3" opacity="0.8" />
                          <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.3" opacity="0.8" />
                          <circle cx="50" cy="50" r="9" fill="none" stroke="white" strokeWidth="0.3" opacity="0.8" />
                          <circle cx="50" cy="50" r="0.5" fill="white" opacity="0.8" />
                          <rect x="0" y="0" width="20" height="12" fill="none" stroke="white" strokeWidth="0.3" opacity="0.8" />
                          <rect x="80" y="0" width="20" height="12" fill="none" stroke="white" strokeWidth="0.3" opacity="0.8" />
                          <rect x="0" y="88" width="20" height="12" fill="none" stroke="white" strokeWidth="0.3" opacity="0.8" />
                          <rect x="80" y="88" width="20" height="12" fill="none" stroke="white" strokeWidth="0.3" opacity="0.8" />
                          <rect x="35" y="0" width="30" height="5" fill="none" stroke="white" strokeWidth="0.3" opacity="0.8" />
                          <rect x="35" y="95" width="30" height="5" fill="none" stroke="white" strokeWidth="0.3" opacity="0.8" />
                        </svg>

                        {FORMATIONS[selectedFormation].positions.map((pos, index) => {
                          const assignedPlayerId = Object.entries(playerPositions).find(([_, p]) => p.positionIndex === index)?.[0];
                          const player = assignedPlayerId ? players.find(p => p.id === parseInt(assignedPlayerId)) : null;

                          return (
                            <div
                              key={index}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, index)}
                              onClick={() => handlePositionClick(index)}
                              className="absolute cursor-pointer group"
                              style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                                transform: 'translate(-50%, -50%)',
                              }}
                            >
                              <div className={`
                                w-12 h-12 rounded-full flex items-center justify-center font-bold text-xs
                                transition-all duration-200 border-2
                                ${player 
                                  ? 'bg-cyan-400 border-cyan-200 text-black shadow-lg shadow-cyan-500/50 scale-110' 
                                  : 'bg-white/30 border-white/60 text-white backdrop-blur-sm hover:bg-white/50 hover:scale-110'
                                }
                              `}>
                                {player ? (
                                  <div className="text-center leading-tight">
                                    <div className="text-[10px] font-black">{player.number}</div>
                                    <div className="text-[8px]">{player.lastName.substring(0, 3).toUpperCase()}</div>
                                  </div>
                                ) : (
                                  <span className="text-[10px]">{pos.role}</span>
                                )}
                              </div>
                              {player && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePositionClick(index);
                                  }}
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="h-3 w-3 text-white" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={handleSaveFormation}
                  disabled={saveMutation.isPending}
                  className="w-full neon-glow-cyan transition-neon py-6 text-lg"
                  data-testid="button-save-formation"
                >
                  💾 Salva Formazione
                </Button>
              </div>

              <div className="w-full lg:w-96 space-y-4">
                <Card className="border-primary/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-primary flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Titolari ({titolari.length}/11)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                    {titolari.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nessun titolare selezionato
                      </p>
                    ) : (
                      titolari.map(player => (
                        <div
                          key={player.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, player.id)}
                          onClick={() => handlePlayerClick(player.id)}
                          className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/20 hover-elevate cursor-move transition-neon"
                        >
                          <div className="w-8 h-8 flex items-center justify-center rounded bg-primary/20 text-primary font-bold text-sm">
                            {player.number || '--'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{player.lastName} {player.firstName}</p>
                            {player.role && <p className="text-xs text-muted-foreground">{player.role}</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Panchina ({panchina.length}/12)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                    {panchina.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nessuna riserva
                      </p>
                    ) : (
                      panchina.map(player => (
                        <div
                          key={player.id}
                          onClick={() => handlePlayerClick(player.id)}
                          className="flex items-center gap-3 p-2 rounded-lg bg-secondary/10 border border-secondary/20 hover-elevate cursor-pointer transition-neon"
                        >
                          <div className="w-8 h-8 flex items-center justify-center rounded bg-secondary/20 text-secondary-foreground font-bold text-sm">
                            {player.number || '--'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{player.lastName} {player.firstName}</p>
                            {player.role && <p className="text-xs text-muted-foreground">{player.role}</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Rosa ({nonDisponibili.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 max-h-64 overflow-y-auto">
                    {nonDisponibili.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Tutti assegnati
                      </p>
                    ) : (
                      nonDisponibili.map(player => (
                        <div
                          key={player.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, player.id)}
                          onClick={() => handlePlayerClick(player.id)}
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border/50 hover-elevate cursor-move transition-neon"
                        >
                          <div className="w-8 h-8 flex items-center justify-center rounded bg-muted text-muted-foreground font-bold text-sm">
                            {player.number || '--'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">{player.lastName} {player.firstName}</p>
                            {player.role && <p className="text-xs text-muted-foreground">{player.role}</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="border-cyan-500/30 bg-cyan-500/5">
                  <CardContent className="p-4">
                    <div className="text-sm space-y-2">
                      <p className="font-semibold text-cyan-400">💡 Come usare:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• <strong>Drag & Drop</strong>: Trascina giocatori sul campo</li>
                        <li>• <strong>Click</strong>: Clicca su giocatore per cambiare status</li>
                        <li>• <strong>X</strong>: Rimuovi giocatore dalla posizione</li>
                        <li>• <strong>Modulo</strong>: Scegli formazione tattica sopra</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
