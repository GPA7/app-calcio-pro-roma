import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Eye, Calendar } from 'lucide-react';
import type { TacticalSetup, MatchSession } from '@shared/schema';

export default function TattichePage() {
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSetup, setSelectedSetup] = useState<TacticalSetup | null>(null);

  // Fetch all tactical setups
  const { data: setups = [], isLoading } = useQuery<TacticalSetup[]>({
    queryKey: ['/api/tactical-setups'],
  });

  // Fetch all matches for opponent names
  const { data: matches = [] } = useQuery<MatchSession[]>({
    queryKey: ['/api/matches'],
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/tactical-setups/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tactical-setups'] });
      toast({
        title: '✅ Tattica eliminata',
        description: 'Il setup tattico è stato rimosso',
      });
      setDeleteDialogOpen(false);
      setSelectedSetup(null);
    },
    onError: () => {
      toast({
        title: '❌ Errore',
        description: 'Impossibile eliminare il setup tattico',
        variant: 'destructive',
      });
    },
  });

  const handleDeleteClick = (setup: TacticalSetup) => {
    setSelectedSetup(setup);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedSetup) {
      deleteMutation.mutate(selectedSetup.id);
    }
  };

  // Get match opponent by matchId
  const getMatchOpponent = (matchId: number): string => {
    const match = matches.find(m => m.id === matchId);
    return match?.opponent || 'Partita sconosciuta';
  };

  // Group setups by match
  const setupsByMatch = setups.reduce((acc, setup) => {
    const matchId = setup.matchId;
    if (!acc[matchId]) {
      acc[matchId] = [];
    }
    acc[matchId].push(setup);
    return acc;
  }, {} as Record<number, TacticalSetup[]>);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Caricamento tattiche...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">📋 Gestione Tattiche</h1>
              <p className="text-muted-foreground mt-1">
                Visualizza ed elimina setup tattici salvati
              </p>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {setups.length} {setups.length === 1 ? 'Tattica' : 'Tattiche'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {setups.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl font-semibold mb-2">Nessuna tattica salvata</p>
              <p>Crea e salva tattiche dalla pagina Formazioni per vederle qui</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(setupsByMatch).map(([matchId, matchSetups]) => (
              <Card key={matchId}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    {getMatchOpponent(parseInt(matchId))}
                    <Badge variant="secondary" className="ml-2">
                      {matchSetups.length} {matchSetups.length === 1 ? 'tattica' : 'tattiche'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {matchSetups.map((setup) => (
                      <Card key={setup.id} className="hover-elevate">
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div>
                              <h3 className="font-semibold text-lg">{setup.name}</h3>
                              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                {setup.formationSystem && (
                                  <Badge variant="outline">{setup.formationSystem}</Badge>
                                )}
                                <span>
                                  {new Date(setup.createdAt).toLocaleDateString('it-IT')}
                                </span>
                                <span>
                                  {new Date(setup.createdAt).toLocaleTimeString('it-IT', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>

                            {setup.tacticalOptions && (
                              <div className="space-y-1">
                                {setup.tacticalOptions.goalkeeper !== 'none' && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">🥅 Portiere: </span>
                                    <span className="font-medium">
                                      {setup.tacticalOptions.goalkeeper}
                                    </span>
                                  </div>
                                )}
                                {setup.tacticalOptions.defense !== 'none' && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">🛡️ Difesa: </span>
                                    <span className="font-medium">
                                      {setup.tacticalOptions.defense}
                                    </span>
                                  </div>
                                )}
                                {setup.tacticalOptions.midfield !== 'none' && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">⚙️ Centrocampo: </span>
                                    <span className="font-medium">
                                      {setup.tacticalOptions.midfield}
                                    </span>
                                  </div>
                                )}
                                {setup.tacticalOptions.attack !== 'none' && (
                                  <div className="text-xs">
                                    <span className="text-muted-foreground">⚽ Attacco: </span>
                                    <span className="font-medium">
                                      {setup.tacticalOptions.attack}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex gap-2 pt-2 border-t">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteClick(setup)}
                                className="flex-1"
                                data-testid={`button-delete-setup-${setup.id}`}
                              >
                                <Trash2 className="w-4 h-4 mr-1" />
                                Elimina
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare il setup tattico{' '}
              <strong>&quot;{selectedSetup?.name}&quot;</strong>?
              <br />
              <br />
              Questa azione è irreversibile.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              data-testid="button-cancel-delete"
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? 'Eliminazione...' : 'Elimina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
