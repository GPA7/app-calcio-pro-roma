import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCheck, UserX, Users, AlertCircle, Save, FileDown, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/Navigation";
import { useState, useMemo, useRef, useEffect } from "react";
import { useReactToPrint } from 'react-to-print';
import ReportConvocazione from '@/components/ReportConvocazione';
import type { TemporaryPlayer } from "@shared/schema";

type Player = {
  id: number;
  firstName: string;
  lastName: string;
  number: number | null;
  role: string | null;
  position: string | null;
  convocationStatus: 'Convocabile' | 'Convocabile solo 1 allenamento' | 'Infortunato' | 'Espulso' | 'Riabilitato' | 'Riabilitato Infortunato' | 'NC scelta tecnica' | 'NC per assenze' | 'NC per motivi societari' | null;
  isConvocato: number;
  yellowCards: number | null;
  redCards: number | null;
  suspensionDays: number | null;
};

type RecentAttendance = {
  playerId: number;
  presentiCount: number;
  infortunatoCount: number;
};

export default function Convocazione() {
  const { toast } = useToast();
  const [matchDate, setMatchDate] = useState('');
  const [fieldArrivalTime, setFieldArrivalTime] = useState('');
  const [matchStartTime, setMatchStartTime] = useState('');
  const [matchAddress, setMatchAddress] = useState('');
  const [opponent, setOpponent] = useState('');
  const [isHome, setIsHome] = useState<number>(1); // 1 = casa, 0 = trasferta
  const reportRef = useRef<HTMLDivElement>(null);
  const officialReportRef = useRef<HTMLDivElement>(null);
  const baseReportRef = useRef<HTMLDivElement>(null);
  const listaUfficialeRef = useRef<HTMLDivElement>(null);
  
  // Giocatori temporanei (da altre categorie)
  const [temporaryPlayers, setTemporaryPlayers] = useState<TemporaryPlayer[]>([]);
  const [newTempPlayerName, setNewTempPlayerName] = useState('');
  const [newTempPlayerRole, setNewTempPlayerRole] = useState('');
  const [newTempPlayerStatus, setNewTempPlayerStatus] = useState<'TITOLARE' | 'PANCHINA'>('PANCHINA');

  const handlePrint = useReactToPrint({
    contentRef: reportRef,
    documentTitle: `Convocazione_${opponent || 'Partita'}_${matchDate || 'data'}`,
  });

  const handlePrintOfficial = useReactToPrint({
    contentRef: officialReportRef,
    documentTitle: `Convocazione_Ufficiale_${opponent || 'Partita'}_${matchDate || 'data'}`,
  });

  const handlePrintBase = useReactToPrint({
    contentRef: baseReportRef,
    documentTitle: `Convocazione_Base_${opponent || 'Partita'}_${matchDate || 'data'}`,
  });

  const handlePrintListaUfficiale = useReactToPrint({
    contentRef: listaUfficialeRef,
    documentTitle: `Lista_Ufficiale_${opponent || 'Partita'}_${matchDate || 'data'}`,
  });

  // Load convocation data from localStorage if editing
  useEffect(() => {
    const editingData = localStorage.getItem('editingConvocation');
    if (editingData) {
      try {
        const convocation = JSON.parse(editingData);
        setMatchDate(convocation.matchDate || '');
        setFieldArrivalTime(convocation.fieldArrivalTime || '');
        setMatchStartTime(convocation.matchStartTime || '');
        setMatchAddress(convocation.matchAddress || '');
        setOpponent(convocation.opponent || '');
        setIsHome(convocation.isHome ?? 1);
        // Clear from localStorage after loading
        localStorage.removeItem('editingConvocation');
        toast({
          title: "Convocazione caricata",
          description: "Modifica i dati e salva per aggiornare la convocazione.",
        });
      } catch (error) {
        console.error('Error loading convocation from localStorage:', error);
      }
    }
  }, [toast]);

  const { data: players = [], isLoading } = useQuery<Player[]>({
    queryKey: ['/api/players'],
  });

  const { data: recentAttendances = [] } = useQuery<RecentAttendance[]>({
    queryKey: ['/api/attendances/recent/7'],
  });

  // Fetch all teams for opponent selection
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });

  // Sort teams alphabetically
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  }, [teams]);

  // Find opponent logo
  const opponentLogoUrl = useMemo(() => {
    const opponentTeam = teams.find((t: any) => t.name === opponent);
    return opponentTeam?.logoUrl || null;
  }, [teams, opponent]);

  // Fetch all match events to count yellow cards from events
  const { data: allEvents = [] } = useQuery<any[]>({
    queryKey: ['/api/matches/all-events'],
  });

  // Calculate total yellow cards (database + events) for each player
  const playerYellowCards = useMemo(() => {
    const counts: Record<number, number> = {};
    players.forEach(player => {
      // Start with yellowCards from database
      let total = player.yellowCards || 0;
      // Add yellowCards from events
      const yellowCardEvents = allEvents.filter(
        e => e.playerId === player.id && e.eventType === 'Cartellino Giallo'
      );
      total += yellowCardEvents.length;
      counts[player.id] = total;
    });
    return counts;
  }, [players, allEvents]);

  const updateConvocationMutation = useMutation({
    mutationFn: async ({ playerId, isConvocato }: { playerId: number; isConvocato: number }) => {
      return await apiRequest('PATCH', `/api/players/${playerId}`, { isConvocato });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({
        title: "Convocazione aggiornata",
        description: "Lo stato di convocazione è stato modificato con successo.",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ playerId, status }: { playerId: number; status: string }) => {
      return await apiRequest('PATCH', `/api/players/${playerId}`, { convocationStatus: status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({
        title: "Stato aggiornato",
        description: "Lo stato del giocatore è stato modificato con successo.",
      });
    },
  });

  const toggleConvocazione = (playerId: number, currentStatus: number) => {
    updateConvocationMutation.mutate({
      playerId,
      isConvocato: currentStatus === 1 ? 0 : 1,
    });
  };

  const updateStatus = (playerId: number, status: string) => {
    updateStatusMutation.mutate({ playerId, status });
  };

  const addTemporaryPlayer = () => {
    if (!newTempPlayerName.trim() || !newTempPlayerRole.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci nome e ruolo del giocatore",
        variant: "destructive",
      });
      return;
    }

    const newPlayer: TemporaryPlayer = {
      name: newTempPlayerName.trim(),
      role: newTempPlayerRole.trim(),
      status: newTempPlayerStatus,
    };

    setTemporaryPlayers([...temporaryPlayers, newPlayer]);
    setNewTempPlayerName('');
    setNewTempPlayerRole('');
    setNewTempPlayerStatus('PANCHINA');
    
    toast({
      title: "✅ Giocatore aggiunto",
      description: `${newPlayer.name} - ${newPlayer.role}`,
    });
  };

  const removeTemporaryPlayer = (index: number) => {
    setTemporaryPlayers(temporaryPlayers.filter((_, i) => i !== index));
    toast({
      title: "Giocatore rimosso",
      description: "Giocatore temporaneo eliminato dalla convocazione",
    });
  };

  const saveConvocationMutation = useMutation({
    mutationFn: async () => {
      const convocatedPlayerIds = players
        .filter(p => p.isConvocato === 1)
        .map(p => p.id);

      // 1. Crea la convocazione
      const convocation: any = await apiRequest('POST', '/api/convocations', {
        name: `Convocazione ${matchDate}`,
        matchDate,
        fieldArrivalTime,
        matchStartTime,
        matchAddress,
        opponent,
        isHome,
        playerIds: convocatedPlayerIds,
        temporaryPlayers: temporaryPlayers
      });

      // 2. Crea automaticamente anche la partita collegata alla convocazione
      const match = await apiRequest('POST', '/api/matches', {
        date: matchDate,
        opponent: opponent,
        convocationId: convocation.id, // Collega la convocazione alla partita
      });

      return { convocation, match };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/convocations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches'] });
      toast({
        title: "✅ Convocazione e Partita create",
        description: `La convocazione per "${opponent || matchDate}" è stata salvata e la partita è pronta per l'app mobile!`,
      });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile salvare la convocazione.",
        variant: "destructive",
      });
    },
  });

  // Function to categorize player role
  const getRoleCategory = (role: string | null): 'Portieri' | 'Difensori' | 'Centrocampisti' | 'Attaccanti' => {
    if (!role) return 'Centrocampisti';
    const roleLower = role.toLowerCase();
    
    if (roleLower.includes('portier')) return 'Portieri';
    if (roleLower.includes('centrocampist') || roleLower.includes('mediano') || roleLower.includes('mezzala')) return 'Centrocampisti';
    if (roleLower.includes('difens') || roleLower.includes('terzin')) return 'Difensori';
    if (roleLower.includes('attacc') || roleLower.includes('punta') || roleLower.includes('ala') || roleLower.includes('trequartista') || roleLower.includes('esterno')) return 'Attaccanti';
    
    return 'Centrocampisti';
  };

  // Merge players with recent attendances and sort alphabetically
  const playersWithAttendances = players
    .map(player => {
      const attendance = recentAttendances.find(att => att.playerId === player.id);
      return {
        ...player,
        presentiCount: attendance?.presentiCount || 0,
        infortunatoCount: attendance?.infortunatoCount || 0,
        roleCategory: getRoleCategory(player.role),
      };
    })
    .sort((a, b) => {
      // Sort by lastName first, then by firstName
      const lastNameCompare = a.lastName.localeCompare(b.lastName, 'it');
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName, 'it');
    });

  // Group players by role category
  const portieri = playersWithAttendances.filter(p => p.roleCategory === 'Portieri');
  const difensori = playersWithAttendances.filter(p => p.roleCategory === 'Difensori');
  const centrocampisti = playersWithAttendances.filter(p => p.roleCategory === 'Centrocampisti');
  const attaccanti = playersWithAttendances.filter(p => p.roleCategory === 'Attaccanti');

  const convocati = playersWithAttendances.filter(p => p.isConvocato === 1);
  const nonConvocati = playersWithAttendances.filter(p => p.isConvocato === 0);
  const infortunati = playersWithAttendances.filter(p => p.convocationStatus === 'Infortunato');
  const espulsi = playersWithAttendances.filter(p => p.convocationStatus === 'Espulso');
  const ncSceltaTecnica = playersWithAttendances.filter(p => p.convocationStatus === 'NC scelta tecnica');
  const ncPerAssenze = playersWithAttendances.filter(p => p.convocationStatus === 'NC per assenze');
  const nonConvocabili = playersWithAttendances.filter(p => 
    p.convocationStatus === 'Infortunato' || 
    p.convocationStatus === 'Espulso' || 
    p.convocationStatus === 'NC scelta tecnica' || 
    p.convocationStatus === 'NC per assenze'
  );
  const daDeCidere = playersWithAttendances.filter(p => 
    p.presentiCount < 2 && 
    p.convocationStatus !== 'Infortunato' && 
    p.convocationStatus !== 'Espulso' && 
    p.convocationStatus !== 'NC scelta tecnica' && 
    p.convocationStatus !== 'NC per assenze'
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-full py-20">
          <div className="text-muted-foreground">Caricamento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">Convocazione Partita</h1>
          <p className="text-muted-foreground">
            Inserisci i dettagli della partita e seleziona i giocatori convocati.
          </p>
        </div>

        {/* Match Details Form */}
        <Card>
          <CardHeader>
            <CardTitle>Dettagli Partita</CardTitle>
            <CardDescription>
              Compila i campi per salvare la convocazione
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="matchDate">Data Gara *</Label>
                <Input
                  id="matchDate"
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  data-testid="input-match-date"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fieldArrivalTime">Orario al Campo</Label>
                <Input
                  id="fieldArrivalTime"
                  type="time"
                  value={fieldArrivalTime}
                  onChange={(e) => setFieldArrivalTime(e.target.value)}
                  data-testid="input-field-arrival-time"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="matchStartTime">Orario Inizio Partita</Label>
                <Input
                  id="matchStartTime"
                  type="time"
                  value={matchStartTime}
                  onChange={(e) => setMatchStartTime(e.target.value)}
                  data-testid="input-match-start-time"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="opponent">Avversario</Label>
                <Select value={opponent} onValueChange={setOpponent}>
                  <SelectTrigger 
                    id="opponent"
                    data-testid="select-opponent"
                  >
                    <SelectValue placeholder="Seleziona squadra avversaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedTeams.map((team) => (
                      <SelectItem key={team.id} value={team.name}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="isHome">Casa / Trasferta</Label>
                <Select 
                  value={isHome.toString()} 
                  onValueChange={(value) => {
                    const homeValue = parseInt(value);
                    setIsHome(homeValue);
                    // Se in casa, imposta indirizzo fisso
                    if (homeValue === 1) {
                      setMatchAddress('Via Verrio Flacco, 41, 00177 Roma RM');
                    } else {
                      setMatchAddress('');
                    }
                  }}
                >
                  <SelectTrigger 
                    id="isHome"
                    data-testid="select-is-home"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">🏠 In Casa</SelectItem>
                    <SelectItem value="0">✈️ Fuori Casa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="matchAddress">
                  Indirizzo Partita {isHome === 1 && <span className="text-xs text-muted-foreground">(Campo di casa)</span>}
                </Label>
                <Input
                  id="matchAddress"
                  type="text"
                  placeholder="Via, Città, CAP"
                  value={matchAddress}
                  onChange={(e) => setMatchAddress(e.target.value)}
                  disabled={isHome === 1}
                  data-testid="input-match-address"
                  className={isHome === 1 ? 'bg-muted cursor-not-allowed' : ''}
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3 flex-wrap">
              <Button
                onClick={handlePrint}
                disabled={!matchDate || convocati.length === 0}
                variant="outline"
                className="neon-glow-pink"
                data-testid="button-download-report"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Report Completo
              </Button>
              <Button
                onClick={handlePrintOfficial}
                disabled={!matchDate || convocati.length === 0}
                variant="outline"
                className="neon-glow-pink"
                data-testid="button-download-official-report"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Report Ufficiale
              </Button>
              <Button
                onClick={handlePrintBase}
                disabled={!matchDate || convocati.length === 0}
                variant="outline"
                className="neon-glow-pink"
                data-testid="button-download-base-report"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Report Base
              </Button>
              <Button
                onClick={handlePrintListaUfficiale}
                disabled={!matchDate || convocati.length === 0}
                variant="outline"
                className="neon-glow-cyan"
                data-testid="button-download-lista-ufficiale"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Lista Ufficiale
              </Button>
              <Button
                onClick={() => saveConvocationMutation.mutate()}
                disabled={!matchDate || saveConvocationMutation.isPending}
                className="neon-glow-cyan"
                data-testid="button-save-convocation"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveConvocationMutation.isPending ? 'Salvataggio...' : 'Salva Convocazione'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Giocatori Temporanei da Altre Categorie */}
        <Card className="border-pink-500/30 bg-card/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-pink-500" />
              Giocatori da Altre Categorie
            </CardTitle>
            <CardDescription>
              Aggiungi giocatori chiamati da altre categorie (Under 17, Under 16, ecc.) per sopperire agli infortuni
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Form per aggiungere nuovo giocatore temporaneo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="tempPlayerName">Nome Giocatore (Cognome Nome)</Label>
                <Input
                  id="tempPlayerName"
                  type="text"
                  placeholder="Es: Rossi Mario"
                  value={newTempPlayerName}
                  onChange={(e) => setNewTempPlayerName(e.target.value)}
                  data-testid="input-temp-player-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tempPlayerRole">Ruolo</Label>
                <Input
                  id="tempPlayerRole"
                  type="text"
                  placeholder="Es: Centrocampista Centrale"
                  value={newTempPlayerRole}
                  onChange={(e) => setNewTempPlayerRole(e.target.value)}
                  data-testid="input-temp-player-role"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="tempPlayerStatus">Stato</Label>
                <Select 
                  value={newTempPlayerStatus} 
                  onValueChange={(value: 'TITOLARE' | 'PANCHINA') => setNewTempPlayerStatus(value)}
                >
                  <SelectTrigger 
                    id="tempPlayerStatus"
                    data-testid="select-temp-player-status"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TITOLARE">⭐ Titolare</SelectItem>
                    <SelectItem value="PANCHINA">📋 Panchina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  onClick={addTemporaryPlayer}
                  className="w-full neon-glow-pink"
                  data-testid="button-add-temp-player"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Aggiungi
                </Button>
              </div>
            </div>

            {/* Lista giocatori temporanei */}
            {temporaryPlayers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  Giocatori Aggiunti ({temporaryPlayers.length})
                </h4>
                <div className="space-y-2">
                  {temporaryPlayers.map((player, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-pink-500/20"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{player.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <span>{player.role}</span>
                          <Badge variant={player.status === 'TITOLARE' ? 'default' : 'secondary'}>
                            {player.status === 'TITOLARE' ? '⭐ Titolare' : '📋 Panchina'}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeTemporaryPlayer(index)}
                        data-testid={`button-remove-temp-player-${index}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {temporaryPlayers.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nessun giocatore temporaneo aggiunto</p>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convocati</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-500">{convocati.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non Convocati</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nonConvocati.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Da Decidere (&lt;2 all.)</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{daDeCidere.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Infortunati</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{infortunati.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Espulsi</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{espulsi.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Players Tables by Role */}
      <div className="space-y-6">
        {[
          { title: '🧤 Portieri', players: portieri, icon: '🧤' },
          { title: '🛡️ Difensori', players: difensori, icon: '🛡️' },
          { title: '⚙️ Centrocampisti', players: centrocampisti, icon: '⚙️' },
          { title: '⚽ Attaccanti', players: attaccanti, icon: '⚽' }
        ].map(({ title, players: rolePlayers }) => (
          <Card key={title}>
          <CardHeader>
            <CardTitle>{title} ({rolePlayers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">#</th>
                    <th className="text-left p-3 font-medium">Nome</th>
                    <th className="text-left p-3 font-medium">Ruolo</th>
                    <th className="text-left p-3 font-medium">Presenze (7gg)</th>
                    <th className="text-center p-3 font-medium">🟨 Cartellini</th>
                    <th className="text-left p-3 font-medium">Stato</th>
                    <th className="text-left p-3 font-medium">Convocazione</th>
                  </tr>
                </thead>
                <tbody>
                  {rolePlayers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center p-8 text-muted-foreground">
                        Nessun giocatore in questo ruolo
                      </td>
                    </tr>
                  ) : (
                    rolePlayers.map((player) => {
                    const isInjured = player.convocationStatus === 'Infortunato';
                    const isExpelled = player.convocationStatus === 'Espulso';
                    const isRiabilitatoInfortunato = player.convocationStatus === 'Riabilitato Infortunato';
                    const isNcSceltaTecnica = player.convocationStatus === 'NC scelta tecnica';
                    const isNcPerAssenze = player.convocationStatus === 'NC per assenze';
                    const isNcMotiviSocietari = player.convocationStatus === 'NC per motivi societari';
                    const isNonConvocabile = isInjured || isExpelled || isRiabilitatoInfortunato || isNcSceltaTecnica || isNcPerAssenze || isNcMotiviSocietari;
                    const hasInjuryInWeek = player.infortunatoCount > 0;
                    const hasLessThan2Trainings = player.presentiCount < 2;
                    
                    // Rosso se espulso (priorità massima)
                    // Giallo se infortunato (priorità alta)
                    // Arancione se NC scelta tecnica
                    // Grigio se NC per assenze
                    // Viola se NC motivi societari
                    // Giallo se ha avuto infortuni negli allenamenti della settimana
                    // Blu se ha fatto meno di 2 allenamenti
                    const bgColor = isExpelled
                      ? 'bg-red-500/30 border-l-4 border-l-red-500'
                      : isInjured
                        ? 'bg-yellow-500/30 border-l-4 border-l-yellow-500'
                        : isNcSceltaTecnica
                          ? 'bg-orange-500/30 border-l-4 border-l-orange-500'
                          : isNcPerAssenze
                            ? 'bg-gray-500/30 border-l-4 border-l-gray-500'
                            : isNcMotiviSocietari
                              ? 'bg-purple-500/30 border-l-4 border-l-purple-500'
                              : hasInjuryInWeek 
                                ? 'bg-yellow-500/30 border-l-4 border-l-yellow-500' 
                                : hasLessThan2Trainings 
                                  ? 'bg-blue-500/30 border-l-4 border-l-blue-500' 
                                  : '';
                    
                    return (
                      <tr
                        key={player.id}
                        className={`border-b hover-elevate ${bgColor}`}
                        data-testid={`row-player-${player.id}`}
                      >
                        <td className="p-3">
                          <span className="font-mono font-bold text-lg">
                            {player.number || '-'}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {player.lastName} {player.firstName}
                            </span>
                            {player.isConvocato === 1 && (
                              <Badge variant="default" className="bg-cyan-500">
                                Convocato
                              </Badge>
                            )}
                            {isInjured && (
                              <Badge variant="destructive" className="bg-yellow-500">
                                Infortunato
                              </Badge>
                            )}
                            {isExpelled && (
                              <Badge variant="destructive" className="bg-red-600">
                                Espulso
                              </Badge>
                            )}
                            {isNcSceltaTecnica && (
                              <Badge variant="destructive" className="bg-orange-500">
                                NC scelta tecnica
                              </Badge>
                            )}
                            {isNcPerAssenze && (
                              <Badge variant="secondary" className="bg-gray-500">
                                NC per assenze
                              </Badge>
                            )}
                            {isNcMotiviSocietari && (
                              <Badge variant="secondary" className="bg-purple-600">
                                NC motivi societari
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {player.role || '-'}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${player.presentiCount >= 2 ? 'text-green-500' : player.presentiCount === 1 ? 'text-blue-500' : 'text-red-500'}`}>
                              {player.presentiCount}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              / 3 allenamenti
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col items-center gap-1">
                            {playerYellowCards[player.id] > 0 ? (
                              <span className="inline-flex items-center justify-center min-w-[32px] px-2 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded text-sm font-bold text-yellow-400">
                                🟨 {playerYellowCards[player.id]}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                            {player.suspensionDays && player.suspensionDays > 0 && (
                              <span className="text-xs text-red-400 font-semibold whitespace-nowrap">
                                🔴 {player.suspensionDays} {player.suspensionDays === 1 ? 'giornata' : 'giornate'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <Select
                            value={player.convocationStatus || 'Convocabile'}
                            onValueChange={(value) => updateStatus(player.id, value)}
                            disabled={updateStatusMutation.isPending}
                          >
                            <SelectTrigger 
                              className="w-[240px]"
                              data-testid={`select-status-${player.id}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Convocabile">Convocabile</SelectItem>
                              <SelectItem value="Convocabile solo 1 allenamento">
                                Convocabile solo 1 allenamento
                              </SelectItem>
                              <SelectItem value="Infortunato">🤕 Infortunato</SelectItem>
                              <SelectItem value="Espulso">🔴 Espulso</SelectItem>
                              <SelectItem value="Riabilitato">✅ Riabilitato</SelectItem>
                              <SelectItem value="Riabilitato Infortunato">🟠 Riabilitato Infortunato</SelectItem>
                              <SelectItem value="NC scelta tecnica">⛔ NC scelta tecnica</SelectItem>
                              <SelectItem value="NC per assenze">📵 NC per assenze</SelectItem>
                              <SelectItem value="NC per motivi societari">🏛️ NC motivi societari</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-3">
                          <Button
                            variant={player.isConvocato === 1 ? "destructive" : "default"}
                            size="sm"
                            onClick={() => toggleConvocazione(player.id, player.isConvocato)}
                            disabled={updateConvocationMutation.isPending || isNonConvocabile}
                            data-testid={`button-convoca-${player.id}`}
                          >
                            {player.isConvocato === 1 ? (
                              <>
                                <UserX className="w-4 h-4 mr-2" />
                                Rimuovi
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-4 h-4 mr-2" />
                                {isNonConvocabile ? 'Non Convocabile' : 'Convoca'}
                              </>
                            )}
                          </Button>
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
      ))}
      </div>
      </div>

      {/* Hidden Report Components for Printing */}
      <div style={{ display: 'none' }}>
        {/* Report Completo */}
        <ReportConvocazione
          ref={reportRef}
          matchDate={matchDate}
          opponent={opponent}
          opponentLogoUrl={opponentLogoUrl}
          fieldArrivalTime={fieldArrivalTime}
          matchStartTime={matchStartTime}
          matchAddress={matchAddress}
          isHome={isHome}
          players={players}
          playerYellowCards={playerYellowCards}
          recentAttendances={recentAttendances}
          temporaryPlayers={temporaryPlayers}
        />
        
        {/* Report Ufficiale - senza NC scelta tecnica e motivi societari */}
        <ReportConvocazione
          ref={officialReportRef}
          matchDate={matchDate}
          opponent={opponent}
          opponentLogoUrl={opponentLogoUrl}
          fieldArrivalTime={fieldArrivalTime}
          matchStartTime={matchStartTime}
          matchAddress={matchAddress}
          isHome={isHome}
          players={players}
          playerYellowCards={playerYellowCards}
          recentAttendances={recentAttendances}
          temporaryPlayers={temporaryPlayers}
          isOfficialReport={true}
        />
        
        {/* Report Base - solo N°, Cognome Nome, Ruolo (senza Gialli, All.ti, Inf.) */}
        <ReportConvocazione
          ref={baseReportRef}
          matchDate={matchDate}
          opponent={opponent}
          opponentLogoUrl={opponentLogoUrl}
          fieldArrivalTime={fieldArrivalTime}
          matchStartTime={matchStartTime}
          matchAddress={matchAddress}
          isHome={isHome}
          players={players}
          playerYellowCards={playerYellowCards}
          recentAttendances={recentAttendances}
          temporaryPlayers={temporaryPlayers}
          isOfficialReport={true}
          reportType="base"
        />
        
        {/* Lista Ufficiale - con T/P, Cambi, Tempi di Gioco, Goal Fatti */}
        <ReportConvocazione
          ref={listaUfficialeRef}
          matchDate={matchDate}
          opponent={opponent}
          opponentLogoUrl={opponentLogoUrl}
          fieldArrivalTime={fieldArrivalTime}
          matchStartTime={matchStartTime}
          matchAddress={matchAddress}
          isHome={isHome}
          players={players}
          playerYellowCards={playerYellowCards}
          recentAttendances={recentAttendances}
          temporaryPlayers={temporaryPlayers}
          isOfficialReport={true}
          reportType="lista-ufficiale"
        />
      </div>
    </div>
  );
}
