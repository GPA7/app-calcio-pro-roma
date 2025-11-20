import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, Shield, Target, Activity, Hand } from "lucide-react";
import { useLocation } from "wouter";
import type { Player } from "@shared/schema";

interface PlayerCardProps {
  player: Player;
  index: number;
  onEdit: (player: Player) => void;
  onDelete: (playerId: number) => void;
  isDeleting?: boolean;
  variant?: 'default' | 'compact';
  stats?: {
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
    matchesWon?: number;
    matchesDrawn?: number;
    matchesLost?: number;
    goalsConceded?: number;
  };
}

const getRoleIcon = (role?: string) => {
  if (!role) return null;
  
  const roleLower = role.toLowerCase();
  
  if (roleLower.includes('portiere')) {
    return <Hand className="h-4 w-4" />;
  } else if (roleLower.includes('difensor') || roleLower.includes('terzino') || roleLower.includes('centrale')) {
    return <Shield className="h-4 w-4" />;
  } else if (roleLower.includes('centrocampist') || roleLower.includes('mediano') || roleLower.includes('mezzala')) {
    return <Activity className="h-4 w-4" />;
  } else if (roleLower.includes('attacc') || roleLower.includes('punta') || roleLower.includes('ala') || roleLower.includes('trequartista')) {
    return <Target className="h-4 w-4" />;
  }
  
  return null;
};

const getRoleColor = (role?: string) => {
  if (!role) return 'bg-muted text-muted-foreground border-muted';
  
  const roleLower = role.toLowerCase();
  
  if (roleLower.includes('portiere')) {
    return 'bg-green-500/20 text-green-400 border-green-500/50';
  } else if (roleLower.includes('difensor') || roleLower.includes('terzino') || roleLower.includes('centrale')) {
    return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
  } else if (roleLower.includes('centrocampist') || roleLower.includes('mediano') || roleLower.includes('mezzala')) {
    return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50';
  } else if (roleLower.includes('attacc') || roleLower.includes('punta') || roleLower.includes('ala') || roleLower.includes('trequartista')) {
    return 'bg-pink-500/20 text-pink-400 border-pink-500/50';
  }
  
  return 'bg-muted text-muted-foreground border-muted';
};

export default function PlayerCard({ player, index, onEdit, onDelete, isDeleting, variant = 'default', stats }: PlayerCardProps) {
  const [, setLocation] = useLocation();
  const roleColor = getRoleColor(player.role || undefined);
  const RoleIcon = getRoleIcon(player.role || undefined);
  const displayName = `${player.lastName} ${player.firstName}`;
  
  const getPlayerInitials = () => {
    const firstName = player.firstName || '';
    const lastName = player.lastName || '';
    return `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}`;
  };

  return (
    <Card 
      className="border-border/50 transition-all duration-300 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/20 bg-card/90 backdrop-blur-sm overflow-hidden hover:-translate-y-1"
      data-testid={`player-card-${player.id}`}
    >
      <CardContent className="p-0">
        {/* Layout Verticale - Tall Card Format */}
        <div className="flex flex-col">
          
          {/* Sezione Header: Maglia + Avatar */}
          <div className="relative bg-gradient-to-b from-amber-500/20 to-transparent p-6 pb-20">
            {/* Maglia Gialla Stile Roma con Mezze Maniche */}
            <div className="relative mx-auto w-32 h-40">
              {/* Corpo Maglia */}
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-t-3xl shadow-2xl">
                {/* Texture maglia */}
                <div className="absolute inset-0 bg-black/5"></div>
                
                {/* Colletto */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-5 bg-gradient-to-b from-amber-600 to-amber-500 rounded-b-xl border-t-2 border-amber-700/50"></div>
                
                {/* Mezze Maniche con Bordini Gialli */}
                <div className="absolute top-8 -left-6 w-12 h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-r-2xl transform -rotate-12">
                  {/* Bordino giallo manica sinistra */}
                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-yellow-300 rounded-br-2xl"></div>
                </div>
                <div className="absolute top-8 -right-6 w-12 h-16 bg-gradient-to-bl from-amber-400 to-amber-600 rounded-l-2xl transform rotate-12">
                  {/* Bordino giallo manica destra */}
                  <div className="absolute bottom-0 left-0 right-0 h-2 bg-yellow-300 rounded-bl-2xl"></div>
                </div>
                
                {/* Numero sulla maglia */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-black text-red-700 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
                    {player.number || '?'}
                  </span>
                </div>
                
                {/* Bordino inferiore maglia */}
                <div className="absolute bottom-0 left-0 right-0 h-3 bg-yellow-300 rounded-b-3xl"></div>
              </div>
            </div>
            
            {/* Avatar con Sigla Nome+Cognome */}
            <div className="absolute left-1/2 -translate-x-1/2 -bottom-12">
              <Avatar className="h-24 w-24 border-4 border-primary shadow-2xl shadow-primary/50">
                {player.photoUrl && <AvatarImage src={player.photoUrl} alt={displayName} />}
                <AvatarFallback className="bg-gradient-to-br from-primary via-primary to-secondary text-primary-foreground text-3xl font-black">
                  {getPlayerInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Sezione Player Info - Layout Verticale */}
          <div className="px-6 pt-16 pb-6 space-y-6">
            
            {/* Nome Giocatore */}
            <div className="text-center">
              <h3 className="text-2xl font-black text-foreground tracking-tight">
                {displayName}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">ID: {player.id}</p>
            </div>

            {/* Statistiche - Layout Verticale */}
            {stats && (
              <div className="space-y-3 border-y border-border/30 py-4">
                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-primary/5">
                  <span className="text-sm font-semibold text-muted-foreground">Minuti di Gioco</span>
                  <span className="text-2xl font-black text-primary">{stats.minutiGiocati}'</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-primary/5">
                  <span className="text-sm font-semibold text-muted-foreground">Partite Convocato</span>
                  <span className="text-2xl font-black text-primary">{stats.partiteConvocato}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-primary/5">
                  <span className="text-sm font-semibold text-muted-foreground">Partite Titolare</span>
                  <span className="text-2xl font-black text-primary">{stats.partiteTitolare}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-primary/5">
                  <span className="text-sm font-semibold text-muted-foreground">Partite Entrato</span>
                  <span className="text-2xl font-black text-primary">{stats.partiteEntrato}</span>
                </div>
                
                {/* Nuove Statistiche: Partite Vinte/Pareggiate/Perse */}
                {stats.matchesWon !== undefined && (
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-green-600/10 border border-green-600/30">
                    <span className="text-sm font-semibold text-green-400 flex items-center gap-2">
                      ✅ Partite Vinte
                    </span>
                    <span className="text-2xl font-black text-green-400">{stats.matchesWon}</span>
                  </div>
                )}
                {stats.matchesDrawn !== undefined && (
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-yellow-600/10 border border-yellow-600/30">
                    <span className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                      🟰 Partite Pareggiate
                    </span>
                    <span className="text-2xl font-black text-yellow-400">{stats.matchesDrawn}</span>
                  </div>
                )}
                {stats.matchesLost !== undefined && (
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-red-700/10 border border-red-700/30">
                    <span className="text-sm font-semibold text-red-400 flex items-center gap-2">
                      ❌ Partite Perse
                    </span>
                    <span className="text-2xl font-black text-red-400">{stats.matchesLost}</span>
                  </div>
                )}
                
                {/* Statistiche Goal: Differenziato per Ruolo */}
                {player.role?.toLowerCase().includes('portiere') ? (
                  // PORTIERI: Mostra Goal Subiti
                  stats.goalsConceded !== undefined && (
                    <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
                      <span className="text-sm font-semibold text-red-400 flex items-center gap-2">
                        ⚽ Goal Subiti
                      </span>
                      <span className="text-2xl font-black text-red-400">{stats.goalsConceded}</span>
                    </div>
                  )
                ) : (
                  // ALTRI GIOCATORI: Mostra Goal Fatti
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
                    <span className="text-sm font-semibold text-green-400 flex items-center gap-2">
                      ⚽ Goal Fatti
                    </span>
                    <span className="text-2xl font-black text-green-400">{stats.goal}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
                  <span className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                    🎯 Assist
                  </span>
                  <span className="text-2xl font-black text-blue-400">{stats.assist}</span>
                </div>
                {stats.erroriGoal > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-red-800/10 border border-red-800/30">
                    <span className="text-sm font-semibold text-red-300 flex items-center gap-2">
                      ❌ Errori Goal
                    </span>
                    <span className="text-2xl font-black text-red-300">{stats.erroriGoal}</span>
                  </div>
                )}
                {stats.rigori > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/30">
                    <span className="text-sm font-semibold text-orange-400 flex items-center gap-2">
                      🎯 Rigori
                    </span>
                    <span className="text-2xl font-black text-orange-400">{stats.rigori}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <span className="text-sm font-semibold text-yellow-400 flex items-center gap-2">
                    🟨 Cartellini Gialli
                  </span>
                  <span className="text-2xl font-black text-yellow-400">{stats.cartelliniGialli}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
                  <span className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    🟥 Cartellini Rossi
                  </span>
                  <span className="text-2xl font-black text-red-400">{stats.cartelliniRossi}</span>
                </div>
                {stats.infortuni > 0 && (
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-pink-500/10 border border-pink-500/30">
                    <span className="text-sm font-semibold text-pink-400 flex items-center gap-2">
                      🤕 Infortuni
                    </span>
                    <span className="text-2xl font-black text-pink-400">{stats.infortuni}</span>
                  </div>
                )}
                {stats.punteggiMedio !== null && (
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <span className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                      ⭐ Punteggio Medio
                    </span>
                    <span className="text-2xl font-black text-cyan-400">{stats.punteggiMedio.toFixed(1)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Ruolo e Posizione - Centrati */}
            <div className="flex flex-col items-center gap-2">
              {player.role && (
                <Badge 
                  variant="outline" 
                  className={`${roleColor} flex items-center gap-2 font-semibold text-sm px-4 py-1.5`}
                >
                  {RoleIcon}
                  {player.role}
                </Badge>
              )}
              
              {player.position && (
                <Badge 
                  variant="outline" 
                  className="bg-primary/20 text-primary border-primary/50 font-bold text-sm px-4 py-1.5"
                >
                  {player.position}
                </Badge>
              )}
            </div>

            {/* Action Buttons - Layout Verticale */}
            <div className="flex flex-col gap-3 pt-2">
              <Button
                variant="default"
                size="lg"
                className="w-full neon-glow-cyan transition-all font-bold"
                onClick={() => setLocation(`/giocatore/${player.id}`)}
                data-testid={`button-details-${player.id}`}
              >
                DETTAGLI
              </Button>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => {
                  if (confirm(`Eliminare ${displayName} dalla rosa?`)) {
                    onDelete(player.id);
                  }
                }}
                disabled={isDeleting}
                data-testid={`button-delete-${player.id}`}
                className="w-full font-bold"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                ELIMINA
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
