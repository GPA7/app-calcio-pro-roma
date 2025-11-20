import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Player } from "@shared/schema";

interface PlayerEditDialogProps {
  player: Player;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getPlayerInitial = (lastName: string): string => {
  return lastName.charAt(0).toUpperCase();
};

const AVAILABLE_ROLES = [
  // PORTIERE
  "Portiere",
  
  // DIFENSORI - Difesa a 4
  "Difensore Centrale",
  "Centrale Destro",
  "Centrale Sinistro",
  "Centrale Puro",
  "Libero",
  "Stopper",
  "Terzino Destro",
  "Terzino Sinistro",
  "Terzino Destro d'Attacco",
  "Terzino Sinistro d'Attacco",
  "Falso Terzino",
  
  // DIFENSORI - Difesa a 3
  "Braccetto Destro",
  "Braccetto Sinistro",
  "Quinto Destro",
  "Quinto Sinistro",
  
  // CENTROCAMPISTI
  "Mediano",
  "Regista",
  "Centrocampista Centrale",
  "Centrocampista Destro",
  "Centrocampista Sinistro",
  "Mezzala Destra",
  "Mezzala Sinistra",
  "Interno Destro",
  "Interno Sinistro",
  "Tornante Destro",
  "Tornante Sinistro",
  "Ala Destra",
  "Ala Sinistra",
  
  // TREQUARTISTI
  "Trequartista",
  "Trequartista Centrale",
  "Trequartista Destro",
  "Trequartista Sinistro",
  
  // ATTACCANTI
  "Attaccante",
  "Ala Invertita Destra",
  "Ala Invertita Sinistra",
  "Esterno Alto Destro",
  "Esterno Alto Sinistro",
  "Attaccante Esterno Destro",
  "Attaccante Esterno Sinistro",
  "Seconda Punta",
  "Prima Punta",
  "Punta Centrale",
  "Centravanti",
  "Falso Nueve",
];

const getJerseyColor = (number?: number | null) => {
  if (!number) return 'from-gray-500 to-gray-600';
  
  const colors = [
    'from-yellow-400 to-yellow-500',
    'from-blue-500 to-blue-600',
    'from-red-500 to-red-600',
    'from-green-500 to-green-600',
    'from-purple-500 to-purple-600',
    'from-cyan-500 to-cyan-600',
    'from-pink-500 to-pink-600',
    'from-orange-500 to-orange-600',
  ];
  return colors[number % colors.length];
};

export default function PlayerEditDialog({ player, open, onOpenChange }: PlayerEditDialogProps) {
  const { toast } = useToast();
  const [editedFirstName, setEditedFirstName] = useState(player.firstName);
  const [editedLastName, setEditedLastName] = useState(player.lastName);
  const [editedNumber, setEditedNumber] = useState(player.number || undefined);
  const [editedRole, setEditedRole] = useState(player.role || "");
  const [editedPosition, setEditedPosition] = useState(player.position || "");
  const [editedRoles, setEditedRoles] = useState<Record<string, number>>(player.roleSpecializations || {});
  const [editedPhotoUrl, setEditedPhotoUrl] = useState(player.photoUrl || "");
  const [editedYellowCards, setEditedYellowCards] = useState(player.yellowCards || 0);
  const [editedRedCards, setEditedRedCards] = useState(player.redCards || 0);
  const [editedSuspensionDays, setEditedSuspensionDays] = useState(player.suspensionDays || 0);

  useEffect(() => {
    setEditedFirstName(player.firstName);
    setEditedLastName(player.lastName);
    setEditedNumber(player.number || undefined);
    setEditedRole(player.role || "");
    setEditedPosition(player.position || "");
    setEditedRoles(player.roleSpecializations || {});
    setEditedPhotoUrl(player.photoUrl || "");
    setEditedYellowCards(player.yellowCards || 0);
    setEditedRedCards(player.redCards || 0);
    setEditedSuspensionDays(player.suspensionDays || 0);
  }, [player]);

  const { data: allAttendances = [] } = useQuery<any[]>({
    queryKey: ['/api/attendances'],
  });

  const playerAttendances = allAttendances.filter((att: any) => att.playerId === player.id);

  const { data: playerEvents = [] } = useQuery<any[]>({
    queryKey: [`/api/match-events/player/${player.id}`],
  });

  const deleteAttendanceMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/attendances/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendances'] });
      toast({ title: "✅ Presenza eliminata" });
    },
    onError: () => {
      toast({ title: "Errore durante l'eliminazione", variant: "destructive" });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/match-events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/match-events/player/${player.id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/matches/all-events'] });
      toast({ title: "✅ Evento eliminato" });
    },
    onError: () => {
      toast({ title: "Errore durante l'eliminazione", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => apiRequest('PUT', `/api/players/${player.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/players'] });
      toast({ title: "✅ Modifiche salvate" });
    },
    onError: () => {
      toast({ title: "Errore durante l'aggiornamento", variant: "destructive" });
    },
  });

  const handleSaveNumber = () => {
    if (!editedFirstName.trim() || !editedLastName.trim()) {
      toast({ title: "Nome e cognome sono obbligatori", variant: "destructive" });
      return;
    }
    
    updateMutation.mutate({ 
      firstName: editedFirstName,
      lastName: editedLastName,
      number: editedNumber,
      role: editedRole,
      position: player.position,
      roleSpecializations: player.roleSpecializations,
      photoUrl: editedPhotoUrl,
      yellowCards: editedYellowCards,
      redCards: editedRedCards,
      suspensionDays: editedSuspensionDays
    });
  };

  const handleSavePosition = () => {
    updateMutation.mutate({ 
      firstName: player.firstName,
      lastName: player.lastName,
      number: player.number,
      position: editedPosition,
      roleSpecializations: player.roleSpecializations
    });
  };

  const handleSaveRoles = () => {
    const totalPercentage = Object.values(editedRoles).reduce((sum, val) => sum + val, 0);
    if (Object.keys(editedRoles).length > 0 && totalPercentage !== 100) {
      toast({ title: "Le percentuali devono sommare al 100%", variant: "destructive" });
      return;
    }

    updateMutation.mutate({ 
      firstName: player.firstName,
      lastName: player.lastName,
      number: player.number,
      position: player.position,
      roleSpecializations: editedRoles
    });
  };

  const jerseyColors = getJerseyColor(editedNumber);
  const initial = getPlayerInitial(editedLastName);
  const totalPercentage = Object.values(editedRoles).reduce((sum, val) => sum + val, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-[#1a1a2e] border-border/30" data-testid="dialog-edit-player">
        <DialogHeader>
          <DialogTitle className="sr-only">Modifica Dettagli Giocatore</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Header: Jersey + Avatar + Name + ID */}
          <div className="flex flex-col items-center gap-4 p-6 bg-card/30 rounded-xl border border-border/30">
            <div className="flex items-center gap-4">
              {/* Jersey */}
              <div className={`w-20 h-24 bg-gradient-to-br ${jerseyColors} rounded-lg shadow-lg flex items-center justify-center relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="text-4xl font-black text-white drop-shadow-lg z-10">
                  {editedNumber || '?'}
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-3 bg-black/20 rounded-b-lg"></div>
                <div className="absolute top-1 left-1/2 -translate-x-1/2 w-1/3 text-center text-[8px] font-bold text-red-600 z-20">
                  PLAYER
                </div>
              </div>

              {/* Avatar Circle */}
              <Avatar className="h-20 w-20 border-4 border-white/20">
                {editedPhotoUrl && <AvatarImage src={editedPhotoUrl} alt={`${editedLastName} ${editedFirstName}`} />}
                <AvatarFallback className="bg-gradient-to-br from-yellow-600 to-yellow-700 text-white text-3xl font-bold">
                  {initial}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Name */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">{editedLastName}</h2>
              <p className="text-xs text-muted-foreground mt-1">ID: {player.id.toString().padStart(8, 'mgqd5fl')}</p>
            </div>
          </div>

          {/* PRIORITÀ: Gestione Presenze */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-pink-400">📋 Gestione Presenze</h3>
            <div className="bg-pink-500/10 border border-pink-500/30 rounded-lg p-3 text-xs text-pink-300">
              ℹ️ <strong>Effetto eliminazione:</strong> Rimuovere una presenza influisce sul <strong>Weekly Planner</strong> (evidenziazioni bordi: giallo=infortuni, blu=&lt;2 presenze)
            </div>
            <div className="bg-card/30 rounded-xl border border-border/30 p-4 space-y-3">
              {playerAttendances.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nessuna presenza registrata</p>
              ) : (
                <div className="space-y-2">
                  {playerAttendances
                    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 10)
                    .map((att: any) => (
                      <div key={att.id} className="flex items-center justify-between bg-[#0f0f1e] rounded-lg p-3 border border-border/30">
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
            </div>
          </div>

          {/* PRIORITÀ: Statistiche Match */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-cyan-400">⚽ Statistiche Match</h3>
            <div className="bg-card/30 rounded-xl border border-border/30 p-4 space-y-3">
              {playerEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nessun evento registrato</p>
              ) : (
                <div className="space-y-2">
                  {playerEvents
                    .sort((a: any, b: any) => b.id - a.id)
                    .map((event: any) => (
                      <div key={event.id} className="flex items-center justify-between bg-[#0f0f1e] rounded-lg p-3 border border-border/30">
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
            </div>
          </div>

          {/* Section 1: Modifica Dati Giocatore */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-pink-400">Modifica Dati Giocatore</h3>
            <div className="bg-card/30 rounded-xl border border-border/30 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm text-muted-foreground">Nome:</Label>
                  <Input
                    type="text"
                    value={editedFirstName}
                    onChange={(e) => setEditedFirstName(e.target.value)}
                    className="mt-2 bg-[#0f0f1e] border-border/50 text-white"
                    placeholder="Nome"
                    data-testid="input-player-firstname"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Cognome:</Label>
                  <Input
                    type="text"
                    value={editedLastName}
                    onChange={(e) => setEditedLastName(e.target.value)}
                    className="mt-2 bg-[#0f0f1e] border-border/50 text-white"
                    placeholder="Cognome"
                    data-testid="input-player-lastname"
                  />
                </div>
              </div>
              <div>
                <Label className="text-sm text-pink-400 font-semibold">📸 Foto Giocatore (URL):</Label>
                <Input
                  type="text"
                  value={editedPhotoUrl}
                  onChange={(e) => setEditedPhotoUrl(e.target.value)}
                  className="mt-2 bg-[#0f0f1e] border-pink-500/30 text-white"
                  placeholder="https://esempio.com/foto.jpg"
                  data-testid="input-player-photo"
                />
                <p className="text-xs text-muted-foreground mt-1">💡 Inserisci URL immagine (apparirà nell'avatar)</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">N° Maglia:</Label>
                <Input
                  type="number"
                  value={editedNumber || ''}
                  onChange={(e) => setEditedNumber(e.target.value ? parseInt(e.target.value) : undefined)}
                  className="mt-2 bg-[#0f0f1e] border-border/50 text-white text-center text-lg font-bold"
                  placeholder="Numero"
                  data-testid="input-player-number"
                />
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Ruolo Principale:</Label>
                <Select value={editedRole} onValueChange={setEditedRole}>
                  <SelectTrigger className="mt-2 bg-[#0f0f1e] border-border/50 text-white" data-testid="select-player-role">
                    <SelectValue placeholder="Seleziona ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Disciplina e Squalifiche */}
              <div className="pt-2 space-y-3 border-t border-border/30">
                <h4 className="text-sm font-bold text-yellow-400">🟨 Disciplina e Squalifiche</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Cartellini Gialli:</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editedYellowCards}
                      onChange={(e) => setEditedYellowCards(parseInt(e.target.value) || 0)}
                      className="mt-1 bg-[#0f0f1e] border-yellow-500/30 text-white text-center font-bold"
                      data-testid="input-player-yellow-cards"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cartellini Rossi:</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editedRedCards}
                      onChange={(e) => setEditedRedCards(parseInt(e.target.value) || 0)}
                      className="mt-1 bg-[#0f0f1e] border-red-500/30 text-white text-center font-bold"
                      data-testid="input-player-red-cards"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Giornate Squalifica:</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editedSuspensionDays}
                      onChange={(e) => setEditedSuspensionDays(parseInt(e.target.value) || 0)}
                      className="mt-1 bg-[#0f0f1e] border-orange-500/30 text-white text-center font-bold"
                      data-testid="input-player-suspension-days"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">💡 Le giornate squalifica scaleranno automaticamente dopo ogni domenica</p>
              </div>
              
              <Button
                onClick={handleSaveNumber}
                className="w-full bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 text-white font-bold py-6 rounded-xl"
                disabled={updateMutation.isPending}
                data-testid="button-save-number"
              >
                Salva Dati Giocatore
              </Button>
            </div>
          </div>

          {/* Section 2: Posizione Principale in Campo */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-cyan-400">Posizione Principale in Campo</h3>
            <div className="bg-card/30 rounded-xl border border-border/30 p-4 space-y-4">
              {/* Campo da calcio visivo - MOCKUP per ora */}
              <div className="relative w-full aspect-[2/3] bg-gradient-to-b from-green-700 to-green-800 rounded-lg p-4 border-2 border-white/20">
                {/* Linee del campo */}
                <div className="absolute inset-0 flex flex-col justify-between p-2">
                  {/* Porta superiore */}
                  <div className="h-8 border-2 border-white/60 rounded-t mx-auto" style={{width: '40%'}}></div>
                  {/* Linea di metà campo */}
                  <div className="border-t-2 border-white/40"></div>
                  {/* Cerchio centrale */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border-2 border-white/40 rounded-full"></div>
                  {/* Porta inferiore */}
                  <div className="h-8 border-2 border-white/60 rounded-b mx-auto" style={{width: '40%'}}></div>
                </div>
                
                {/* Marker posizione - esempio in posizione DC (Difensore Centrale) */}
                {editedPosition && (
                  <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="w-8 h-8 bg-red-600 rounded-full border-4 border-white shadow-lg"></div>
                  </div>
                )}
              </div>

              {/* Testo posizione selezionata */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {editedPosition || 'Clicca sul campo per selezionare'}
                </p>
              </div>

              <Button
                onClick={handleSavePosition}
                className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-bold py-6 rounded-xl"
                disabled={updateMutation.isPending}
                data-testid="button-save-position"
              >
                Salva Posizione
              </Button>
            </div>
          </div>

          {/* Section 3: Specializzazione Ruoli */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-cyan-400">Specializzazione Ruoli (100% Totale)</h3>
            <div className="bg-card/30 rounded-xl border border-border/30 p-4 space-y-4">
              {/* Circular progress - MOCKUP */}
              <div className="flex items-center justify-center gap-6 py-6">
                <div className="relative w-24 h-24">
                  {/* Cerchio esterno */}
                  <svg className="w-24 h-24 -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-700"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${totalPercentage * 2.51} 251`}
                      className="text-cyan-500"
                    />
                  </svg>
                  {/* Testo centrale */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{totalPercentage}%</span>
                  </div>
                </div>

                {/* Lista ruoli */}
                <div className="flex-1 space-y-2">
                  {Object.entries(editedRoles).map(([role, percentage]) => (
                    <div key={role} className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-white">{role}: {percentage}%</span>
                    </div>
                  ))}
                  {Object.keys(editedRoles).length === 0 && (
                    <p className="text-sm text-muted-foreground">Nessun ruolo assegnato</p>
                  )}
                </div>
              </div>

              {/* Pulsante Modifica Ruoli - placeholder */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full bg-transparent border-border/50 text-white"
                  data-testid="button-modify-roles"
                >
                  Modifica Ruoli
                </Button>
              </div>

              <Button
                onClick={handleSaveRoles}
                className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-bold py-6 rounded-xl"
                disabled={updateMutation.isPending}
                data-testid="button-save-roles"
              >
                Salva Modifiche Ruoli
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
