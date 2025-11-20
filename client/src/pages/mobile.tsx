import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Calendar, Smartphone, Eye, RefreshCw, Zap, Sparkles, ClipboardList } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PlayerCard from "@/components/PlayerCard";
import type { Player, MatchSession, Convocation } from "@shared/schema";
import proRomaLogo from '@assets/logo proroma_1761322516639.png';

type ScreenType = 'home' | 'live' | 'roster' | 'formation' | 'convocati';

export default function MobilePage() {
  const { toast } = useToast();
  const [selectedScreen, setSelectedScreen] = useState<ScreenType>('home');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [formationStatus, setFormationStatus] = useState<Record<number, string>>({});
  
  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['/api/players'],
  });

  const { data: matches = [] } = useQuery<MatchSession[]>({
    queryKey: ['/api/matches'],
  });

  const { data: convocations = [] } = useQuery<Convocation[]>({
    queryKey: ['/api/convocations'],
  });

  // Find the most recent convocation
  const latestConvocationForFormation = convocations.length > 0 
    ? convocations.sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())[0]
    : null;

  // Find the match linked to the most recent convocation
  const linkedMatchForFormation = matches.find(m => m.convocationId === latestConvocationForFormation?.id);

  // Load formation statuses for the linked match
  const { data: formationAssignments = [] } = useQuery<any[]>({
    queryKey: [`/api/formations/${linkedMatchForFormation?.id}`],
    enabled: !!linkedMatchForFormation,
  });

  // Update local formationStatus when data loads
  useEffect(() => {
    if (formationAssignments.length > 0) {
      const statusMap: Record<number, string> = {};
      formationAssignments.forEach((assignment: any) => {
        statusMap[assignment.playerId] = assignment.status;
      });
      setFormationStatus(statusMap);
    }
  }, [formationAssignments]);

  // Find today's match or the most recent one
  const activeMatch = matches.length > 0 
    ? matches.find(m => m.date === new Date().toISOString().split('T')[0]) || 
      matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    : null;

  const { data: matchStats } = useQuery<{
    match: MatchSession;
    goals: any[];
    redCards: any[];
    substitutions: any[];
    totals: { goals: number; redCards: number; substitutions: number };
  }>({
    queryKey: ['/api/matches', activeMatch?.id, 'stats'],
    enabled: !!activeMatch,
  });
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const timeString = currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  const screens = [
    {
      id: 'home' as ScreenType,
      icon: '🏠',
      title: 'Home Mobile',
      subtitle: 'Dashboard con azioni rapide',
    },
    {
      id: 'live' as ScreenType,
      icon: '⚽',
      title: 'Partita Live',
      subtitle: 'Timer e eventi in tempo reale',
    },
    {
      id: 'convocati' as ScreenType,
      icon: '📋',
      title: 'Lista Convocati',
      subtitle: 'Giocatori convocati per la partita',
    },
    {
      id: 'roster' as ScreenType,
      icon: '👥',
      title: 'Rosa',
      subtitle: 'Gestione giocatori',
    },
    {
      id: 'formation' as ScreenType,
      icon: '🛡️',
      title: 'Formazione',
      subtitle: 'Titolari e panchina',
    },
  ];

  const features = [
    {
      icon: '🎨',
      title: 'Design FC Style',
      description: 'Tema dark con effetti neon cyan/pink',
    },
    {
      icon: '🔄',
      title: 'Sincronizzazione real-time',
      description: 'Dati aggiornati automaticamente',
    },
    {
      icon: '📱',
      title: 'PWA installabile',
      description: 'Funziona offline come app nativa',
    },
    {
      icon: '⚡',
      title: 'Azioni rapide',
      description: 'Accesso veloce alle funzioni principali',
    },
  ];

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Buongiorno!';
    if (hour < 18) return 'Buon pomeriggio!';
    return 'Buonasera!';
  };

  const renderMobileScreen = () => {
    switch (selectedScreen) {
      case 'home':
        return (
          <div className="space-y-6 p-6">
            {/* Header */}
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <img src={proRomaLogo} alt="Pro Roma Calcio" className="w-12 h-12 object-contain" />
                <h2 className="text-2xl font-bold text-foreground">{getGreeting()}</h2>
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span>{timeString} • {dateString.split(' ')[0]}</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  Online
                </Badge>
              </div>
            </div>

            {/* Azioni Rapide */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                ⚡ Azioni Rapide
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <Link href="/partita-live?mobile=true">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/10 border border-primary/30 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-goto-partita-live">
                    <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-3xl">⚽</span>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">Partita Live</p>
                      <p className="text-xs text-muted-foreground">Apri Pulsantiera</p>
                    </div>
                  </div>
                </Link>

                <Link href="/partita-offline">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-goto-partita-offline">
                    <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center">
                      <span className="text-3xl">📝</span>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">Partita Offline</p>
                      <p className="text-xs text-muted-foreground">Registra eventi</p>
                    </div>
                  </div>
                </Link>

                <div 
                  onClick={() => setSelectedScreen('convocati')}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/30 hover-elevate active-elevate-2 cursor-pointer" 
                  data-testid="button-goto-convocati"
                >
                  <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
                    <ClipboardList className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Lista Convocati</p>
                    <p className="text-xs text-muted-foreground">Vedi convocazione</p>
                  </div>
                </div>

                <Link href="/presenze">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/10 border border-secondary/30 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-goto-presenze">
                    <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                      <Calendar className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">Presenze</p>
                      <p className="text-xs text-muted-foreground">Registra oggi</p>
                    </div>
                  </div>
                </Link>

                <Link href="/formazione">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-goto-formazione">
                    <div className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center">
                      <Shield className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">Formazione</p>
                      <p className="text-xs text-muted-foreground">Modifica lineup</p>
                    </div>
                  </div>
                </Link>

                <Link href="/rosa">
                  <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-goto-rosa">
                    <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center">
                      <Users className="h-7 w-7" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-sm">Rosa</p>
                      <p className="text-xs text-muted-foreground">Vedi squadra</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        );

      case 'live':
        // Find the most recent match with convocation
        const liveMatch = matches.length > 0 
          ? matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
          : null;

        const liveConvocation = liveMatch ? convocations.find(c => c.id === liveMatch.convocationId) : null;

        if (!liveMatch) {
          return (
            <div className="space-y-4 p-4 text-center">
              <p className="text-muted-foreground">Nessuna partita disponibile</p>
              <Link href="/partita-live?mobile=true">
                <Button>Vai alla Partita Live</Button>
              </Link>
            </div>
          );
        }

        // Recupera formazione per questa partita (hook già presente, riutilizziamo formationAssignments)
        const liveFormationData = formationAssignments || [];
        
        // Separa titolari e panchina
        const titolari = liveFormationData
          .filter((fa: any) => fa.lineupStatus === 'titolare')
          .map((fa: any) => {
            const player = players.find(p => p.id === fa.playerId);
            return { ...fa, player };
          })
          .filter((fa: any) => fa.player);
        
        const panchina = liveFormationData
          .filter((fa: any) => fa.lineupStatus === 'panchina')
          .map((fa: any) => {
            const player = players.find(p => p.id === fa.playerId);
            return { ...fa, player };
          })
          .filter((fa: any) => fa.player);

        const totaleGiocatori = titolari.length + panchina.length;

        return (
          <div className="space-y-4 p-4">
            <h2 className="text-xl font-bold text-foreground mb-4">⚽ Partita Live</h2>

            {/* Informazioni Partita dalla Convocazione */}
            {liveConvocation && (
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <p className="text-xs text-muted-foreground mb-1">📅 Data Partita</p>
                    <p className="text-sm font-semibold">
                      {new Date(liveConvocation.matchDate).toLocaleDateString('it-IT')}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <p className="text-xs text-muted-foreground mb-1">🏟️ Avversario</p>
                    <p className="text-sm font-semibold">{liveConvocation.opponent}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-muted-foreground mb-1">📍 Ritrovo Campo</p>
                    <p className="text-sm font-semibold">{liveConvocation.fieldArrivalTime}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-muted-foreground mb-1">⏱️ Inizio Partita</p>
                    <p className="text-sm font-semibold">{liveConvocation.matchStartTime}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Tabella Titolari e Panchina */}
            {totaleGiocatori > 0 && (
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>📋 Formazione di Gara</span>
                    <Badge variant="outline" className="text-xs">
                      {titolari.length} + {panchina.length} = {totaleGiocatori}/20
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/50">
                    {/* Sezione Titolari */}
                    <div className="p-3 bg-green-500/5">
                      <p className="text-xs font-semibold text-green-500 mb-2 uppercase">
                        ⭐ Titolari ({titolari.length}/11)
                      </p>
                      <div className="space-y-1">
                        {titolari.map((item: any) => (
                          <div 
                            key={item.playerId} 
                            className="flex items-center gap-2 text-xs p-2 rounded bg-background/50"
                            data-testid={`titolare-${item.playerId}`}
                          >
                            <span className="font-bold text-cyan-500 w-6">
                              {item.player.number || '-'}
                            </span>
                            <span className="flex-1 font-medium">
                              {item.player.lastName} {item.player.firstName}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1">
                              {item.player.role || 'N/A'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Sezione Panchina */}
                    {panchina.length > 0 && (
                      <div className="p-3 bg-blue-500/5">
                        <p className="text-xs font-semibold text-blue-500 mb-2 uppercase">
                          💺 Panchina ({panchina.length}/9)
                        </p>
                        <div className="space-y-1">
                          {panchina.map((item: any) => (
                            <div 
                              key={item.playerId} 
                              className="flex items-center gap-2 text-xs p-2 rounded bg-background/50"
                              data-testid={`panchina-${item.playerId}`}
                            >
                              <span className="font-bold text-cyan-500 w-6">
                                {item.player.number || '-'}
                              </span>
                              <span className="flex-1 font-medium">
                                {item.player.lastName} {item.player.firstName}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1">
                                {item.player.role || 'N/A'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Info Status Partita */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-pink-500/10 border border-cyan-500/30 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                Tracciamento in corso
              </p>
              <p className="font-semibold text-foreground">
                Tutti gli eventi vengono registrati in tempo reale
              </p>
            </div>

            {/* Link alla pulsantiera */}
            <Link href="/partita-live?mobile=true">
              <Button className="w-full" size="lg" data-testid="button-open-pulsantiera">
                Apri Pulsantiera Completa
              </Button>
            </Link>
          </div>
        );

      case 'roster':
        return (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">👥 Rosa Squadra</h2>
              <Badge variant="outline" className="text-xs">
                {players.length} Giocatori
              </Badge>
            </div>
            
            <div className="space-y-3">
              {players.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nessun giocatore nella rosa
                </div>
              ) : (
                players.map((player, index) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    index={index}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    variant="compact"
                  />
                ))
              )}
            </div>
          </div>
        );

      case 'convocati':
        // Find the most recent convocation
        const latestConvocation = convocations.length > 0 
          ? convocations.sort((a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime())[0]
          : null;

        // Mostra TUTTA la rosa ordinata per cognome
        const allPlayersForConvocation = [...players]
          .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

        return (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">📋 Lista Rosa Completa</h2>
              <Badge variant="outline" className="text-xs">
                {allPlayersForConvocation.length} Giocatori
              </Badge>
            </div>

            {!latestConvocation ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nessuna convocazione trovata
              </div>
            ) : (
              <>
                {/* Info Convocazione */}
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Data Partita</p>
                    <p className="font-semibold text-sm">{new Date(latestConvocation.matchDate).toLocaleDateString('it-IT')}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Avversario</p>
                    <p className="font-semibold text-sm">{latestConvocation.opponent}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Ritrovo Campo</p>
                    <p className="font-semibold text-sm">{latestConvocation.fieldArrivalTime}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Inizio Partita</p>
                    <p className="font-semibold text-sm">{latestConvocation.matchStartTime}</p>
                  </div>
                </div>

                {/* Tabella Rosa Completa */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="text-xs font-semibold w-12">N°</TableHead>
                        <TableHead className="text-xs font-semibold">#</TableHead>
                        <TableHead className="text-xs font-semibold">Giocatore</TableHead>
                        <TableHead className="text-xs font-semibold text-center">Stato</TableHead>
                        <TableHead className="text-xs font-semibold text-center">T/P</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allPlayersForConvocation.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-muted-foreground text-xs py-8">
                            Nessun giocatore in rosa
                          </TableCell>
                        </TableRow>
                      ) : (
                        allPlayersForConvocation.map((player, index) => {
                          const status = formationStatus[player.id] || 'N/D';
                          const isConvocato = player.isConvocato === 1;
                          const isInjured = player.convocationStatus === 'Infortunato';
                          const isExpelled = player.convocationStatus === 'Espulso';
                          const isRiabilitato = player.convocationStatus === 'Riabilitato';
                          const isRiabilitatoInfortunato = player.convocationStatus === 'Riabilitato Infortunato';
                          
                          return (
                            <TableRow key={player.id} data-testid={`row-convocato-${player.id}`}>
                              <TableCell className="font-bold text-xs text-cyan-500">
                                {index + 1}
                              </TableCell>
                              <TableCell className="font-medium text-xs">
                                {player.number || '-'}
                              </TableCell>
                              <TableCell className="font-semibold text-xs">
                                {player.lastName} {player.firstName}
                              </TableCell>
                              <TableCell className="text-center">
                                {isExpelled ? (
                                  <Badge className="bg-red-600 text-white text-[10px]">🔴 Espulso</Badge>
                                ) : isRiabilitato ? (
                                  <Badge className="bg-green-600 text-white text-[10px]">✅ Riabilitato</Badge>
                                ) : isRiabilitatoInfortunato ? (
                                  <Badge className="bg-orange-600 text-white text-[10px]">🟠 Riab. Infort.</Badge>
                                ) : isInjured ? (
                                  <Badge className="bg-yellow-600 text-white text-[10px]">🤕 Infortunato</Badge>
                                ) : isConvocato ? (
                                  <Badge className="bg-green-600 text-white text-[10px]">✅ Convocato</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px]">Non Convocato</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                {status === 'TITOLARE' ? (
                                  <Badge className="bg-green-600 text-white text-xs">T</Badge>
                                ) : status === 'PANCHINA' ? (
                                  <Badge className="bg-yellow-600 text-white text-xs">P</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">-</Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Info Indirizzo */}
                {latestConvocation.matchAddress && (
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                    <p className="text-xs text-muted-foreground mb-1">📍 Indirizzo Campo</p>
                    <p className="text-sm font-medium">{latestConvocation.matchAddress}</p>
                  </div>
                )}

                {/* NOTE - Campo per tracciare richieste */}
                <div className="p-4 rounded-lg bg-orange-500/10 border-2 border-orange-500/50">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-2xl">📝</span>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-orange-400 mb-1">NOTE IMPORTANTI</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Tracciamento richieste da non rifare (a meno di esplicita richiesta)
                      </p>
                      <div className="space-y-2 text-xs">
                        <div className="p-2 rounded bg-card/50 border border-border/50">
                          <p className="font-semibold text-foreground">✅ Implementato:</p>
                          <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                            <li>Colonna N° maglia presente nella tabella convocati</li>
                            <li>Campo decisione T/P aggiunto (mostra stato da pagina Formazione)</li>
                            <li>Campo note aggiunto per tracciamento richieste</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        );

      case 'formation':
        // Get convocated players for formation and sort by lastName
        const formationPlayerIds = latestConvocationForFormation?.playerIds || [];
        const formationPlayers = players
          .filter(p => formationPlayerIds.includes(p.id))
          .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

        const togglePlayerStatus = async (playerId: number) => {
          if (!linkedMatchForFormation) {
            toast({ title: "Nessuna partita trovata", variant: "destructive" });
            return;
          }

          // Cycle through: undefined -> T -> P -> undefined
          const currentStatus = formationStatus[playerId];
          let newStatus: string;
          
          if (!currentStatus || currentStatus === 'N/D') {
            newStatus = 'TITOLARE';
          } else if (currentStatus === 'TITOLARE') {
            newStatus = 'PANCHINA';
          } else {
            newStatus = 'N/D';
          }

          // Update local state
          setFormationStatus(prev => ({ ...prev, [playerId]: newStatus }));

          // Save to database
          try {
            await apiRequest('POST', '/api/formations', {
              matchId: linkedMatchForFormation.id,
              formations: [{ playerId, status: newStatus }]
            });
            
            queryClient.invalidateQueries({ queryKey: [`/api/formations/${linkedMatchForFormation.id}`] });
          } catch (error) {
            toast({ title: "Errore nel salvare", variant: "destructive" });
          }
        };

        const getStatusBadge = (playerId: number) => {
          const status = formationStatus[playerId] || 'N/D';
          
          if (status === 'TITOLARE') {
            return <Badge className="bg-green-600 text-white text-xs w-6 h-6 flex items-center justify-center">T</Badge>;
          } else if (status === 'PANCHINA') {
            return <Badge className="bg-yellow-600 text-white text-xs w-6 h-6 flex items-center justify-center">P</Badge>;
          } else {
            return <Badge variant="outline" className="text-xs w-6 h-6 flex items-center justify-center">-</Badge>;
          }
        };

        return (
          <div className="space-y-4 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-foreground">🛡️ Formazione</h2>
              <Badge variant="outline" className="text-xs">
                {formationPlayers.length} Convocati
              </Badge>
            </div>

            {!latestConvocationForFormation ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nessuna convocazione trovata
              </div>
            ) : (
              <>
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 mb-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    Clicca su ogni giocatore per assegnare: <strong>T</strong> (Titolare) o <strong>P</strong> (Panchina)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {linkedMatchForFormation ? `Partita: ${linkedMatchForFormation.opponent}` : 'Nessuna partita collegata'}
                  </p>
                </div>

                {/* Lista Convocati con Status */}
                <div className="space-y-2">
                  {formationPlayers.map((player) => (
                    <div
                      key={player.id}
                      onClick={() => togglePlayerStatus(player.id)}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover-elevate active-elevate-2 cursor-pointer"
                      data-testid={`formation-player-${player.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-muted-foreground w-8">
                          #{player.number || '-'}
                        </span>
                        <div>
                          <p className="font-semibold text-sm">
                            {player.lastName} {player.firstName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {player.role || 'N/D'}
                          </p>
                        </div>
                      </div>
                      {getStatusBadge(player.id)}
                    </div>
                  ))}
                </div>

                {/* Conteggio */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                    <p className="text-2xl font-bold text-green-400">
                      {Object.values(formationStatus).filter(s => s === 'TITOLARE').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Titolari</p>
                  </div>
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-center">
                    <p className="text-2xl font-bold text-yellow-400">
                      {Object.values(formationStatus).filter(s => s === 'PANCHINA').length}
                    </p>
                    <p className="text-xs text-muted-foreground">Panchina</p>
                  </div>
                </div>
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Smartphone className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-4xl font-bold text-primary">Schermate Mobile Funzionanti</h1>
                <p className="text-lg text-muted-foreground">
                  Testa tutte le funzionalità dell'app mobile
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <a href={`${window.location.origin}/mobile`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" className="gap-2" data-testid="button-go-mobile-live">
                  <Eye className="h-4 w-4" />
                  Vai a Mobile Live
                </Button>
              </a>
              <a href={`${window.location.origin}/mobile-app`} target="_blank" rel="noopener noreferrer">
                <Button variant="default" className="gap-2" data-testid="button-open-mobile-app">
                  <Smartphone className="h-4 w-4" />
                  APP Mobile per Cell
                </Button>
              </a>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Sidebar - Seleziona Schermata */}
            <div className="lg:col-span-3">
              <Card className="border-primary/30">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Smartphone className="h-5 w-5" />
                    Seleziona Schermata
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {screens.map((screen) => (
                    <button
                      key={screen.id}
                      onClick={() => setSelectedScreen(screen.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedScreen === screen.id
                          ? 'bg-primary text-primary-foreground neon-glow-cyan'
                          : 'hover:bg-primary/10 text-foreground'
                      }`}
                      data-testid={`button-screen-${screen.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{screen.icon}</span>
                        <div>
                          <p className="font-semibold text-sm">{screen.title}</p>
                          <p className={`text-xs ${
                            selectedScreen === screen.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}>
                            {screen.subtitle}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Caratteristiche */}
              <Card className="mt-6 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Caratteristiche Implementate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {features.map((feature, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{feature.icon}</span>
                        <p className="font-semibold text-xs">{feature.title}</p>
                      </div>
                      <p className="text-xs text-muted-foreground pl-7">{feature.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Mobile Preview */}
            <div className="lg:col-span-9">
              <Card className="border-primary/30 border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                      🏠 {screens.find(s => s.id === selectedScreen)?.title}
                    </CardTitle>
                    <Badge variant="outline" className="gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      Live Preview
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {screens.find(s => s.id === selectedScreen)?.subtitle}
                  </p>
                </CardHeader>
                <CardContent>
                  {/* Smartphone Frame */}
                  <div className="flex justify-center">
                    <div className="relative">
                      {/* Phone Frame */}
                      <div className="w-[360px] h-[640px] border-8 border-gray-800 rounded-[3rem] shadow-2xl overflow-hidden bg-background">
                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-6 bg-gray-800 rounded-b-2xl z-10"></div>
                        
                        {/* Screen Content */}
                        <div className="h-full overflow-y-auto bg-[#1a1a2e]">
                          {renderMobileScreen()}
                        </div>
                      </div>
                      
                      {/* Home Button */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 bg-gray-600 rounded-full"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
