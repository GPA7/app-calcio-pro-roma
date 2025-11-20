import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calendar, CheckCircle2, XCircle, Activity, Edit, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Navigation } from "@/components/Navigation";
import PlayerEditDialog from "@/components/PlayerEditDialog";
import type { Player, TrainingAttendance, ATTENDANCE_STATUSES } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

type AttendanceStatus = typeof ATTENDANCE_STATUSES[number];

export default function AttendancePage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(() => {
    // Leggi il parametro 'date' dall'URL (es. /presenze?date=2025-10-08)
    const urlParams = new URLSearchParams(window.location.search);
    const dateParam = urlParams.get('date');
    
    // Se c'è un parametro date valido, usalo; altrimenti usa la data odierna
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      return dateParam;
    }
    
    return new Date().toISOString().split('T')[0];
  });
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showSavedTrainings, setShowSavedTrainings] = useState(false);

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['/api/players'],
  });

  const { data: attendances = [] } = useQuery<TrainingAttendance[]>({
    queryKey: ['/api/attendances', selectedDate],
    enabled: !!selectedDate,
  });

  const { data: trainingSessions = [] } = useQuery<{ date: string; presenti: number; assenti: number; infortunati: number; totale: number }[]>({
    queryKey: ['/api/admin/training-sessions'],
  });

  const saveAttendanceMutation = useMutation({
    mutationFn: (data: { playerId: number; status: AttendanceStatus }) => 
      apiRequest('POST', '/api/attendances', {
        date: selectedDate,
        playerId: data.playerId,
        status: data.status,
        notes: null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendances', selectedDate] });
    },
  });

  const deleteTrainingMutation = useMutation({
    mutationFn: (date: string) => apiRequest('DELETE', `/api/admin/training-sessions/${date}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/training-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendances'] });
      toast({ title: "✅ Allenamento eliminato" });
    },
    onError: () => {
      toast({ title: "Errore durante l'eliminazione", variant: "destructive" });
    }
  });

  // Crea mappa dalle presenze esistenti
  const attendanceMap: Record<number, AttendanceStatus> = {};
  attendances.forEach(att => {
    attendanceMap[att.playerId] = att.status as AttendanceStatus;
  });

  const handleStatusChange = async (playerId: number, status: AttendanceStatus) => {
    await saveAttendanceMutation.mutateAsync({ playerId, status });
  };

  const handleConfirm = () => {
    const total = players.length;
    const recorded = Object.keys(attendanceMap).length;
    
    // VINCOLO: Controlla se esiste già allenamento per questa data
    const existingTraining = trainingSessions.find(s => s.date === selectedDate);
    if (existingTraining) {
      toast({
        title: "❌ Data già utilizzata!",
        description: `Esiste già un allenamento per ${format(parseISO(selectedDate), 'd MMMM yyyy', { locale: it })}. Elimina quello esistente prima di salvare.`,
        variant: "destructive",
      });
      // Apri automaticamente la sezione allenamenti salvati
      setShowSavedTrainings(true);
      return;
    }
    
    if (recorded < total) {
      toast({
        title: "⚠️ Presenze incomplete",
        description: `Registrate ${recorded}/${total} presenze. Completa tutte le presenze prima di confermare.`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "✅ Allenamento confermato!",
      description: `Presenze registrate per ${total} giocatori il ${new Date(selectedDate).toLocaleDateString('it-IT')}`,
    });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/training-sessions'] });
  };

  const getStatusIcon = (status: AttendanceStatus) => {
    switch (status) {
      case 'Presente':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'Assente':
        return <XCircle className="h-5 w-5" />;
      case 'Infortunato':
        return <Activity className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status: AttendanceStatus) => {
    switch (status) {
      case 'Presente':
        return 'bg-green-600 hover:bg-green-700';
      case 'Assente':
        return 'bg-red-600 hover:bg-red-700';
      case 'Infortunato':
        return 'bg-yellow-600 hover:bg-yellow-700 text-black';
    }
  };

  const presentiCount = Object.values(attendanceMap).filter(s => s === 'Presente').length;
  const assentiCount = Object.values(attendanceMap).filter(s => s === 'Assente').length;
  const infortunatiCount = Object.values(attendanceMap).filter(s => s === 'Infortunato').length;

  // Sort players alphabetically by last name, then first name (Italian standard)
  const sortedPlayers = [...players].sort((a, b) => {
    const lastNameCompare = a.lastName.localeCompare(b.lastName, 'it');
    if (lastNameCompare !== 0) return lastNameCompare;
    return a.firstName.localeCompare(b.firstName, 'it');
  });

  // Find last registered training session
  const lastTrainingDate = trainingSessions.length > 0 
    ? trainingSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white">
      <Navigation />
      <div className="max-w-2xl mx-auto space-y-6 p-6">
        
        {/* Header con Data */}
        <Card className="border-primary/30 border-2 bg-gradient-to-br from-card/90 to-primary/5">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-3xl text-primary neon-glow-cyan flex items-center gap-3">
                <Calendar className="h-8 w-8" />
                Presenze Allenamento
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold">Data:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2 rounded-lg bg-background/50 border border-primary/30 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  data-testid="input-attendance-date"
                />
              </div>
              {selectedDate && (
                <p className="text-base font-semibold text-primary capitalize">
                  {format(parseISO(selectedDate), 'EEEE d MMMM yyyy', { locale: it })}
                </p>
              )}
              {lastTrainingDate && (
                <p className="text-sm text-muted-foreground">
                  Ultimo allenamento registrato: <span className="text-primary font-semibold">{format(parseISO(lastTrainingDate), 'd MMMM yyyy', { locale: it })}</span>
                </p>
              )}
            </div>

            {/* Contatori */}
            <div className="flex gap-3 flex-wrap">
              <Badge className="bg-green-600 text-white text-base px-4 py-2">
                ✅ Presenti: {presentiCount}
              </Badge>
              <Badge className="bg-red-600 text-white text-base px-4 py-2">
                ❌ Assenti: {assentiCount}
              </Badge>
              <Badge className="bg-yellow-600 text-black text-base px-4 py-2">
                🤕 Infortunati: {infortunatiCount}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Allenamenti Salvati - Collapsable */}
        <Collapsible open={showSavedTrainings} onOpenChange={setShowSavedTrainings}>
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-yellow-500/10 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-yellow-400 flex items-center gap-2">
                    📅 Allenamenti Salvati ({trainingSessions.length})
                  </CardTitle>
                  {showSavedTrainings ? <ChevronUp className="h-5 w-5 text-yellow-400" /> : <ChevronDown className="h-5 w-5 text-yellow-400" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {trainingSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nessun allenamento salvato</p>
                ) : (
                  <div className="space-y-2">
                    {trainingSessions
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((session) => {
                        const isCurrentDate = session.date === selectedDate;
                        return (
                          <div 
                            key={session.date}
                            className={`flex items-center justify-between p-3 rounded-lg border ${
                              isCurrentDate 
                                ? 'border-yellow-500 bg-yellow-500/20' 
                                : 'border-border/30 bg-background/30'
                            }`}
                          >
                            <div className="flex-1">
                              <p className="font-semibold text-foreground">
                                {format(parseISO(session.date), 'EEEE d MMMM yyyy', { locale: it })}
                                {isCurrentDate && <span className="ml-2 text-yellow-400 text-xs">← Data selezionata</span>}
                              </p>
                              <div className="flex gap-3 text-xs mt-1">
                                <span className="text-green-400">✅ {session.presenti}</span>
                                <span className="text-red-400">❌ {session.assenti}</span>
                                <span className="text-orange-400">🤕 {session.infortunati}</span>
                              </div>
                            </div>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Eliminare l'allenamento del ${format(parseISO(session.date), 'd MMMM yyyy', { locale: it })}?`)) {
                                  deleteTrainingMutation.mutate(session.date);
                                }
                              }}
                              disabled={deleteTrainingMutation.isPending}
                              className="gap-1"
                              data-testid={`button-delete-training-${session.date}`}
                            >
                              <Trash2 className="h-3 w-3" />
                              Elimina
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                )}
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mt-4">
                  <p className="text-xs text-yellow-300">
                    ⚠️ <strong>VINCOLO:</strong> Non puoi salvare due allenamenti con la stessa data. Se la data è già usata, elimina prima quello esistente.
                  </p>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Lista Giocatori */}
        <Card className="border-primary/30 border-2 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Rilevamento Presenze</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedPlayers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nessun giocatore in rosa
              </div>
            ) : (
              sortedPlayers.map((player) => {
                const currentStatus = attendanceMap[player.id];
                
                return (
                  <div
                    key={player.id}
                    className="p-4 rounded-lg border border-border/50 hover-elevate transition-neon bg-card/30"
                    data-testid={`player-attendance-${player.id}`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-lg truncate">
                          #{player.number} {player.lastName} {player.firstName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">{player.role}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingPlayer(player)}
                          className="gap-1 bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20"
                          data-testid={`button-edit-player-${player.id}`}
                        >
                          <Edit className="h-3 w-3" />
                          Modifica Dati
                        </Button>
                        {currentStatus && (
                          <Badge className={`${getStatusColor(currentStatus)} px-3 py-1 flex items-center gap-2`}>
                            {getStatusIcon(currentStatus)}
                            {currentStatus}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => handleStatusChange(player.id, 'Presente')}
                        className={`h-12 flex-col gap-1 ${
                          currentStatus === 'Presente' 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-green-600/30 hover:bg-green-600/50'
                        }`}
                        data-testid={`button-present-${player.id}`}
                      >
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-xs">Presente</span>
                      </Button>

                      <Button
                        onClick={() => handleStatusChange(player.id, 'Assente')}
                        className={`h-12 flex-col gap-1 ${
                          currentStatus === 'Assente' 
                            ? 'bg-red-600 hover:bg-red-700' 
                            : 'bg-red-600/30 hover:bg-red-600/50'
                        }`}
                        data-testid={`button-absent-${player.id}`}
                      >
                        <XCircle className="h-5 w-5" />
                        <span className="text-xs">Assente</span>
                      </Button>

                      <Button
                        onClick={() => handleStatusChange(player.id, 'Infortunato')}
                        className={`h-12 flex-col gap-1 ${
                          currentStatus === 'Infortunato' 
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-black' 
                            : 'bg-yellow-600/30 hover:bg-yellow-600/50'
                        }`}
                        data-testid={`button-injured-${player.id}`}
                      >
                        <Activity className="h-5 w-5" />
                        <span className="text-xs">Infortunato</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Bottone Conferma */}
        <Button
          onClick={handleConfirm}
          size="lg"
          className="w-full neon-glow-cyan text-xl py-8"
          disabled={Object.keys(attendanceMap).length === 0}
          data-testid="button-confirm-training"
        >
          <CheckCircle2 className="h-6 w-6 mr-3" />
          Conferma Allenamento
        </Button>
      </div>

      {/* Dialog Modifica Dati Giocatore Completo */}
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
