import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Save, Users, AlertTriangle, Activity, ChevronDown, ChevronUp, CheckCircle, ArrowRight, RefreshCw, Zap, TrendingUp, MoveUpRight, ArrowUpRight, CornerRightUp, ArrowDownLeft, Circle } from "lucide-react";
import { assignPlayersToFormation } from "@/lib/formationPositioning";
import type { Player, SavedFormation } from "@shared/schema";

// Role mapping to abbreviations
const ROLE_ABBR: Record<string, string> = {
  'Portiere': 'POR',
  'Difensore': 'DIF',
  'Difensore Centrale': 'DIF',
  'Terzino Destro': 'DIF',
  'Terzino Sinistro': 'DIF',
  'Centrocampista': 'CEN',
  'Centrocampista Centrale': 'CEN',
  'Centrocampista Avanzato (Trequartista)': 'CEN',
  'Attaccante': 'ATK',
  'Prima Punta (Centravanti)': 'ATK',
  'Ala Destra': 'ATK',
  'Ala Sinistra': 'ATK',
};

// Formation presets with positions (x, y in percentages 0-100)
const FORMATIONS: Record<string, { x: number; y: number }[]> = {
  '4-4-2': [
    { x: 50, y: 95 }, // GK
    { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 }, // DF
    { x: 20, y: 50 }, { x: 40, y: 50 }, { x: 60, y: 50 }, { x: 80, y: 50 }, // MF
    { x: 35, y: 20 }, { x: 65, y: 20 }, // FW
  ],
  '4-3-3': [
    { x: 50, y: 95 }, // GK
    { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 }, // DF
    { x: 30, y: 50 }, { x: 50, y: 50 }, { x: 70, y: 50 }, // MF
    { x: 20, y: 20 }, { x: 50, y: 20 }, { x: 80, y: 20 }, // FW
  ],
  '3-5-2': [
    { x: 50, y: 95 }, // GK
    { x: 25, y: 75 }, { x: 50, y: 75 }, { x: 75, y: 75 }, // DF
    { x: 15, y: 50 }, { x: 35, y: 50 }, { x: 50, y: 50 }, { x: 65, y: 50 }, { x: 85, y: 50 }, // MF
    { x: 35, y: 20 }, { x: 65, y: 20 }, // FW
  ],
  '4-2-3-1': [
    { x: 50, y: 95 }, // GK
    { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 }, // DF
    { x: 35, y: 60 }, { x: 65, y: 60 }, // CDM
    { x: 20, y: 40 }, { x: 50, y: 40 }, { x: 80, y: 40 }, // CAM/Wingers
    { x: 50, y: 20 }, // FW
  ],
  '3-4-3': [
    { x: 50, y: 95 }, // GK
    { x: 25, y: 75 }, { x: 50, y: 75 }, { x: 75, y: 75 }, // DF
    { x: 20, y: 50 }, { x: 40, y: 50 }, { x: 60, y: 50 }, { x: 80, y: 50 }, // MF
    { x: 20, y: 20 }, { x: 50, y: 20 }, { x: 80, y: 20 }, // FW
  ],
  '5-3-2': [
    { x: 50, y: 95 }, // GK
    { x: 15, y: 75 }, { x: 32, y: 75 }, { x: 50, y: 75 }, { x: 68, y: 75 }, { x: 85, y: 75 }, // DF
    { x: 30, y: 50 }, { x: 50, y: 50 }, { x: 70, y: 50 }, // MF
    { x: 35, y: 20 }, { x: 65, y: 20 }, // FW
  ],
  '4-1-4-1': [
    { x: 50, y: 95 }, // GK
    { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 }, // DF
    { x: 50, y: 60 }, // CDM
    { x: 20, y: 40 }, { x: 40, y: 40 }, { x: 60, y: 40 }, { x: 80, y: 40 }, // MF
    { x: 50, y: 20 }, // FW
  ],
  '3-1-4-2': [
    { x: 50, y: 95 }, // GK
    { x: 25, y: 75 }, { x: 50, y: 75 }, { x: 75, y: 75 }, // DF
    { x: 50, y: 60 }, // CDM
    { x: 20, y: 40 }, { x: 40, y: 40 }, { x: 60, y: 40 }, { x: 80, y: 40 }, // MF
    { x: 35, y: 20 }, { x: 65, y: 20 }, // FW
  ],
  '4-5-1': [
    { x: 50, y: 95 }, // GK
    { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 }, // DF
    { x: 15, y: 50 }, { x: 35, y: 50 }, { x: 50, y: 50 }, { x: 65, y: 50 }, { x: 85, y: 50 }, // MF
    { x: 50, y: 20 }, // FW
  ],
  '5-4-1': [
    { x: 50, y: 95 }, // GK
    { x: 15, y: 75 }, { x: 32, y: 75 }, { x: 50, y: 75 }, { x: 68, y: 75 }, { x: 85, y: 75 }, // DF
    { x: 22, y: 50 }, { x: 42, y: 50 }, { x: 58, y: 50 }, { x: 78, y: 50 }, // MF
    { x: 50, y: 20 }, // FW
  ],
};

// Movimenti Tattici Professionali (14 tipi standard)
const TACTICAL_MOVEMENTS = [
  { id: 'diagonal-run', name: 'Diagonal Run', icon: '➡️', description: 'Corsa diagonale verso porta/spazio', color: '#00eaff' },
  { id: 'third-man', name: 'Third Man Run', icon: '🔄', description: 'Terzo uomo si inserisce mentre A→B passano', color: '#ff4081' },
  { id: 'overlap', name: 'Overlap', icon: '⇄', description: 'Corsa ESTERNA al portatore (terzino su ala)', color: '#FFD700' },
  { id: 'underlap', name: 'Underlap', icon: '⤴️', description: 'Corsa INTERNA al portatore (taglia dentro)', color: '#9333EA' },
  { id: 'give-and-go', name: 'Give & Go', icon: '🔁', description: '1-2 rapido in profondità (dai e vai)', color: '#10B981' },
  { id: 'through-ball', name: 'Through Ball', icon: '🎯', description: 'Palla filtrante tra difensori', color: '#F59E0B' },
  { id: 'cutback', name: 'Cutback', icon: '↩️', description: 'Cross arretrato da fondo campo', color: '#3B82F6' },
  { id: 'cross', name: 'Cross', icon: '✖️', description: 'Cross dal fondo/laterale', color: '#EC4899' },
  { id: 'switch-play', name: 'Switch Play', icon: '↔️', description: 'Cambio gioco lungo', color: '#8B5CF6' },
  { id: 'penetrating', name: 'Penetrating Run', icon: '⚡', description: 'Sprint profondo in area avversaria', color: '#EF4444' },
  { id: 'drop-off', name: 'Drop Off', icon: '⬇️', description: 'Attaccante si abbassa per legare gioco', color: '#6366F1' },
  { id: 'pass-move', name: 'Pass & Move', icon: '🔁', description: 'Dai palla e corri (dinamismo)', color: '#14B8A6' },
  { id: 'blind-side', name: 'Blind-Side Run', icon: '↗️', description: 'Corsa fuori vista difensore', color: '#F97316' },
  { id: 'support', name: 'Support Run', icon: '↕️', description: 'Movimento laterale/indietro per appoggio', color: '#A855F7' },
] as const;

type PlayerWithStatus = Player & { isInjured: boolean; lowAttendance: boolean };

// JerseyCard Component - Realistic Football Jersey Design
function JerseyCard({ 
  player, 
  isInjured, 
  lowAttendance, 
  isDragging,
  compact = false
}: { 
  player: Player; 
  isInjured: boolean; 
  lowAttendance: boolean; 
  isDragging?: boolean;
  compact?: boolean;
}) {
  const roleAbbr = ROLE_ABBR[player.role || ''] || 'N/A';
  const borderColor = isInjured ? '#EF4444' : lowAttendance ? '#3B82F6' : '#FFFFFF';
  const borderWidth = isInjured || lowAttendance ? 5 : 3;
  
  return (
    <div className={`relative ${compact ? 'w-24 h-28' : 'w-32 h-36'} ${isDragging ? 'opacity-50' : ''} transition-all duration-300 hover:scale-110 hover:drop-shadow-[0_0_20px_rgba(0,234,255,0.8)]`}>
      <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-lg">
        {/* Main Jersey Body - Yellow */}
        <path
          d="M25,25 L35,18 L40,28 L55,28 L55,18 L65,18 L65,28 L80,28 L85,18 L95,25 L95,110 L75,125 L45,125 L25,110 Z"
          fill="#FFD700"
          stroke={borderColor}
          strokeWidth={borderWidth}
        />
        
        {/* Red V-Neck Collar */}
        <path
          d="M40,28 L50,38 L60,38 L55,28 L65,28 L60,38 L55,45 L60,38 L65,28 L60,28"
          fill="#DC2626"
        />
        <path
          d="M55,28 L60,38 L55,45 L50,38 Z"
          fill="#DC2626"
        />
        
        {/* Left Red Sleeve */}
        <path
          d="M25,25 L35,18 L40,28 L35,45 L25,40 Z"
          fill="#DC2626"
        />
        
        {/* Right Red Sleeve */}
        <path
          d="M95,25 L85,18 L80,28 L85,45 L95,40 Z"
          fill="#DC2626"
        />
        
        {/* Sleeve Trim Lines */}
        <line x1="35" y1="45" x2="25" y2="40" stroke="#B91C1C" strokeWidth="2" />
        <line x1="85" y1="45" x2="95" y2="40" stroke="#B91C1C" strokeWidth="2" />
        
        {/* Number - Large and Bold */}
        <text
          x="60"
          y={compact ? "70" : "72"}
          textAnchor="middle"
          fontSize={compact ? "40" : "44"}
          fontWeight="900"
          fill="#000000"
          stroke="#FFFFFF"
          strokeWidth="1"
        >
          {player.number || '?'}
        </text>
        
        {/* Surname - Larger */}
        <text
          x="60"
          y={compact ? "95" : "98"}
          textAnchor="middle"
          fontSize={compact ? "11" : "13"}
          fontWeight="bold"
          fill="#000000"
        >
          {player.lastName.substring(0, compact ? 8 : 9).toUpperCase()}
        </text>
        
        {/* Role Badge */}
        <rect
          x="35"
          y={compact ? "105" : "108"}
          width="50"
          height={compact ? "16" : "18"}
          rx="8"
          fill="#00C4FF"
        />
        <text
          x="60"
          y={compact ? "116" : "120"}
          textAnchor="middle"
          fontSize={compact ? "10" : "11"}
          fontWeight="bold"
          fill="#000000"
        >
          {roleAbbr}
        </text>
      </svg>
    </div>
  );
}

// Clickable Player Component (from Convocati List - CLICK to add to field)
function ClickablePlayer({ 
  player, 
  isInjured, 
  lowAttendance,
  compact = false,
  onClick
}: { 
  player: PlayerWithStatus; 
  isInjured: boolean; 
  lowAttendance: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className="cursor-pointer hover-elevate active-elevate-2 flex-shrink-0 transition-transform hover:scale-105"
      data-testid={`clickable-player-${player.id}`}
    >
      <JerseyCard 
        player={player} 
        isInjured={isInjured} 
        lowAttendance={lowAttendance}
        compact={compact}
      />
    </button>
  );
}

// Draggable Player Component (from Bench - for repositioning)
function DraggablePlayer({ 
  player, 
  isInjured, 
  lowAttendance,
  compact = false
}: { 
  player: PlayerWithStatus; 
  isInjured: boolean; 
  lowAttendance: boolean;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `player-${player.id}`,
    data: { player }
  });
  
  return (
    <div 
      ref={setNodeRef} 
      {...listeners} 
      {...attributes}
      className="cursor-move hover-elevate flex-shrink-0"
      data-testid={`draggable-player-${player.id}`}
    >
      <JerseyCard 
        player={player} 
        isInjured={isInjured} 
        lowAttendance={lowAttendance}
        isDragging={isDragging}
        compact={compact}
      />
    </div>
  );
}

// Draggable + Droppable Field Position
function FieldPosition({ 
  position, 
  index, 
  player
}: { 
  position: { x: number; y: number }; 
  index: number;
  player?: PlayerWithStatus;
}) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `position-${index}`,
    data: { index }
  });
  
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `field-player-${player?.id || 'empty'}-${index}`,
    data: { player, index },
    disabled: !player
  });
  
  const setRefs = (element: HTMLDivElement | null) => {
    setDropRef(element);
    if (player) setDragRef(element);
  };
  
  return (
    <div
      ref={setRefs}
      {...(player ? { ...listeners, ...attributes } : {})}
      className={`absolute transition-all duration-200 ${isOver ? 'scale-110 z-20' : 'z-10'} ${player ? 'cursor-move' : ''} ${isDragging ? 'opacity-50' : ''}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      data-testid={`field-position-${index}`}
    >
      {player ? (
        <div className="transition-transform hover:scale-110 hover:drop-shadow-[0_0_20px_rgba(0,234,255,0.8)]">
          <JerseyCard 
            player={player} 
            isInjured={player.isInjured} 
            lowAttendance={player.lowAttendance}
            compact
          />
        </div>
      ) : (
        <div className={`w-16 h-16 rounded-full border-4 border-dashed transition-all ${isOver ? 'border-primary bg-primary/30 scale-110' : 'border-white/20 bg-white/5'} flex items-center justify-center`}>
          <span className="text-white/40 text-xs font-bold">{index + 1}</span>
        </div>
      )}
    </div>
  );
}

// Movement Panel - Tactical Movements Gallery
function MovementPanel({ 
  onSelectMovement 
}: { 
  onSelectMovement: (movementId: string) => void;
}) {
  return (
    <Card className="border-primary/30 sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold text-primary flex items-center gap-2">
          <Zap className="h-4 w-4" />
          MOVIMENTI TATTICI
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-1.5">
        {TACTICAL_MOVEMENTS.map((movement) => (
          <button
            key={movement.id}
            onClick={() => onSelectMovement(movement.id)}
            className="w-full group relative flex items-center gap-2 p-2 rounded-lg transition-all hover-elevate active-elevate-2 border border-border/50 hover:border-primary/50 text-left"
            style={{ 
              backgroundColor: `${movement.color}10`,
            }}
            title={movement.description}
            data-testid={`movement-${movement.id}`}
          >
            <span className="text-xl flex-shrink-0">{movement.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-foreground truncate">
                {movement.name}
              </div>
              <div className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
                {movement.description}
              </div>
            </div>
            <div 
              className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
              style={{ backgroundColor: movement.color }}
            />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

// Droppable Bench Zone
function BenchZone({ 
  players, 
  maxPlayers = 15 
}: { 
  players: PlayerWithStatus[];
  maxPlayers?: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'bench',
  });
  
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[200px] border-2 border-dashed rounded-lg p-4 transition-all ${
        isOver ? 'border-primary bg-primary/10' : 'border-border bg-card'
      }`}
      data-testid="bench-zone"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-sm">PANCHINA</h3>
        <Badge variant={players.length > maxPlayers ? 'destructive' : 'default'}>
          {players.length}/{maxPlayers}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <DraggablePlayer
            key={player.id}
            player={player}
            isInjured={player.isInjured}
            lowAttendance={player.lowAttendance}
            compact
          />
        ))}
      </div>
    </div>
  );
}

export default function FormazioniPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentFormation, setCurrentFormation] = useState<string>('4-4-2');
  const [fieldPlayers, setFieldPlayers] = useState<Record<number, number>>({}); // playerId -> positionIndex
  const [benchPlayers, setBenchPlayers] = useState<number[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [formationName, setFormationName] = useState('');
  const [selectedSavedFormation, setSelectedSavedFormation] = useState<string>('');
  const [selectedConvocation, setSelectedConvocation] = useState<number | null>(null);
  const [showConvocations, setShowConvocations] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<string | null>(null);
  const [showConvocatiSection, setShowConvocatiSection] = useState(true); // APERTO DI DEFAULT per vedere i giocatori

  // Fetch convocations
  const { data: convocations = [] } = useQuery<any[]>({
    queryKey: ['/api/convocations'],
  });

  // Fetch players with status
  const { data: allPlayers = [] } = useQuery<PlayerWithStatus[]>({
    queryKey: ['/api/debug-players-with-status'],
  });

  // Filter players based on selected convocation
  const players = useMemo(() => {
    if (!selectedConvocation) return allPlayers;
    
    const convocation = convocations.find(c => c.id === selectedConvocation);
    if (!convocation || !convocation.playerIds || convocation.playerIds.length === 0) {
      return allPlayers;
    }
    
    return allPlayers.filter(player => convocation.playerIds.includes(player.id));
  }, [allPlayers, selectedConvocation, convocations]);

  // Fetch saved formations
  const { data: savedFormations = [] } = useQuery<SavedFormation[]>({
    queryKey: ['/api/debug-saved-formations'],
  });

  // Save formation mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { name: string; date: string; formationType: string; positionsJson: any; benchJson: any }) => {
      return apiRequest('POST', '/api/formations/saved', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/formations/saved'] });
      toast({ title: "✅ Formazione salvata con successo!" });
      setSaveDialogOpen(false);
      setFormationName('');
    },
    onError: () => {
      toast({ title: "Errore nel salvare la formazione", variant: "destructive" });
    }
  });

  // Filter players
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      // Exclude players already on field or bench
      if (Object.keys(fieldPlayers).includes(player.id.toString()) || benchPlayers.includes(player.id)) {
        return false;
      }
      
      const matchesSearch = searchTerm === '' || 
        player.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.lastName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || player.role?.includes(roleFilter);
      
      const matchesStatus = 
        statusFilter === 'all' ||
        (statusFilter === 'available' && !player.isInjured && !player.lowAttendance) ||
        (statusFilter === 'injured' && player.isInjured) ||
        (statusFilter === 'low-attendance' && player.lowAttendance);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [players, searchTerm, roleFilter, statusFilter, fieldPlayers, benchPlayers]);

  // Get players in positions
  const playersOnField = useMemo(() => {
    return Object.entries(fieldPlayers).map(([playerId, positionIndex]) => {
      const player = players.find(p => p.id === parseInt(playerId));
      return player ? { player, positionIndex } : null;
    }).filter(Boolean) as { player: PlayerWithStatus; positionIndex: number }[];
  }, [fieldPlayers, players]);

  const playersOnBench = useMemo(() => {
    return benchPlayers.map(id => players.find(p => p.id === id)).filter(Boolean) as PlayerWithStatus[];
  }, [benchPlayers, players]);

  // Stats
  const injuredCount = players.filter(p => p.isInjured).length;
  const lowAttendanceCount = players.filter(p => p.lowAttendance).length;
  const fieldPlayersCount = Object.keys(fieldPlayers).length;

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const activeId = active.id.toString();
    const overId = over.id.toString();
    
    // Extract player ID from different drag sources
    let playerId: number;
    let isFromField = false;
    let currentPosition: number | undefined;
    
    if (activeId.startsWith('player-')) {
      // From roster
      playerId = parseInt(activeId.replace('player-', ''));
    } else if (activeId.startsWith('field-player-')) {
      // From field
      isFromField = true;
      const parts = activeId.split('-');
      playerId = parseInt(parts[2]);
      currentPosition = active.data.current?.index;
    } else {
      return;
    }
    
    // Drop on field position
    if (overId.startsWith('position-')) {
      const positionIndex = parseInt(overId.replace('position-', ''));
      
      // Check if position is already occupied
      const occupiedBy = Object.entries(fieldPlayers).find(([_, pos]) => pos === positionIndex)?.[0];
      
      if (occupiedBy) {
        const occupiedPlayerId = parseInt(occupiedBy);
        
        if (isFromField && currentPosition !== undefined) {
          // Swap two field players
          setFieldPlayers({
            ...fieldPlayers,
            [playerId]: positionIndex,
            [occupiedPlayerId]: currentPosition
          });
        } else {
          // Replace field player with roster/bench player
          const newFieldPlayers = { ...fieldPlayers };
          newFieldPlayers[playerId] = positionIndex;
          delete newFieldPlayers[occupiedPlayerId];
          setFieldPlayers(newFieldPlayers);
          
          // Remove from bench if applicable
          if (benchPlayers.includes(playerId)) {
            setBenchPlayers(benchPlayers.filter(id => id !== playerId));
          }
        }
      } else {
        // Position is free
        const newFieldPlayers = { ...fieldPlayers };
        
        if (isFromField && currentPosition !== undefined) {
          // Move within field
          delete newFieldPlayers[playerId];
        }
        
        newFieldPlayers[playerId] = positionIndex;
        setFieldPlayers(newFieldPlayers);
        
        // Remove from bench if applicable
        if (benchPlayers.includes(playerId)) {
          setBenchPlayers(benchPlayers.filter(id => id !== playerId));
        }
      }
    }
    
    // Drop on bench
    if (overId === 'bench') {
      if (!benchPlayers.includes(playerId)) {
        if (benchPlayers.length < 15) {
          setBenchPlayers([...benchPlayers, playerId]);
        }
        
        // Remove from field if applicable
        if (isFromField) {
          const newFieldPlayers = { ...fieldPlayers };
          delete newFieldPlayers[playerId];
          setFieldPlayers(newFieldPlayers);
        }
      }
    }
  };

  // Apply preset formation - SISTEMA INTELLIGENTE con formationPositions
  const applyPresetFormation = (formationType: string) => {
    const previousFormation = currentFormation;
    setCurrentFormation(formationType);
    
    const positions = FORMATIONS[formationType];
    
    // Get players currently on field
    const currentFieldPlayerIds = Object.keys(fieldPlayers).map(id => parseInt(id));
    
    if (currentFieldPlayerIds.length === 0) {
      // No players on field - do nothing (user will manually assign)
      toast({ 
        title: `⚽ Modulo cambiato: ${formationType}`, 
        description: `Drag & Drop i giocatori nelle posizioni`
      });
      return;
    }
    
    // SISTEMA INTELLIGENTE: Usa formationPositions personalizzate + roleSpecializations
    const playersInField = currentFieldPlayerIds
      .map(id => players.find(p => p.id === id))
      .filter(Boolean) as PlayerWithStatus[];
    
    // Usa la funzione intelligente di assegnazione
    const intelligentAssignments = assignPlayersToFormation(playersInField, formationType);
    
    // Converti gli assignment in indici posizione
    const newFieldPlayers: Record<number, number> = {};
    const positionMap = new Map<string, number>();
    
    // Mappa ogni posizione abbreviata (POR, TD, etc.) al suo indice nel layout visivo
    // Per ora utilizziamo un mapping semplice basato sull'ordine
    Object.entries(intelligentAssignments).forEach(([playerId, posAbbr]) => {
      const player = playersInField.find(p => p.id === parseInt(playerId));
      if (player) {
        // Trova il primo slot libero compatibile con questa posizione
        // (Questa è una semplificazione - in futuro si può mappare meglio posAbbr -> visual index)
        const existingIndex = fieldPlayers[parseInt(playerId)];
        if (existingIndex !== undefined && existingIndex < positions.length) {
          newFieldPlayers[parseInt(playerId)] = existingIndex; // Mantieni posizione esistente per ora
        } else {
          // Assegna al primo slot libero
          for (let i = 0; i < positions.length; i++) {
            if (!Object.values(newFieldPlayers).includes(i)) {
              newFieldPlayers[parseInt(playerId)] = i;
              break;
            }
          }
        }
      }
    });
    
    setFieldPlayers(newFieldPlayers);
    
    toast({ 
      title: `⚽ Modulo cambiato: ${formationType}`, 
      description: `${playersInField.length} giocatori riposizionati intelligentemente (formationPositions + roleSpecializations)`
    });
  };

  // CLICK player to add to field (trova prima posizione libera)
  const handleClickPlayer = (player: PlayerWithStatus) => {
    // Check if already on field or bench
    if (Object.keys(fieldPlayers).includes(player.id.toString())) {
      toast({ 
        title: "⚠️ Giocatore già nel campo", 
        description: `${player.lastName} ${player.firstName} è già posizionato`
      });
      return;
    }
    
    if (benchPlayers.includes(player.id)) {
      toast({ 
        title: "⚠️ Giocatore in panchina", 
        description: `${player.lastName} ${player.firstName} è in panchina. Rimuovilo prima.`
      });
      return;
    }

    // Find first free position
    const positions = FORMATIONS[currentFormation];
    const occupiedPositions = Object.values(fieldPlayers);
    
    let freePosition = -1;
    for (let i = 0; i < positions.length; i++) {
      if (!occupiedPositions.includes(i)) {
        freePosition = i;
        break;
      }
    }

    if (freePosition === -1) {
      toast({ 
        title: "⚠️ Nessuna posizione libera", 
        description: "Rimuovi un giocatore dal campo prima di aggiungerne altri",
        variant: "destructive"
      });
      return;
    }

    // Assign to free position
    setFieldPlayers({
      ...fieldPlayers,
      [player.id]: freePosition
    });

    toast({ 
      title: `✅ Giocatore aggiunto`, 
      description: `${player.lastName} ${player.firstName} in posizione ${freePosition + 1}`
    });
  };

  // Load saved formation
  const loadSavedFormation = (formationId: string) => {
    const formation = savedFormations.find(f => f.id === parseInt(formationId));
    if (formation) {
      setCurrentFormation(formation.formationType);
      
      // Load positions
      if (formation.positionsJson && typeof formation.positionsJson === 'object') {
        setFieldPlayers(formation.positionsJson as Record<number, number>);
      }
      
      // Load bench
      if (formation.benchJson && Array.isArray(formation.benchJson)) {
        setBenchPlayers(formation.benchJson as number[]);
      }
      
      toast({ title: `✅ Caricata formazione: ${formation.name}` });
    }
  };

  // Save formation
  const handleSaveFormation = () => {
    if (fieldPlayersCount !== 11) {
      toast({ 
        title: "⚠️ Devi selezionare esattamente 11 giocatori titolari", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!formationName.trim()) {
      toast({ title: "Inserisci un nome per la formazione", variant: "destructive" });
      return;
    }
    
    saveMutation.mutate({
      name: formationName,
      date: new Date().toISOString().split('T')[0],
      formationType: currentFormation,
      positionsJson: fieldPlayers,
      benchJson: benchPlayers,
    });
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <Navigation />
      
      <div className="container mx-auto px-4 py-6 max-w-[1800px]">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-primary mb-2">⚽ Formazioni Visual Builder</h1>
          <p className="text-muted-foreground">Drag & Drop per creare la tua formazione ideale</p>
        </div>

        {/* Sezione Convocazioni Espandibile */}
        <Collapsible open={showConvocations} onOpenChange={setShowConvocations} className="mb-6">
          <Card className="border-border/50 transition-neon hover:border-primary/30">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-4 cursor-pointer hover:bg-primary/5 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-primary flex items-center gap-2">
                    <Users className="h-6 w-6" />
                    Convocazioni Disponibili
                    {selectedConvocation && (
                      <Badge variant="default" className="ml-2">
                        Attiva: {convocations.find(c => c.id === selectedConvocation)?.name}
                      </Badge>
                    )}
                  </CardTitle>
                  {showConvocations ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {convocations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nessuna convocazione disponibile. Crea una convocazione dalla sezione apposita.
                  </div>
                ) : (
                  <>
                    {selectedConvocation && (
                      <div className="mb-4 flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedConvocation(null);
                            setFieldPlayers({});
                            setBenchPlayers([]);
                            toast({ title: "✅ Visualizzazione rosa completa" });
                          }}
                          data-testid="button-clear-convocation"
                        >
                          Mostra Tutti i Giocatori
                        </Button>
                      </div>
                    )}
                    <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold text-sm">Nome</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Data Gara</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Avversario</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Orario Campo</th>
                          <th className="text-left py-3 px-4 font-semibold text-sm">Orario Partita</th>
                          <th className="text-center py-3 px-4 font-semibold text-sm">Convocati</th>
                          <th className="text-center py-3 px-4 font-semibold text-sm">Azioni</th>
                        </tr>
                      </thead>
                      <tbody>
                        {convocations.map((convocation) => (
                          <tr 
                            key={convocation.id} 
                            className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${selectedConvocation === convocation.id ? 'bg-primary/10' : ''}`}
                          >
                            <td className="py-3 px-4">
                              <span className="font-medium text-foreground">{convocation.name}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-mono text-foreground">
                                {new Date(convocation.matchDate).toLocaleDateString('it-IT', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-foreground">{convocation.opponent || '-'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-foreground">{convocation.fieldArrivalTime || '-'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-foreground">{convocation.matchStartTime || '-'}</span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="font-bold text-cyan-500">
                                {convocation.playerIds?.length || 0}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant={selectedConvocation === convocation.id ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setSelectedConvocation(convocation.id);
                                    setFieldPlayers({});
                                    setBenchPlayers([]);
                                    toast({ 
                                      title: `✅ Convocazione selezionata`, 
                                      description: `${convocation.name} - ${convocation.playerIds?.length || 0} giocatori`
                                    });
                                  }}
                                  className="gap-1"
                                  data-testid={`button-select-convocation-${convocation.id}`}
                                >
                                  <CheckCircle className="h-3 w-3" />
                                  {selectedConvocation === convocation.id ? 'Attiva' : 'Seleziona'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* WORKFLOW CONTROL: Step 1 → Convocazione | Step 2 → Formazione */}
        <Card className="border-primary/50 bg-primary/5 mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4 flex-wrap items-center">
              {/* STEP 1: Seleziona Convocazione (OBBLIGATORIO) */}
              <div className="flex-1 min-w-[300px]">
                <label className="text-xs font-bold text-primary mb-2 block">
                  1️⃣ SELEZIONA CONVOCAZIONE (obbligatorio)
                </label>
                <Select 
                  value={selectedConvocation?.toString() || ''} 
                  onValueChange={(value) => {
                    const convId = parseInt(value);
                    setSelectedConvocation(convId);
                    setFieldPlayers({});
                    setBenchPlayers([]);
                    const conv = convocations.find(c => c.id === convId);
                    toast({ 
                      title: `✅ Convocazione caricata`, 
                      description: `${conv?.name} - ${conv?.playerIds?.length || 0} giocatori disponibili`
                    });
                  }}
                >
                  <SelectTrigger className="w-full border-primary/50" data-testid="select-convocation">
                    <SelectValue placeholder="⚠️ Seleziona una convocazione per iniziare..." />
                  </SelectTrigger>
                  <SelectContent>
                    {convocations.length === 0 ? (
                      <SelectItem value="none" disabled>Nessuna convocazione disponibile</SelectItem>
                    ) : (
                      convocations.map((conv) => (
                        <SelectItem key={conv.id} value={conv.id.toString()}>
                          {conv.name} ({conv.playerIds?.length || 0} giocatori) - {new Date(conv.matchDate).toLocaleDateString('it-IT')}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* STEP 2: Carica Formazione Salvata (opzionale) */}
              <div className="flex-1 min-w-[250px]">
                <label className="text-xs font-bold text-muted-foreground mb-2 block">
                  2️⃣ CARICA FORMAZIONE SALVATA (opzionale)
                </label>
                <Select 
                  value={selectedSavedFormation} 
                  onValueChange={(value) => {
                    setSelectedSavedFormation(value);
                    loadSavedFormation(value);
                  }}
                  disabled={!selectedConvocation}
                >
                  <SelectTrigger className="w-full" data-testid="select-saved-formation">
                    <SelectValue placeholder="📋 Carica una formazione esistente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedFormations.length === 0 ? (
                      <SelectItem value="none" disabled>Nessuna formazione salvata</SelectItem>
                    ) : (
                      savedFormations.map((formation) => (
                        <SelectItem key={formation.id} value={formation.id.toString()}>
                          {formation.name} ({formation.formationType})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* STEP 3: Salva Formazione */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-2 block opacity-0 pointer-events-none">-</label>
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="gap-2" 
                      disabled={!selectedConvocation || fieldPlayersCount !== 11}
                      data-testid="button-open-save-dialog"
                    >
                      <Save className="h-4 w-4" />
                      Salva Formazione
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Salva Formazione</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <Input
                        placeholder="Nome formazione (es: 4-4-2 Contro Milan)"
                        value={formationName}
                        onChange={(e) => setFormationName(e.target.value)}
                        data-testid="input-formation-name"
                      />
                      <div className="text-sm text-muted-foreground">
                        <p>• Formazione: {currentFormation}</p>
                        <p>• Titolari: {fieldPlayersCount}/11</p>
                        <p>• Panchina: {benchPlayers.length}/15</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                        Annulla
                      </Button>
                      <Button onClick={handleSaveFormation} disabled={saveMutation.isPending} data-testid="button-save-formation">
                        Salva
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* WARNING se nessuna convocazione */}
            {!selectedConvocation && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <p className="text-sm text-destructive font-semibold">
                  ⚠️ Seleziona prima una convocazione per poter creare la formazione tattica
                </p>
              </div>
            )}

            {/* INFO convocazione attiva */}
            {selectedConvocation && (
              <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                <p className="text-sm text-primary font-semibold">
                  ✅ Convocazione attiva: {convocations.find(c => c.id === selectedConvocation)?.name} ({players.length} giocatori)
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <DndContext onDragEnd={handleDragEnd}>
          {/* LAYOUT ORIGINALE RIPRISTINATO */}
          <div className={`space-y-4 ${!selectedConvocation ? 'opacity-30 pointer-events-none' : ''}`}>
            {/* Stats Bar */}
            <Card className="border-primary/50 bg-card/80">
              <CardContent className="p-4">
                <div className="flex gap-3 flex-wrap items-center">
                  <Badge variant={fieldPlayersCount === 11 ? 'default' : 'destructive'} className="text-base px-5 py-2.5">
                    <Users className="h-5 w-5 mr-2" />
                    Titolari: {fieldPlayersCount}/11
                  </Badge>
                  <Badge variant="secondary" className="text-base px-5 py-2.5">
                    Panchina: {benchPlayers.length}/15
                  </Badge>
                  {injuredCount > 0 && (
                    <Badge variant="destructive" className="text-base px-5 py-2.5">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      {injuredCount} Infortunati
                    </Badge>
                  )}
                  {lowAttendanceCount > 0 && (
                    <Badge className="text-base px-5 py-2.5 bg-blue-500">
                      <Activity className="h-5 w-5 mr-2" />
                      {lowAttendanceCount} Bassa Presenza
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bench Section */}
            <BenchZone players={playersOnBench} />

            {/* MODULI TATTICI - SOPRA IL CAMPO */}
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <h3 className="font-bold mb-3 text-sm">MODULI TATTICI</h3>
                <div className="grid grid-cols-5 gap-2">
                  {Object.keys(FORMATIONS).map((formation) => (
                    <Button
                      key={formation}
                      variant={currentFormation === formation ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => applyPresetFormation(formation)}
                      className="text-xs font-bold"
                      data-testid={`preset-${formation}`}
                    >
                      {formation}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 3D Football Field */}
            <Card className="border-border/50 overflow-hidden">
              <CardContent className="p-0">
                <div
                  className="relative bg-gradient-to-b from-green-700 via-green-600 to-green-700"
                  style={{
                    backgroundImage: `
                      linear-gradient(90deg, transparent 49%, rgba(255,255,255,0.15) 49%, rgba(255,255,255,0.15) 51%, transparent 51%),
                      repeating-linear-gradient(0deg, #16a34a 0px, #16a34a 30px, #15803d 30px, #15803d 60px)
                    `,
                    height: '800px',
                  }}
                  data-testid="football-field"
                >
                  {/* Field lines */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <rect x="5%" y="2%" width="90%" height="96%" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
                    <line x1="5%" y1="50%" x2="95%" y2="50%" stroke="white" strokeWidth="2" opacity="0.6" />
                    <circle cx="50%" cy="50%" r="10%" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
                    <rect x="35%" y="2%" width="30%" height="12%" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
                    <rect x="35%" y="86%" width="30%" height="12%" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
                  </svg>

                  {/* Field Positions */}
                  {FORMATIONS[currentFormation].map((position, index) => {
                    const playerInPosition = playersOnField.find(p => p.positionIndex === index);
                    return (
                      <FieldPosition
                        key={index}
                        position={position}
                        index={index}
                        player={playerInPosition?.player}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CONVOCATI SECTION - Collapsible sotto tutto */}
          <Collapsible open={showConvocatiSection} onOpenChange={setShowConvocatiSection} className="mt-6">
            <Card className="border-border/50">
              <CollapsibleTrigger asChild>
                <CardHeader className="pb-4 cursor-pointer hover:bg-primary/5 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-bold">CONVOCATI</CardTitle>
                    {showConvocatiSection ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="p-4 space-y-4">
                
                <Input
                  placeholder="🔍 Cerca giocatore..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-player"
                />

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger data-testid="select-role-filter">
                    <SelectValue placeholder="Filtra per ruolo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti i ruoli</SelectItem>
                    <SelectItem value="Portiere">Portiere</SelectItem>
                    <SelectItem value="Difensore">Difensore</SelectItem>
                    <SelectItem value="Centrocampista">Centrocampista</SelectItem>
                    <SelectItem value="Attaccante">Attaccante</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger data-testid="select-status-filter">
                    <SelectValue placeholder="Filtra per status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="available">Disponibili</SelectItem>
                    <SelectItem value="injured">Infortunati</SelectItem>
                    <SelectItem value="low-attendance">Bassa Presenza</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredPlayers.map((player) => (
                    <DraggablePlayer
                      key={player.id}
                      player={player}
                      isInjured={player.isInjured}
                      lowAttendance={player.lowAttendance}
                    />
                  ))}
                  {filteredPlayers.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Nessun giocatore disponibile
                    </p>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
        </DndContext>
      </div>
    </div>
  );
}
