import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { MiniFieldPositionEditor } from "@/components/MiniFieldPositionEditor";
import type { Player } from "@shared/schema";

export default function PlayerDetailPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: player, isLoading } = useQuery<Player>({
    queryKey: [`/api/players/${id}`],
    enabled: !!id,
  });

  // Fetch all match events for the player
  const { data: allEvents = [] } = useQuery<any[]>({
    queryKey: ['/api/matches/all-events'],
    enabled: !!id,
  });

  // Fetch all attendances for the player
  const { data: allAttendances = [] } = useQuery<any[]>({
    queryKey: ['/api/attendances'],
    enabled: !!id,
  });

  // Fetch all formations for the player
  const { data: allFormations = [] } = useQuery<any[]>({
    queryKey: ['/api/formations'],
    enabled: !!id,
  });

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState('');
  const [number, setNumber] = useState<number | ''>('');
  const [passaggio, setPassaggio] = useState<number | ''>('');
  const [tiro, setTiro] = useState<number | ''>('');
  const [dribbling, setDribbling] = useState<number | ''>('');
  const [resistenza, setResistenza] = useState<number | ''>('');
  const [velocita, setVelocita] = useState<number | ''>('');
  const [concentrazione, setConcentrazione] = useState<number | ''>('');
  const [resilienza, setResilienza] = useState<number | ''>('');
  const [leadership, setLeadership] = useState<number | ''>('');
  const [disciplina, setDisciplina] = useState<number | ''>('');
  const [aspettoTattico, setAspettoTattico] = useState<number | ''>('');
  const [condizioneFisica, setCondizioneFisica] = useState<number | ''>('');
  const [atteggiamento, setAtteggiamento] = useState<number | ''>('');
  const [commentoGenerale, setCommentoGenerale] = useState('');
  const [dataNascita, setDataNascita] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [numeroDocumento, setNumeroDocumento] = useState('');
  const [notePersonali, setNotePersonali] = useState('');
  
  // Role specializations management
  const [editingRoles, setEditingRoles] = useState<Record<string, number>>({});
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [rolePercentage, setRolePercentage] = useState<number>(0);

  // Initialize form when player data loads
  useEffect(() => {
    if (player) {
      setFirstName(player.firstName || '');
      setLastName(player.lastName || '');
      setRole(player.role || '');
      setNumber(player.number || '');
      setPassaggio(player.passaggio || '');
      setTiro(player.tiro || '');
      setDribbling(player.dribbling || '');
      setResistenza(player.resistenza || '');
      setVelocita(player.velocita || '');
      setConcentrazione(player.concentrazione || '');
      setResilienza(player.resilienza || '');
      setLeadership(player.leadership || '');
      setDisciplina(player.disciplina || '');
      setAspettoTattico(player.aspettoTattico || '');
      setCondizioneFisica(player.condizioneFisica || '');
      setAtteggiamento(player.atteggiamento || '');
      setCommentoGenerale(player.commentoGenerale || '');
      setDataNascita(player.dataNascita || '');
      setTipoDocumento(player.tipoDocumento || '');
      setNumeroDocumento(player.numeroDocumento || '');
      setNotePersonali(player.notePersonali || '');
      setEditingRoles(player.roleSpecializations || {});
    }
  }, [player]);

  const updatePlayerMutation = useMutation({
    mutationFn: (data: Partial<Player>) => apiRequest('PATCH', `/api/players/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/players/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({ title: "✅ Dati salvati con successo" });
    },
  });

  // Delete attendance mutation
  const deleteAttendanceMutation = useMutation({
    mutationFn: (attendanceId: number) => apiRequest('DELETE', `/api/attendances/${attendanceId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendances'] });
      toast({ title: "✅ Presenza eliminata" });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: (eventId: number) => apiRequest('DELETE', `/api/match-events/${eventId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/matches/all-events'] });
      toast({ title: "✅ Evento eliminato" });
    },
  });

  // Filter data for current player
  const playerAttendances = allAttendances.filter((att: any) => att.playerId === Number(id));
  const playerEvents = allEvents.filter((event: any) => event.playerId === Number(id));

  const handleSaveBasicInfo = () => {
    updatePlayerMutation.mutate({
      firstName: firstName || '',
      lastName: lastName || '',
      role: role || null,
    });
  };

  const handleSaveNumber = () => {
    updatePlayerMutation.mutate({ number: number || null });
  };

  const handleSaveSkills = () => {
    updatePlayerMutation.mutate({
      passaggio: passaggio || null,
      tiro: tiro || null,
      dribbling: dribbling || null,
      resistenza: resistenza || null,
      velocita: velocita || null,
    });
  };

  const handleSaveMental = () => {
    updatePlayerMutation.mutate({
      concentrazione: concentrazione || null,
      resilienza: resilienza || null,
      leadership: leadership || null,
      disciplina: disciplina || null,
    });
  };

  const handleSaveCoach = () => {
    updatePlayerMutation.mutate({
      aspettoTattico: aspettoTattico || null,
      condizioneFisica: condizioneFisica || null,
      atteggiamento: atteggiamento || null,
      commentoGenerale: commentoGenerale || '',
    });
  };

  const handleSaveRegistry = () => {
    updatePlayerMutation.mutate({
      dataNascita: dataNascita || null,
      tipoDocumento: tipoDocumento || null,
      numeroDocumento: numeroDocumento || null,
      notePersonali: notePersonali || null,
    });
  };

  const handleAddRole = () => {
    if (!selectedRole || rolePercentage <= 0) {
      toast({ title: "Seleziona un ruolo e inserisci una percentuale valida", variant: "destructive" });
      return;
    }

    const newRoles = { ...editingRoles, [selectedRole]: rolePercentage };
    const total = Object.values(newRoles).reduce((sum, val) => sum + val, 0);

    if (total > 100) {
      toast({ title: "La somma delle percentuali supera il 100%", variant: "destructive" });
      return;
    }

    setEditingRoles(newRoles);
    setSelectedRole('');
    setRolePercentage(0);
  };

  const handleRemoveRole = (roleToRemove: string) => {
    const newRoles = { ...editingRoles };
    delete newRoles[roleToRemove];
    setEditingRoles(newRoles);
  };

  const handleSaveRoles = () => {
    const total = Object.values(editingRoles).reduce((sum, val) => sum + val, 0);
    
    if (Object.keys(editingRoles).length > 0 && total !== 100) {
      toast({ title: "Le percentuali devono sommare al 100%", variant: "destructive" });
      return;
    }

    updatePlayerMutation.mutate({
      roleSpecializations: Object.keys(editingRoles).length > 0 ? editingRoles : null,
    });
  };

  if (isLoading || !player) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex items-center justify-center h-[80vh]">
          <p className="text-muted-foreground">Caricamento...</p>
        </div>
      </div>
    );
  }

  const getInitials = () => {
    return `${player.firstName[0] || ''}${player.lastName[0] || ''}`.toUpperCase();
  };

  const getSpecializationsDisplay = () => {
    if (!player.roleSpecializations) return null;
    const entries = Object.entries(player.roleSpecializations);
    if (entries.length === 0) return null;
    
    return entries.map(([role, percentage]) => (
      <div key={role} className="flex items-center justify-between mb-1">
        <span className="text-sm text-muted-foreground">{role}</span>
        <Badge variant="secondary" className="ml-2">{percentage}%</Badge>
      </div>
    ));
  };

  // Calculate player statistics
  const getPlayerStats = () => {
    if (!player) return null;

    // Filter data for this player
    const playerEvents = allEvents.filter(e => e.playerId === player.id);
    const playerAttendances = allAttendances.filter(a => a.playerId === player.id);
    const playerFormations = allFormations.filter(f => f.playerId === player.id);

    // Attendance stats
    const presenti = playerAttendances.filter(a => a.status === 'Presente').length;
    const assenti = playerAttendances.filter(a => a.status === 'Assente').length;
    const infortuni = playerAttendances.filter(a => a.status === 'Infortunato').length;

    // Match events stats
    const gol = playerEvents.filter(e => e.eventType === 'Gol').length;
    const assist = playerEvents.filter(e => e.eventType === 'Assist').length;
    const gialli = playerEvents.filter(e => e.eventType === 'Cartellino Giallo').length;
    const rossi = playerEvents.filter(e => e.eventType === 'Cartellino Rosso').length;
    const sostituzioniEntra = playerEvents.filter(e => e.eventType === 'Sostituzione' && e.description?.includes('ENTRA')).length;
    const sostituzioniEsce = playerEvents.filter(e => e.eventType === 'Sostituzione' && e.description?.includes('ESCE')).length;
    const rigori = playerEvents.filter(e => e.eventType === 'Rigore').length;
    const corner = playerEvents.filter(e => e.eventType === 'Corner').length;
    const fuorigioco = playerEvents.filter(e => e.eventType === 'Fuorigioco').length;

    // Formation stats
    const convocazioniTitolare = playerFormations.filter(f => f.status === 'TITOLARE').length;
    const convocazioniPanchina = playerFormations.filter(f => f.status === 'PANCHINA').length;
    const partiteTotali = convocazioniTitolare + convocazioniPanchina;

    // Calculate minutes played (assuming 90 minutes per match as starter, estimate for substitutes)
    const minutiGiocati = (convocazioniTitolare * 90) + (sostituzioniEntra * 30);

    return {
      // Allenamenti
      presenti,
      assenti,
      infortuni,
      // Partite
      gol,
      assist,
      gialli,
      rossi,
      sostituzioniEntra,
      sostituzioniEsce,
      rigori,
      corner,
      fuorigioco,
      // Convocazioni
      convocazioniTitolare,
      convocazioniPanchina,
      partiteTotali,
      minutiGiocati,
    };
  };

  const stats = getPlayerStats();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => setLocation('/rosa')}
          className="mb-4"
          data-testid="button-back-rosa"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Torna alla Rosa
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Player card */}
          <div className="lg:col-span-1 space-y-4">
            {/* Player identity */}
            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-3xl font-bold text-primary">{player.lastName}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <Avatar className="w-24 h-24 mb-4 border-4 border-primary/30">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                
                <h2 className="text-2xl font-bold text-center mb-1" data-testid="text-player-name">
                  {player.lastName} {player.firstName}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">ID: {player.id}</p>
                
                {/* Basic info editing */}
                <Card className="w-full bg-secondary/30 border-primary/20 mb-4">
                  <CardHeader>
                    <CardTitle className="text-lg text-primary">Modifica giocatore</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium mb-1 block">Nome</label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Nome"
                        className="bg-background/50"
                        data-testid="input-player-firstname"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Cognome</label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Cognome"
                        className="bg-background/50"
                        data-testid="input-player-lastname"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">Ruolo Principale</label>
                      <Select value={role} onValueChange={setRole}>
                        <SelectTrigger className="bg-background/50" data-testid="select-player-role">
                          <SelectValue placeholder="-- Seleziona --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Portiere">Portiere</SelectItem>
                          <SelectItem value="Difensore Centrale">Difensore Centrale</SelectItem>
                          <SelectItem value="Centrale Destro">Centrale Destro</SelectItem>
                          <SelectItem value="Centrale Sinistro">Centrale Sinistro</SelectItem>
                          <SelectItem value="Centrale Puro">Centrale Puro</SelectItem>
                          <SelectItem value="Libero">Libero</SelectItem>
                          <SelectItem value="Stopper">Stopper</SelectItem>
                          <SelectItem value="Terzino Destro">Terzino Destro</SelectItem>
                          <SelectItem value="Terzino Sinistro">Terzino Sinistro</SelectItem>
                          <SelectItem value="Terzino Destro d'Attacco">Terzino Destro d'Attacco</SelectItem>
                          <SelectItem value="Terzino Sinistro d'Attacco">Terzino Sinistro d'Attacco</SelectItem>
                          <SelectItem value="Falso Terzino">Falso Terzino</SelectItem>
                          <SelectItem value="Braccetto Destro">Braccetto Destro</SelectItem>
                          <SelectItem value="Braccetto Sinistro">Braccetto Sinistro</SelectItem>
                          <SelectItem value="Quinto Destro">Quinto Destro</SelectItem>
                          <SelectItem value="Quinto Sinistro">Quinto Sinistro</SelectItem>
                          <SelectItem value="Mediano">Mediano</SelectItem>
                          <SelectItem value="Regista">Regista</SelectItem>
                          <SelectItem value="Centrocampista Centrale">Centrocampista Centrale</SelectItem>
                          <SelectItem value="Centrocampista Destro">Centrocampista Destro</SelectItem>
                          <SelectItem value="Centrocampista Sinistro">Centrocampista Sinistro</SelectItem>
                          <SelectItem value="Mezzala Destra">Mezzala Destra</SelectItem>
                          <SelectItem value="Mezzala Sinistra">Mezzala Sinistra</SelectItem>
                          <SelectItem value="Interno Destro">Interno Destro</SelectItem>
                          <SelectItem value="Interno Sinistro">Interno Sinistro</SelectItem>
                          <SelectItem value="Tornante Destro">Tornante Destro</SelectItem>
                          <SelectItem value="Tornante Sinistro">Tornante Sinistro</SelectItem>
                          <SelectItem value="Ala Destra">Ala Destra</SelectItem>
                          <SelectItem value="Ala Sinistra">Ala Sinistra</SelectItem>
                          <SelectItem value="Trequartista">Trequartista</SelectItem>
                          <SelectItem value="Trequartista Centrale">Trequartista Centrale</SelectItem>
                          <SelectItem value="Trequartista Destro">Trequartista Destro</SelectItem>
                          <SelectItem value="Trequartista Sinistro">Trequartista Sinistro</SelectItem>
                          <SelectItem value="Attaccante">Attaccante</SelectItem>
                          <SelectItem value="Ala Invertita Destra">Ala Invertita Destra</SelectItem>
                          <SelectItem value="Ala Invertita Sinistra">Ala Invertita Sinistra</SelectItem>
                          <SelectItem value="Esterno Alto Destro">Esterno Alto Destro</SelectItem>
                          <SelectItem value="Esterno Alto Sinistro">Esterno Alto Sinistro</SelectItem>
                          <SelectItem value="Attaccante Esterno Destro">Attaccante Esterno Destro</SelectItem>
                          <SelectItem value="Attaccante Esterno Sinistro">Attaccante Esterno Sinistro</SelectItem>
                          <SelectItem value="Seconda Punta">Seconda Punta</SelectItem>
                          <SelectItem value="Prima Punta">Prima Punta</SelectItem>
                          <SelectItem value="Punta Centrale">Punta Centrale</SelectItem>
                          <SelectItem value="Centravanti">Centravanti</SelectItem>
                          <SelectItem value="Falso Nueve">Falso Nueve</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleSaveBasicInfo} 
                      className="w-full bg-accent hover:bg-accent/90"
                      data-testid="button-save-basic-info"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salva Nome e Ruolo
                    </Button>
                  </CardContent>
                </Card>

                {/* Number */}
                <Card className="w-full bg-secondary/30 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-primary">Modifica Numero Maglia</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Input
                      type="number"
                      value={number}
                      onChange={(e) => setNumber(e.target.value ? parseInt(e.target.value) : '')}
                      placeholder="N° Maglia"
                      className="bg-background/50"
                      data-testid="input-player-number"
                    />
                    <Button 
                      onClick={handleSaveNumber} 
                      className="w-full bg-accent hover:bg-accent/90"
                      data-testid="button-save-number"
                    >
                      Salva Numero
                    </Button>
                  </CardContent>
                </Card>

                {/* Gestione Presenze */}
                <Card className="w-full mt-4 bg-secondary/30 border-pink-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-pink-400">📋 Gestione Presenze</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3 text-xs text-pink-300">
                      ℹ️ <strong>Effetto eliminazione:</strong> Rimuovere una presenza influisce sul <strong>Weekly Planner</strong> (evidenziazioni bordi: giallo=infortuni, blu=&lt;2 presenze)
                    </div>
                    {playerAttendances.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nessuna presenza registrata</p>
                    ) : (
                      <div className="space-y-2">
                        {playerAttendances
                          .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .slice(0, 10)
                          .map((att: any) => (
                            <div key={att.id} className="flex items-center justify-between bg-background/50 rounded-lg p-3 border border-border/30">
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-muted-foreground">{new Date(att.date).toLocaleDateString('it-IT')}</span>
                                <span className={`text-sm font-semibold ${
                                  att.status === 'Presente' ? 'text-green-400' : 
                                  att.status === 'Assente' ? 'text-red-400' : 
                                  'text-yellow-400'
                                }`}>
                                  {att.status === 'Presente' ? '✅ Presente' : 
                                   att.status === 'Assente' ? '❌ Assente' : 
                                   '🤕 Infortunato'}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteAttendanceMutation.mutate(att.id)}
                                disabled={deleteAttendanceMutation.isPending}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                data-testid={`button-delete-attendance-${att.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Statistiche Match */}
                <Card className="w-full mt-4 bg-secondary/30 border-cyan-500/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-cyan-400">⚽ Statistiche Match</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {playerEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nessun evento registrato</p>
                    ) : (
                      <div className="space-y-2">
                        {playerEvents
                          .sort((a: any, b: any) => b.id - a.id)
                          .map((event: any) => (
                            <div key={event.id} className="flex items-center justify-between bg-background/50 rounded-lg p-3 border border-border/30">
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-semibold ${
                                  event.eventType === 'Gol' ? 'text-green-400' : 
                                  event.eventType === 'Cartellino Giallo' ? 'text-yellow-400' : 
                                  event.eventType === 'Cartellino Rosso' ? 'text-red-400' : 
                                  'text-cyan-400'
                                }`}>
                                  {event.eventType === 'Gol' ? '⚽' : 
                                   event.eventType === 'Assist' ? '🎯' :
                                   event.eventType === 'Cartellino Giallo' ? '🟨' : 
                                   event.eventType === 'Cartellino Rosso' ? '🟥' : 
                                   '📝'} {event.eventType}
                                </span>
                                <span className="text-sm text-muted-foreground">{event.minute}'</span>
                                {event.description && <span className="text-xs text-muted-foreground">({event.description})</span>}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteEventMutation.mutate(event.id)}
                                disabled={deleteEventMutation.isPending}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                data-testid={`button-delete-event-${event.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Position */}
                {player.position && (
                  <Card className="w-full mt-4 bg-secondary/30 border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg text-primary">Posizione Principale in Campo</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center">
                      <div className="inline-block bg-green-900/30 border border-green-600/50 rounded-lg p-6 mb-2">
                        <div className="w-24 h-32 bg-green-800/50 border-2 border-green-400/50 rounded relative">
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/50"></div>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-center">{player.position}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Role specializations */}
                <Card className="w-full mt-4 bg-secondary/30 border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-lg text-primary">Specializzazione Ruoli (100% Totale)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const totalPercentage = Object.values(editingRoles).reduce((sum, val) => sum + val, 0);
                      const circumference = 2 * Math.PI * 32;
                      const offset = circumference - (totalPercentage / 100) * circumference;
                      
                      return (
                        <>
                          <div className="flex items-center justify-center mb-4">
                            <div className="relative w-20 h-20">
                              <svg className="transform -rotate-90 w-20 h-20">
                                <circle
                                  cx="40"
                                  cy="40"
                                  r="32"
                                  stroke="currentColor"
                                  strokeWidth="8"
                                  fill="transparent"
                                  className="text-muted"
                                />
                                <circle
                                  cx="40"
                                  cy="40"
                                  r="32"
                                  stroke="currentColor"
                                  strokeWidth="8"
                                  fill="transparent"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={offset}
                                  className={totalPercentage === 100 ? "text-primary" : "text-yellow-500"}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className={`text-xl font-bold ${totalPercentage === 100 ? "text-primary" : "text-yellow-500"}`}>
                                  {totalPercentage}%
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Lista ruoli correnti */}
                          {Object.entries(editingRoles).map(([role, percentage]) => (
                            <div key={role} className="flex items-center justify-between mb-2 bg-background/50 p-2 rounded">
                              <span className="text-sm text-muted-foreground">{role}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{percentage}%</Badge>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveRole(role)}
                                  className="h-6 w-6 p-0"
                                  data-testid={`button-remove-role-${role}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ))}

                          {Object.keys(editingRoles).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center mb-4">Nessun ruolo assegnato</p>
                          )}
                          
                          {/* Aggiungi nuovo ruolo */}
                          <div className="mt-4 pt-4 border-t border-border/50 space-y-3">
                            <label className="text-sm font-medium mb-2 block text-primary">Aggiungi Ruolo</label>
                            <Select value={selectedRole} onValueChange={setSelectedRole}>
                              <SelectTrigger className="bg-background/50" data-testid="select-add-role">
                                <SelectValue placeholder="Seleziona ruolo" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Portiere">Portiere</SelectItem>
                                <SelectItem value="Difensore Centrale">Difensore Centrale</SelectItem>
                                <SelectItem value="Centrale Destro">Centrale Destro</SelectItem>
                                <SelectItem value="Centrale Sinistro">Centrale Sinistro</SelectItem>
                                <SelectItem value="Centrale Puro">Centrale Puro</SelectItem>
                                <SelectItem value="Libero">Libero</SelectItem>
                                <SelectItem value="Stopper">Stopper</SelectItem>
                                <SelectItem value="Terzino Destro">Terzino Destro</SelectItem>
                                <SelectItem value="Terzino Sinistro">Terzino Sinistro</SelectItem>
                                <SelectItem value="Terzino Destro d'Attacco">Terzino Destro d'Attacco</SelectItem>
                                <SelectItem value="Terzino Sinistro d'Attacco">Terzino Sinistro d'Attacco</SelectItem>
                                <SelectItem value="Falso Terzino">Falso Terzino</SelectItem>
                                <SelectItem value="Braccetto Destro">Braccetto Destro</SelectItem>
                                <SelectItem value="Braccetto Sinistro">Braccetto Sinistro</SelectItem>
                                <SelectItem value="Quinto Destro">Quinto Destro</SelectItem>
                                <SelectItem value="Quinto Sinistro">Quinto Sinistro</SelectItem>
                                <SelectItem value="Mediano">Mediano</SelectItem>
                                <SelectItem value="Regista">Regista</SelectItem>
                                <SelectItem value="Centrocampista Centrale">Centrocampista Centrale</SelectItem>
                                <SelectItem value="Centrocampista Destro">Centrocampista Destro</SelectItem>
                                <SelectItem value="Centrocampista Sinistro">Centrocampista Sinistro</SelectItem>
                                <SelectItem value="Mezzala Destra">Mezzala Destra</SelectItem>
                                <SelectItem value="Mezzala Sinistra">Mezzala Sinistra</SelectItem>
                                <SelectItem value="Interno Destro">Interno Destro</SelectItem>
                                <SelectItem value="Interno Sinistro">Interno Sinistro</SelectItem>
                                <SelectItem value="Tornante Destro">Tornante Destro</SelectItem>
                                <SelectItem value="Tornante Sinistro">Tornante Sinistro</SelectItem>
                                <SelectItem value="Ala Destra">Ala Destra</SelectItem>
                                <SelectItem value="Ala Sinistra">Ala Sinistra</SelectItem>
                                <SelectItem value="Trequartista">Trequartista</SelectItem>
                                <SelectItem value="Trequartista Centrale">Trequartista Centrale</SelectItem>
                                <SelectItem value="Trequartista Destro">Trequartista Destro</SelectItem>
                                <SelectItem value="Trequartista Sinistro">Trequartista Sinistro</SelectItem>
                                <SelectItem value="Attaccante">Attaccante</SelectItem>
                                <SelectItem value="Ala Invertita Destra">Ala Invertita Destra</SelectItem>
                                <SelectItem value="Ala Invertita Sinistra">Ala Invertita Sinistra</SelectItem>
                                <SelectItem value="Esterno Alto Destro">Esterno Alto Destro</SelectItem>
                                <SelectItem value="Esterno Alto Sinistro">Esterno Alto Sinistro</SelectItem>
                                <SelectItem value="Attaccante Esterno Destro">Attaccante Esterno Destro</SelectItem>
                                <SelectItem value="Attaccante Esterno Sinistro">Attaccante Esterno Sinistro</SelectItem>
                                <SelectItem value="Seconda Punta">Seconda Punta</SelectItem>
                                <SelectItem value="Prima Punta">Prima Punta</SelectItem>
                                <SelectItem value="Punta Centrale">Punta Centrale</SelectItem>
                                <SelectItem value="Centravanti">Centravanti</SelectItem>
                                <SelectItem value="Falso Nueve">Falso Nueve</SelectItem>
                              </SelectContent>
                            </Select>

                            <div>
                              <label className="text-sm font-medium mb-1 block">Percentuale %</label>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                value={rolePercentage || ''}
                                onChange={(e) => setRolePercentage(e.target.value ? parseInt(e.target.value) : 0)}
                                className="bg-background/50"
                                placeholder="Es: 60"
                                data-testid="input-role-percentage"
                              />
                            </div>

                            <Button
                              onClick={handleAddRole}
                              className="w-full bg-cyan-500 hover:bg-cyan-600"
                              data-testid="button-add-role"
                            >
                              Aggiungi Ruolo
                            </Button>
                          </div>

                          <Button
                            onClick={handleSaveRoles}
                            className="w-full bg-accent hover:bg-accent/90 mt-4"
                            data-testid="button-save-roles"
                            disabled={updatePlayerMutation.isPending}
                          >
                            <Save className="w-4 h-4 mr-2" />
                            Salva Specializzazioni
                          </Button>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Formation Positions Editor */}
                {player && (
                  <div className="mt-4">
                    <MiniFieldPositionEditor
                      currentPositions={player.formationPositions || {}}
                      onSave={async (positions) => {
                        try {
                          await apiRequest('PATCH', `/api/players/${id}`, { formationPositions: positions });
                          queryClient.invalidateQueries({ queryKey: [`/api/players/${id}`] });
                          toast({ title: "✅ Posizioni formazioni salvate" });
                        } catch (error) {
                          toast({ 
                            title: "❌ Errore", 
                            description: "Impossibile salvare le posizioni", 
                            variant: "destructive" 
                          });
                        }
                      }}
                      playerRole={player.role || undefined}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column - registry and stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Anagrafica & Documenti */}
            <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
              <CardHeader>
                <CardTitle className="text-primary">Anagrafica & Documenti (Amministrazione)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Data di Nascita</label>
                  <Input
                    type="date"
                    value={dataNascita}
                    onChange={(e) => setDataNascita(e.target.value)}
                    className="bg-background/50"
                    data-testid="input-data-nascita"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo Documento</label>
                  <Select value={tipoDocumento} onValueChange={setTipoDocumento}>
                    <SelectTrigger className="bg-background/50" data-testid="select-tipo-documento">
                      <SelectValue placeholder="-- Seleziona --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="carta_identita">Carta d'Identità</SelectItem>
                      <SelectItem value="patente">Patente</SelectItem>
                      <SelectItem value="passaporto">Passaporto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Numero Documento</label>
                  <Input
                    value={numeroDocumento}
                    onChange={(e) => setNumeroDocumento(e.target.value)}
                    placeholder="Numero Documento"
                    className="bg-background/50"
                    data-testid="input-numero-documento"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Note Personali</label>
                  <Textarea
                    value={notePersonali}
                    onChange={(e) => setNotePersonali(e.target.value)}
                    placeholder="Es: Importato da Mister. Ruolo principale: Difensore Centrale (100%)."
                    className="bg-background/50 min-h-[100px]"
                    data-testid="textarea-note-personali"
                  />
                </div>
                <Button 
                  onClick={handleSaveRegistry} 
                  className="w-full bg-accent hover:bg-accent/90"
                  data-testid="button-save-registry"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Salva Dati Anagrafici
                </Button>
              </CardContent>
            </Card>

            {/* Analisi Giocatore */}
            {stats && (
              <Card className="bg-card/50 backdrop-blur-sm border-primary/20">
                <CardHeader>
                  <CardTitle className="text-primary text-2xl">📊 Analisi Giocatore</CardTitle>
                  <p className="text-sm text-muted-foreground">Statistiche complete da allenamenti e partite</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Allenamenti */}
                  <div>
                    <h3 className="text-lg font-bold text-primary mb-3">📅 Allenamenti</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="bg-green-500/10 border-green-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-green-400">{stats.presenti}</p>
                          <p className="text-xs text-muted-foreground mt-1">Presenti</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-500/10 border-red-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-red-400">{stats.assenti}</p>
                          <p className="text-xs text-muted-foreground mt-1">Assenti</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-yellow-500/10 border-yellow-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-yellow-400">{stats.infortuni}</p>
                          <p className="text-xs text-muted-foreground mt-1">Infortuni</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Convocazioni e Partite */}
                  <div>
                    <h3 className="text-lg font-bold text-primary mb-3">🏆 Convocazioni e Partite</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <Card className="bg-primary/10 border-primary/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-primary">{stats.partiteTotali}</p>
                          <p className="text-xs text-muted-foreground mt-1">Partite Totali</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-cyan-500/10 border-cyan-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-cyan-400">{stats.convocazioniTitolare}</p>
                          <p className="text-xs text-muted-foreground mt-1">Da Titolare</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-500/10 border-blue-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-blue-400">{stats.convocazioniPanchina}</p>
                          <p className="text-xs text-muted-foreground mt-1">Da Panchina</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-purple-500/10 border-purple-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-purple-400">{stats.minutiGiocati}'</p>
                          <p className="text-xs text-muted-foreground mt-1">Minuti Giocati</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Eventi Partita */}
                  <div>
                    <h3 className="text-lg font-bold text-primary mb-3">⚽ Eventi Partita</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <Card className="bg-green-500/10 border-green-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-green-400">{stats.gol}</p>
                          <p className="text-xs text-muted-foreground mt-1">Gol</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-cyan-500/10 border-cyan-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-cyan-400">{stats.assist}</p>
                          <p className="text-xs text-muted-foreground mt-1">Assist</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-orange-500/10 border-orange-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-orange-400">{stats.rigori}</p>
                          <p className="text-xs text-muted-foreground mt-1">Rigori</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-yellow-500/10 border-yellow-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-yellow-400">{stats.gialli}</p>
                          <p className="text-xs text-muted-foreground mt-1">Cartellini Gialli</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-500/10 border-red-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-red-400">{stats.rossi}</p>
                          <p className="text-xs text-muted-foreground mt-1">Cartellini Rossi</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-blue-500/10 border-blue-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-blue-400">{stats.corner}</p>
                          <p className="text-xs text-muted-foreground mt-1">Corner</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Sostituzioni */}
                  <div>
                    <h3 className="text-lg font-bold text-primary mb-3">🔄 Sostituzioni</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="bg-green-500/10 border-green-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-green-400">{stats.sostituzioniEntra}</p>
                          <p className="text-xs text-muted-foreground mt-1">Entrato</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-red-500/10 border-red-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-red-400">{stats.sostituzioniEsce}</p>
                          <p className="text-xs text-muted-foreground mt-1">Uscito</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-yellow-500/10 border-yellow-500/30">
                        <CardContent className="pt-4 text-center">
                          <p className="text-3xl font-bold text-yellow-400">{stats.fuorigioco}</p>
                          <p className="text-xs text-muted-foreground mt-1">Fuorigioco</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
