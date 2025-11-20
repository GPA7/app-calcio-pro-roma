import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DndContext, DragEndEvent, useDraggable, useDroppable } from "@dnd-kit/core";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Save, Users, AlertTriangle, Activity, Save as SaveIcon, Download, Trash2, 
  Pencil, ArrowUpDown, Circle, Type, Eraser, Minus, Move
} from "lucide-react";
import type { Player, SavedFormation, TacticalSetup } from "@shared/schema";

// Role mapping
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

// Role groups for left panel
const ROLE_GROUPS = [
  { id: 'portiere', label: 'PORTIERI', icon: '🧤', keywords: ['Portiere'] },
  { id: 'difensore', label: 'DIFENSORI', icon: '🛡️', keywords: ['Difensore', 'Terzino', 'Braccetto'] },
  { id: 'centrocampista', label: 'CENTROCAMPISTI', icon: '⚙️', keywords: ['Centrocampista', 'Mediano', 'Mezzala'] },
  { id: 'attaccante', label: 'ATTACCANTI', icon: '⚽', keywords: ['Attaccante', 'Prima Punta', 'Ala'] },
] as const;

// Formation presets
const FORMATIONS: Record<string, { x: number; y: number }[]> = {
  '4-4-2': [
    { x: 50, y: 95 }, // GK
    { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 }, // DF
    { x: 20, y: 50 }, { x: 40, y: 50 }, { x: 60, y: 50 }, { x: 80, y: 50 }, // MF
    { x: 35, y: 20 }, { x: 65, y: 20 }, // FW
  ],
  '4-3-3': [
    { x: 50, y: 95 },
    { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
    { x: 30, y: 50 }, { x: 50, y: 50 }, { x: 70, y: 50 },
    { x: 20, y: 20 }, { x: 50, y: 20 }, { x: 80, y: 20 },
  ],
  '3-5-2': [
    { x: 50, y: 95 },
    { x: 25, y: 75 }, { x: 50, y: 75 }, { x: 75, y: 75 },
    { x: 15, y: 50 }, { x: 35, y: 50 }, { x: 50, y: 50 }, { x: 65, y: 50 }, { x: 85, y: 50 },
    { x: 35, y: 20 }, { x: 65, y: 20 },
  ],
  '4-2-3-1': [
    { x: 50, y: 95 },
    { x: 20, y: 75 }, { x: 40, y: 75 }, { x: 60, y: 75 }, { x: 80, y: 75 },
    { x: 35, y: 60 }, { x: 65, y: 60 },
    { x: 20, y: 40 }, { x: 50, y: 40 }, { x: 80, y: 40 },
    { x: 50, y: 20 },
  ],
  '3-4-3': [
    { x: 50, y: 95 },
    { x: 25, y: 75 }, { x: 50, y: 75 }, { x: 75, y: 75 },
    { x: 20, y: 50 }, { x: 40, y: 50 }, { x: 60, y: 50 }, { x: 80, y: 50 },
    { x: 20, y: 20 }, { x: 50, y: 20 }, { x: 80, y: 20 },
  ],
  '5-3-2': [
    { x: 50, y: 95 },
    { x: 15, y: 75 }, { x: 32, y: 75 }, { x: 50, y: 75 }, { x: 68, y: 75 }, { x: 85, y: 75 },
    { x: 30, y: 50 }, { x: 50, y: 50 }, { x: 70, y: 50 },
    { x: 35, y: 20 }, { x: 65, y: 20 },
  ],
};

// Tactical Options per Zone
type TacticalIndicator = {
  type: 'arrow-up' | 'arrow-down' | 'arrow-left' | 'arrow-right' | 'double-arrow' | 'zone-highlight';
  color: string;
  label?: string;
};

type TacticalOption = {
  id: string;
  label: string;
  description: string;
  indicators: TacticalIndicator[];
};

const TACTICAL_OPTIONS = {
  goalkeeper: [
    { id: 'none', label: 'Nessuna Variante', description: 'Gioco standard', indicators: [] },
    { 
      id: 'high-play', 
      label: 'Gioco Alto', 
      description: 'Portiere esce spesso dall\'area',
      indicators: [{ type: 'arrow-up' as const, color: '#00eaff', label: '↑' }]
    },
    { 
      id: 'long-kick', 
      label: 'Rinvio Lungo', 
      description: 'Rinvii diretti verso l\'attacco',
      indicators: [{ type: 'double-arrow' as const, color: '#ff4081', label: '⇈' }]
    },
    { 
      id: 'build-from-back', 
      label: 'Costruzione dal Basso', 
      description: 'Passaggi corti ai difensori',
      indicators: [{ type: 'arrow-down' as const, color: '#FFD700', label: '↓' }]
    },
  ],
  defense: [
    { id: 'none', label: 'Nessuna Variante', description: 'Difesa standard', indicators: [] },
    { 
      id: 'module-4', 
      label: 'Modulo a 4', 
      description: 'Linea difensiva a 4',
      indicators: []
    },
    { 
      id: 'module-3', 
      label: 'Modulo a 3', 
      description: 'Linea difensiva a 3',
      indicators: []
    },
    { 
      id: 'both-fullbacks-attack', 
      label: 'Terzini Offensivi (entrambi)', 
      description: 'Entrambi i terzini si sovrappongono',
      indicators: [{ type: 'arrow-up' as const, color: '#ff4081', label: '↑↓' }]
    },
    { 
      id: 'left-fullback-attack', 
      label: 'Terzino Sinistro Offensivo', 
      description: 'Terzino sinistro attacca',
      indicators: [{ type: 'arrow-up' as const, color: '#ff4081', label: '↑↓' }]
    },
    { 
      id: 'right-fullback-attack', 
      label: 'Terzino Destro Offensivo', 
      description: 'Terzino destro attacca',
      indicators: [{ type: 'arrow-up' as const, color: '#ff4081', label: '↑↓' }]
    },
  ],
  midfield: [
    { id: 'none', label: 'Nessuna Variante', description: 'Centrocampo standard', indicators: [] },
    { 
      id: 'line-2', 
      label: 'Linea a 2', 
      description: 'Due centrocampisti centrali',
      indicators: []
    },
    { 
      id: 'line-3', 
      label: 'Linea a 3', 
      description: 'Tre centrocampisti',
      indicators: []
    },
    { 
      id: 'playmaker', 
      label: 'Mediano Playmaker', 
      description: 'Regista basso',
      indicators: [{ type: 'zone-highlight' as const, color: '#00eaff' }]
    },
    { 
      id: 'winger-left', 
      label: 'Ala Tornante Sx', 
      description: 'Ala sinistra rientra',
      indicators: [{ type: 'arrow-right' as const, color: '#FFD700', label: '→←' }]
    },
    { 
      id: 'winger-right', 
      label: 'Ala Tornante Dx', 
      description: 'Ala destra rientra',
      indicators: [{ type: 'arrow-left' as const, color: '#FFD700', label: '←→' }]
    },
  ],
  attack: [
    { id: 'none', label: 'Nessuna Variante', description: 'Attacco standard', indicators: [] },
    { 
      id: 'central-striker', 
      label: 'Punta Centrale', 
      description: 'Centravanti di riferimento',
      indicators: []
    },
    { 
      id: 'two-strikers', 
      label: 'Due Punte', 
      description: 'Coppia di attaccanti',
      indicators: []
    },
    { 
      id: 'false-nine', 
      label: 'Falso 9', 
      description: 'Punta che si abbassa',
      indicators: [{ type: 'arrow-down' as const, color: '#00eaff', label: '↓↑' }]
    },
    { 
      id: 'wide-wingers', 
      label: 'Ali Larghe', 
      description: 'Attaccanti esterni larghi',
      indicators: [{ type: 'arrow-left' as const, color: '#ff4081', label: '←→' }]
    },
  ],
} as const;

type PlayerWithStatus = Player & { isInjured: boolean; lowAttendance: boolean };

// Tactical Indicator Overlay Component
function TacticalIndicatorOverlay({ 
  indicators, 
  x, 
  y 
}: { 
  indicators: TacticalIndicator[]; 
  x: number; 
  y: number;
}) {
  if (indicators.length === 0) return null;

  return (
    <div 
      className="absolute pointer-events-none z-40" 
      style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
    >
      {indicators.map((indicator, idx) => (
        <div key={idx} className="flex items-center justify-center">
          {indicator.type === 'arrow-up' && (
            <div className="text-4xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ color: indicator.color }}>
              ↑↓
            </div>
          )}
          {indicator.type === 'arrow-down' && (
            <div className="text-4xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ color: indicator.color }}>
              ↓↑
            </div>
          )}
          {indicator.type === 'arrow-left' && (
            <div className="text-4xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ color: indicator.color }}>
              ←→
            </div>
          )}
          {indicator.type === 'arrow-right' && (
            <div className="text-4xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ color: indicator.color }}>
              →←
            </div>
          )}
          {indicator.type === 'double-arrow' && (
            <div className="text-4xl font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" style={{ color: indicator.color }}>
              ⇈⇊
            </div>
          )}
          {indicator.type === 'zone-highlight' && (
            <div 
              className="absolute w-20 h-20 rounded-full animate-pulse opacity-30" 
              style={{ backgroundColor: indicator.color, top: '-35px', left: '-35px' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Draggable Player Component (Sidebar)
function DraggablePlayer({ player, isOnField }: { player: PlayerWithStatus; isOnField: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `sidebar-${player.id}`,
    disabled: isOnField, // Disabilita drag dalla sidebar se già sul campo
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 rounded border hover-elevate transition-all ${
        isOnField 
          ? 'bg-primary/20 border-primary text-primary-foreground cursor-default opacity-60' 
          : 'bg-muted cursor-move'
      }`}
      data-testid={`player-card-${player.id}`}
    >
      <div className="text-sm font-medium">
        {player.lastName} {player.firstName}
        {isOnField && <span className="ml-1 text-xs">✓</span>}
      </div>
      <div className="text-xs text-muted-foreground flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          #{player.number}
        </Badge>
        <span className="truncate">{player.position}</span>
      </div>
    </div>
  );
}

// Field Player Component (On-Field Draggable)
function FieldPlayer({ 
  player, 
  position, 
  onDoubleClick,
  snapToGrid 
}: { 
  player: PlayerWithStatus; 
  position: { x: number; y: number };
  onDoubleClick: () => void;
  snapToGrid: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `field-${player.id}`,
  });

  const style = {
    left: `${position.x}%`,
    top: `${position.y}%`,
    transform: transform 
      ? `translate(-50%, -50%) translate3d(${transform.x}px, ${transform.y}px, 0) scale(${isDragging ? 1.1 : 1})`
      : 'translate(-50%, -50%)',
    opacity: isDragging ? 0.8 : 1,
    transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.2s',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onDoubleClick={onDoubleClick}
      className="absolute z-30 cursor-move"
      data-testid={`field-player-${player.id}`}
    >
      <div 
        className={`flex flex-col items-center group ${isDragging ? 'animate-pulse' : ''}`}
      >
        {/* Player Circle */}
        <div className={`
          w-12 h-12 rounded-full 
          bg-gradient-to-br from-cyan-400 to-cyan-600
          border-3 border-white 
          flex items-center justify-center 
          text-white font-bold text-lg 
          shadow-2xl
          group-hover:scale-110 group-hover:shadow-cyan-500/50
          transition-all duration-200
          ${isDragging ? 'ring-4 ring-cyan-300 ring-opacity-50' : ''}
        `}>
          {player.number || '?'}
        </div>
        
        {/* Player Name Badge */}
        <div className="mt-1 px-2 py-0.5 bg-black/80 text-white text-xs font-semibold rounded-full whitespace-nowrap shadow-lg backdrop-blur-sm">
          {player.lastName.substring(0, 8)}
        </div>
        
        {/* Hover Info */}
        <div className="absolute top-full mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-black/90 text-white text-xs px-3 py-2 rounded-lg shadow-xl whitespace-nowrap backdrop-blur-sm">
            <div className="font-bold">{player.lastName} {player.firstName}</div>
            <div className="text-cyan-300">#{player.number} • {player.role}</div>
            <div className="text-xs text-gray-400 mt-1">Doppio click per rimuovere</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Field Component with Drop Zone and Players
function FieldWithPlayers(props: any) {
  const { setNodeRef } = useDroppable({ id: 'field' });
  
  return (
    <div className="lg:col-span-9">
      <Card className="h-full">
        <CardContent className="p-6">
          <div 
            id="tactical-field"
            ref={setNodeRef}
            className="aspect-[2/3] bg-gradient-to-b from-green-800 to-green-900 rounded-lg relative border-2 border-white overflow-hidden"
          >
            {/* Zone colorate */}
            <div className="absolute inset-0">
              <div className="absolute left-0 right-0 bg-yellow-500/10 border-t border-yellow-500/30" style={{ top: `${props.defenseLineY}%`, bottom: 0 }}>
                <div className="absolute top-2 left-2 text-yellow-400 text-xs font-bold opacity-50">PORTA</div>
              </div>
              <div className="absolute left-0 right-0 bg-blue-500/10" style={{ top: `${props.midfieldLineY}%`, bottom: `${100 - props.defenseLineY}%` }}>
                <div className="absolute top-2 left-2 text-blue-400 text-xs font-bold opacity-50">DIFESA</div>
              </div>
              <div className="absolute left-0 right-0 bg-cyan-500/10" style={{ top: `${props.attackLineY}%`, bottom: `${100 - props.midfieldLineY}%` }}>
                <div className="absolute top-2 left-2 text-cyan-400 text-xs font-bold opacity-50">CENTROCAMPO</div>
              </div>
              <div className="absolute left-0 right-0 top-0 bg-red-500/10" style={{ bottom: `${100 - props.attackLineY}%` }}>
                <div className="absolute top-2 left-2 text-red-400 text-xs font-bold opacity-50">ATTACCO</div>
              </div>
            </div>
            
            {/* Linee campo SVG */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 150" preserveAspectRatio="none">
              <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="0.4" opacity="0.9" />
              <circle cx="50" cy="75" r="10" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
              <circle cx="50" cy="75" r="0.5" fill="white" opacity="0.9" />
              <rect x="18" y="0" width="64" height="18" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
              <rect x="32" y="0" width="36" height="7" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
              <circle cx="50" cy="12" r="0.5" fill="white" opacity="0.9" />
              <path d="M 38 18 A 12 12 0 0 0 62 18" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
              <rect x="39.5" y="-0.5" width="21" height="1.5" fill="none" stroke="white" strokeWidth="0.5" opacity="1" />
              <rect x="18" y="132" width="64" height="18" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
              <rect x="32" y="143" width="36" height="7" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
              <circle cx="50" cy="138" r="0.5" fill="white" opacity="0.9" />
              <path d="M 38 132 A 12 12 0 0 1 62 132" fill="none" stroke="white" strokeWidth="0.4" opacity="0.9" />
              <rect x="39.5" y="149" width="21" height="1.5" fill="none" stroke="white" strokeWidth="0.5" opacity="1" />
              <path d="M 0 0 Q 2.5 0 2.5 2.5" fill="none" stroke="white" strokeWidth="0.3" opacity="0.7" />
              <path d="M 100 0 Q 97.5 0 97.5 2.5" fill="none" stroke="white" strokeWidth="0.3" opacity="0.7" />
              <path d="M 0 150 Q 2.5 150 2.5 147.5" fill="none" stroke="white" strokeWidth="0.3" opacity="0.7" />
              <path d="M 100 150 Q 97.5 150 97.5 147.5" fill="none" stroke="white" strokeWidth="0.3" opacity="0.7" />
            </svg>
            
            {/* Zone Lines */}
            <ZoneLine yPercent={props.defenseLineY} color="#eab308" label="Linea Difesa" isDragging={props.isDraggingDefense} onDragStart={() => props.setIsDraggingDefense(true)} onDrag={(newY) => props.setDefenseLineY(Math.max(75, Math.min(90, newY)))} onDragEnd={() => props.setIsDraggingDefense(false)} />
            <ZoneLine yPercent={props.midfieldLineY} color="#06b6d4" label="Linea Centrocampo" isDragging={props.isDraggingMidfield} onDragStart={() => props.setIsDraggingMidfield(true)} onDrag={(newY) => props.setMidfieldLineY(Math.max(45, Math.min(75, newY)))} onDragEnd={() => props.setIsDraggingMidfield(false)} />
            <ZoneLine yPercent={props.attackLineY} color="#ef4444" label="Linea Attacco" isDragging={props.isDraggingAttack} onDragStart={() => props.setIsDraggingAttack(true)} onDrag={(newY) => props.setAttackLineY(Math.max(15, Math.min(50, newY)))} onDragEnd={() => props.setIsDraggingAttack(false)} />
            
            {/* Tactical Canvas */}
            <TacticalCanvas fieldWidth={600} fieldHeight={900} currentTool={props.currentTool} currentColor={props.currentColor} currentWidth={props.currentWidth} drawings={props.drawings} onDrawingsChange={props.onDrawingsChange} />
            
            {/* Players on Field - NEW DRAGGABLE COMPONENTS */}
            {Object.entries(props.playerPositions).map(([playerId, pos]: [string, any]) => {
              const player = props.players.find((p: any) => p.id === parseInt(playerId));
              if (!player) return null;
              
              // Get tactical indicators for this player
              const indicators = getTacticalIndicatorsForPlayer(
                pos.y,
                pos.x,
                {
                  attackLineY: props.attackLineY,
                  midfieldLineY: props.midfieldLineY,
                  defenseLineY: props.defenseLineY,
                },
                props.tactics
              );
              
              return (
                <div key={playerId}>
                  <FieldPlayer
                    player={player}
                    position={pos}
                    snapToGrid={props.snapToGrid}
                    onDoubleClick={() => props.onPlayerRemove(parseInt(playerId))}
                  />
                  {indicators.length > 0 && (
                    <TacticalIndicatorOverlay
                      indicators={indicators}
                      x={pos.x}
                      y={pos.y}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Drawing tools
type DrawingTool = 'pen' | 'straight-arrow' | 'curved-arrow' | 'line' | 'circle' | 'text' | 'eraser' | null;
type Drawing = {
  type: 'pen' | 'straight-arrow' | 'curved-arrow' | 'line' | 'circle' | 'text';
  coords: any;
  color: string;
  width: number;
  text?: string;
};

// Zone validation helper
function getRoleZone(role: string): 'goal' | 'defense' | 'midfield' | 'attack' {
  const r = role.toLowerCase();
  if (r.includes('portiere')) return 'goal';
  if (r.includes('difensore') || r.includes('terzino') || r.includes('braccetto')) return 'defense';
  if (r.includes('centrocampista') || r.includes('mediano') || r.includes('mezzala')) return 'midfield';
  if (r.includes('attaccante') || r.includes('punta') || r.includes('ala')) return 'attack';
  return 'midfield'; // default
}

function getZoneFromY(y: number, lines: { attackLineY: number; midfieldLineY: number; defenseLineY: number }): 'goal' | 'defense' | 'midfield' | 'attack' {
  if (y > lines.defenseLineY) return 'goal';
  if (y > lines.midfieldLineY) return 'defense';
  if (y > lines.attackLineY) return 'midfield';
  return 'attack';
}

// Get tactical indicators for a player based on zone and selected tactics
function getTacticalIndicatorsForPlayer(
  playerY: number,
  playerX: number,
  lines: { attackLineY: number; midfieldLineY: number; defenseLineY: number },
  tactics: { goalkeeper: string; defense: string; midfield: string; attack: string }
): TacticalIndicator[] {
  const zone = getZoneFromY(playerY, lines);
  
  switch (zone) {
    case 'goal':
      const gkOption = TACTICAL_OPTIONS.goalkeeper.find(o => o.id === tactics.goalkeeper);
      return gkOption ? [...gkOption.indicators] : [];
      
    case 'defense':
      const defOption = TACTICAL_OPTIONS.defense.find(o => o.id === tactics.defense);
      // Special logic for left/right fullbacks based on X position
      if (tactics.defense === 'left-fullback-attack' && playerX < 50) {
        return defOption ? [...defOption.indicators] : [];
      }
      if (tactics.defense === 'right-fullback-attack' && playerX > 50) {
        return defOption ? [...defOption.indicators] : [];
      }
      if (tactics.defense === 'both-fullbacks-attack') {
        return defOption ? [...defOption.indicators] : [];
      }
      return defOption ? [...defOption.indicators] : [];
      
    case 'midfield':
      const mfOption = TACTICAL_OPTIONS.midfield.find(o => o.id === tactics.midfield);
      // Special logic for left/right wingers based on X position
      if (tactics.midfield === 'winger-left' && playerX < 50) {
        return mfOption ? [...mfOption.indicators] : [];
      }
      if (tactics.midfield === 'winger-right' && playerX > 50) {
        return mfOption ? [...mfOption.indicators] : [];
      }
      return mfOption ? [...mfOption.indicators] : [];
      
    case 'attack':
      const atkOption = TACTICAL_OPTIONS.attack.find(o => o.id === tactics.attack);
      return atkOption ? [...atkOption.indicators] : [];
      
    default:
      return [];
  }
}

function validatePlayerPosition(playerRole: string, positionY: number, lines: { attackLineY: number; midfieldLineY: number; defenseLineY: number }): boolean {
  const requiredZone = getRoleZone(playerRole);
  const actualZone = getZoneFromY(positionY, lines);
  return requiredZone === actualZone;
}

// JerseyCard Component
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
    <div className={`relative ${compact ? 'w-20 h-24' : 'w-24 h-28'} ${isDragging ? 'opacity-50' : ''} transition-all duration-300 hover:scale-105`}>
      <svg viewBox="0 0 120 140" className="w-full h-full drop-shadow-lg">
        <path
          d="M25,25 L35,18 L40,28 L55,28 L55,18 L65,18 L65,28 L80,28 L85,18 L95,25 L95,110 L75,125 L45,125 L25,110 Z"
          fill="#FFD700"
          stroke={borderColor}
          strokeWidth={borderWidth}
        />
        <path d="M40,28 L50,38 L60,38 L55,28 L65,28 L60,38 L55,45 L60,38 L65,28 L60,28" fill="#DC2626" />
        <path d="M55,28 L60,38 L55,45 L50,38 Z" fill="#DC2626" />
        <path d="M25,25 L35,18 L40,28 L35,45 L25,40 Z" fill="#DC2626" />
        <path d="M95,25 L85,18 L80,28 L85,45 L95,40 Z" fill="#DC2626" />
        <text x="60" y="75" textAnchor="middle" fontSize="42" fontWeight="bold" fill="#DC2626">{player.number || '?'}</text>
        <text x="60" y="100" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#000000">{roleAbbr}</text>
      </svg>
      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-black/80 px-1.5 py-0.5 rounded text-[9px] font-bold text-white whitespace-nowrap">
        {player.lastName}
      </div>
    </div>
  );
}

// Draggable Zone Line
function ZoneLine({
  label,
  yPercent,
  color,
  isDragging,
  onDragStart,
  onDrag,
  onDragEnd,
}: {
  label: string;
  yPercent: number;
  color: string;
  isDragging: boolean;
  onDragStart: () => void;
  onDrag: (newY: number) => void;
  onDragEnd: () => void;
}) {
  const lineRef = useRef<HTMLDivElement>(null);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPercent, setDragStartPercent] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    onDragStart();
    setDragStartY(e.clientY);
    setDragStartPercent(yPercent);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!lineRef.current) return;
      const parent = lineRef.current.parentElement;
      if (!parent) return;
      
      const parentRect = parent.getBoundingClientRect();
      const deltaY = moveEvent.clientY - dragStartY;
      const deltaPercent = (deltaY / parentRect.height) * 100;
      const newY = Math.max(5, Math.min(95, dragStartPercent + deltaPercent));
      onDrag(newY);
    };

    const handleMouseUp = () => {
      onDragEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={lineRef}
      className={`absolute w-full cursor-ns-resize z-30 ${isDragging ? 'opacity-80' : 'opacity-70 hover:opacity-100'} transition-opacity`}
      style={{ top: `${yPercent}%`, transform: 'translateY(-50%)' }}
      onMouseDown={handleMouseDown}
      data-testid={`zone-line-${label}`}
    >
      <div className="relative">
        <div className={`h-1 w-full`} style={{ backgroundColor: color }} />
        <div 
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/80 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap pointer-events-none"
        >
          {label}
        </div>
        <div 
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/80 px-2 py-1 rounded text-xs font-bold text-white whitespace-nowrap pointer-events-none"
        >
          {label}
        </div>
        <div 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <Move className="h-4 w-4 text-white drop-shadow-lg" />
        </div>
      </div>
    </div>
  );
}

// Tactical Canvas Component
function TacticalCanvas({
  drawings,
  currentTool,
  currentColor,
  currentWidth,
  fieldWidth,
  fieldHeight,
  onDrawingsChange,
}: {
  drawings: Drawing[];
  currentTool: DrawingTool;
  currentColor: string;
  currentWidth: number;
  fieldWidth: number;
  fieldHeight: number;
  onDrawingsChange: (drawings: Drawing[]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, fieldWidth, fieldHeight);

    drawings.forEach((drawing) => {
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = drawing.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (drawing.type === 'pen') {
        ctx.beginPath();
        drawing.coords.forEach((point: { x: number; y: number }, i: number) => {
          if (i === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.stroke();
      } else if (drawing.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(drawing.coords.x1, drawing.coords.y1);
        ctx.lineTo(drawing.coords.x2, drawing.coords.y2);
        ctx.stroke();
      } else if (drawing.type === 'straight-arrow') {
        const { x1, y1, x2, y2 } = drawing.coords;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        const angle = Math.atan2(y2 - y1, x2 - x1);
        const arrowSize = 15;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = drawing.color;
        ctx.fill();
      } else if (drawing.type === 'curved-arrow') {
        const { x1, y1, cpX, cpY, x2, y2 } = drawing.coords;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpX, cpY, x2, y2);
        ctx.stroke();
        
        const t = 0.99;
        const dx = 2 * (1 - t) * (cpX - x1) + 2 * t * (x2 - cpX);
        const dy = 2 * (1 - t) * (cpY - y1) + 2 * t * (y2 - cpY);
        const angle = Math.atan2(dy, dx);
        const arrowSize = 15;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - arrowSize * Math.cos(angle - Math.PI / 6), y2 - arrowSize * Math.sin(angle - Math.PI / 6));
        ctx.lineTo(x2 - arrowSize * Math.cos(angle + Math.PI / 6), y2 - arrowSize * Math.sin(angle + Math.PI / 6));
        ctx.closePath();
        ctx.fillStyle = drawing.color;
        ctx.fill();
      } else if (drawing.type === 'circle') {
        const { x, y, radius } = drawing.coords;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (drawing.type === 'text' && drawing.text) {
        ctx.font = `bold ${drawing.width * 3}px Arial`;
        ctx.fillStyle = drawing.color;
        ctx.fillText(drawing.text, drawing.coords.x, drawing.coords.y);
      }
    });
  }, [drawings, fieldWidth, fieldHeight]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentTool || currentTool === 'eraser') return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentTool === 'text') {
      const text = prompt('Inserisci testo:');
      if (text) {
        onDrawingsChange([...drawings, {
          type: 'text',
          coords: { x, y },
          color: currentColor,
          width: currentWidth,
          text
        }]);
      }
      return;
    }
    
    setIsDrawing(true);
    setStartPoint({ x, y });
    if (currentTool === 'pen') {
      setCurrentPath([{ x, y }]);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || !currentTool) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (currentTool === 'pen') {
      setCurrentPath(prev => [...prev, { x, y }]);
      
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, fieldWidth, fieldHeight);
        drawings.forEach(d => {});
        ctx.strokeStyle = currentColor;
        ctx.lineWidth = currentWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        currentPath.forEach((point, i) => {
          if (i === 0) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        });
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint || !currentTool) return;
    
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    let newDrawing: Drawing | null = null;
    
    if (currentTool === 'pen' && currentPath.length > 1) {
      newDrawing = {
        type: 'pen',
        coords: currentPath,
        color: currentColor,
        width: currentWidth
      };
    } else if (currentTool === 'line') {
      newDrawing = {
        type: 'line',
        coords: { x1: startPoint.x, y1: startPoint.y, x2: x, y2: y },
        color: currentColor,
        width: currentWidth
      };
    } else if (currentTool === 'straight-arrow') {
      newDrawing = {
        type: 'straight-arrow',
        coords: { x1: startPoint.x, y1: startPoint.y, x2: x, y2: y },
        color: currentColor,
        width: currentWidth
      };
    } else if (currentTool === 'curved-arrow') {
      const cpX = (startPoint.x + x) / 2 + (y - startPoint.y) * 0.3;
      const cpY = (startPoint.y + y) / 2 - (x - startPoint.x) * 0.3;
      newDrawing = {
        type: 'curved-arrow',
        coords: { x1: startPoint.x, y1: startPoint.y, cpX, cpY, x2: x, y2: y },
        color: currentColor,
        width: currentWidth
      };
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
      newDrawing = {
        type: 'circle',
        coords: { x: startPoint.x, y: startPoint.y, radius },
        color: currentColor,
        width: currentWidth
      };
    }
    
    if (newDrawing) {
      onDrawingsChange([...drawings, newDrawing]);
    }
    
    setIsDrawing(false);
    setCurrentPath([]);
    setStartPoint(null);
  };

  return (
    <canvas
      ref={canvasRef}
      width={fieldWidth}
      height={fieldHeight}
      className="absolute inset-0 pointer-events-auto z-20"
      style={{ cursor: currentTool ? 'crosshair' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        if (isDrawing) {
          setIsDrawing(false);
          setCurrentPath([]);
          setStartPoint(null);
        }
      }}
    />
  );
}

// ===== MAIN COMPONENT =====
export default function FormazioniPage() {
  const { toast } = useToast();
  
  // State: Match & Formation Selection
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [selectedFormation, setSelectedFormation] = useState<string>('4-4-2');
  
  // State: Players Positioning
  const [playerPositions, setPlayerPositions] = useState<Record<number, { x: number; y: number }>>({});
  
  // State: Zone Lines (Goalkeeper zone limited to penalty area ~83%)
  const [defenseLineY, setDefenseLineY] = useState(83);
  const [midfieldLineY, setMidfieldLineY] = useState(60);
  const [attackLineY, setAttackLineY] = useState(30);
  const [isDraggingDefense, setIsDraggingDefense] = useState(false);
  const [isDraggingMidfield, setIsDraggingMidfield] = useState(false);
  const [isDraggingAttack, setIsDraggingAttack] = useState(false);
  
  // State: Advanced UX Features
  const [snapToGrid, setSnapToGrid] = useState(false);
  
  // State: Drawing Tools
  const [currentTool, setCurrentTool] = useState<DrawingTool | null>(null);
  const [currentColor, setCurrentColor] = useState('#00eaff');
  const [currentWidth, setCurrentWidth] = useState(3);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  
  // State: Tactical Setup Management
  const [setupName, setSetupName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showLoadDialog, setShowLoadDialog] = useState(false);
  
  // State: Tactical Options per Zone
  const [goalkeeperTactic, setGoalkeeperTactic] = useState('none');
  const [defenseTactic, setDefenseTactic] = useState('none');
  const [midfieldTactic, setMidfieldTactic] = useState('none');
  const [attackTactic, setAttackTactic] = useState('none');
  
  // State: Zone filter for player list
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  
  // Queries
  const { data: matches = [] } = useQuery<any[]>({
    queryKey: ['/api/matches'],
  });
  
  const { data: rawPlayers = [] } = useQuery<Player[]>({
    queryKey: ['/api/players'],
  });
  
  // Map players to add status fields
  const players: PlayerWithStatus[] = rawPlayers.map(p => ({
    ...p,
    isInjured: p.convocationStatus === 'Infortunato',
    lowAttendance: false,
  }));
  
  const { data: savedSetups = [] } = useQuery<TacticalSetup[]>({
    queryKey: ['/api/tactical-setups', selectedMatchId],
    enabled: !!selectedMatchId,
  });
  
  // Mutations
  const saveTacticalSetupMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/tactical-setups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to save tactical setup');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tactical-setups', selectedMatchId] });
      toast({
        title: "✅ Tattica salvata",
        description: `Setup "${setupName}" salvato con successo`,
      });
      setShowSaveDialog(false);
      setSetupName('');
    },
    onError: () => {
      toast({
        title: "❌ Errore",
        description: "Impossibile salvare il setup tattico",
        variant: "destructive",
      });
    },
  });
  
  // Players grouped by role for left panel (with zone filtering)
  const playersByRole = useMemo(() => {
    const grouped: Record<string, PlayerWithStatus[]> = {
      portiere: [],
      difensore: [],
      centrocampista: [],
      attaccante: [],
    };
    
    // Filter players by zone
    const filtered = players.filter(p => {
      if (p.isInjured) return false;
      
      if (zoneFilter === 'ALL') return true;
      
      const role = p.role || '';
      if (zoneFilter === 'PORTIERE') return role.includes('Portiere');
      if (zoneFilter === 'DIFENSORE') return role.includes('Difensore') || role.includes('Terzino');
      if (zoneFilter === 'CENTROCAMPISTA') return role.includes('Centrocampista');
      if (zoneFilter === 'ATTACCANTE') return role.includes('Attaccante') || role.includes('Ala') || role.includes('punta');
      
      return true;
    });
    
    filtered.forEach(player => {
      const role = player.role || '';
      if (role.includes('Portiere')) {
        grouped.portiere.push(player);
      } else if (role.includes('Difensore') || role.includes('Terzino')) {
        grouped.difensore.push(player);
      } else if (role.includes('Centrocampista')) {
        grouped.centrocampista.push(player);
      } else if (role.includes('Attaccante') || role.includes('Ala')) {
        grouped.attaccante.push(player);
      }
    });
    
    // Sort by lastName
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
    });
    
    return grouped;
  }, [players, zoneFilter]);
  
  // Apply formation preset
  const applyFormationPreset = (formationKey: string) => {
    const preset = FORMATIONS[formationKey];
    if (!preset) return;
    
    setSelectedFormation(formationKey);
    
    // FIX: Preserve existing players and realign them to formation
    const currentPlayers = Object.keys(playerPositions).map(id => parseInt(id));
    if (currentPlayers.length > 0) {
      const newPositions: Record<number, { x: number; y: number }> = {};
      currentPlayers.forEach((playerId, idx) => {
        if (preset[idx]) {
          newPositions[playerId] = preset[idx];
        } else {
          // Keep current position if formation has fewer slots
          newPositions[playerId] = playerPositions[playerId];
        }
      });
      setPlayerPositions(newPositions);
      
      toast({
        title: "✅ Giocatori allineati",
        description: `${currentPlayers.length} giocatori riposizionati al sistema ${formationKey}`,
      });
    } else {
      toast({
        title: "🎯 Sistema selezionato",
        description: `Sistema ${formationKey} pronto - trascina i giocatori sul campo`,
      });
    }
  };
  
  // Save tactical setup
  const handleSaveTacticalSetup = () => {
    if (!selectedMatchId || !setupName.trim()) {
      toast({
        title: "⚠️ Dati mancanti",
        description: "Seleziona una partita e inserisci il nome del setup",
        variant: "destructive",
      });
      return;
    }
    
    // Convert playerPositions to array format for DB
    const playerPosArray = Object.entries(playerPositions).map(([playerId, pos]) => ({
      playerId: parseInt(playerId),
      x: pos.x,
      y: pos.y,
    }));
    
    saveTacticalSetupMutation.mutate({
      matchId: selectedMatchId,
      name: setupName.trim(),
      formationSystem: selectedFormation,
      playerPositions: playerPosArray,
      zoneLines: {
        defense: defenseLineY,
        midfield: midfieldLineY,
        attack: attackLineY,
      },
      drawingData: drawings,
      tacticalOptions: {
        goalkeeper: goalkeeperTactic,
        defense: defenseTactic,
        midfield: midfieldTactic,
        attack: attackTactic,
      },
    });
  };
  
  // Load tactical setup - APPLICA funzione
  const handleLoadTacticalSetup = (setup: typeof savedSetups[0]) => {
    try {
      // Apply formation system
      if (setup.formationSystem) {
        setSelectedFormation(setup.formationSystem);
      }
      
      // Apply player positions (convert from array to record)
      if (setup.playerPositions) {
        const positionsRecord: Record<number, { x: number; y: number }> = {};
        setup.playerPositions.forEach(pos => {
          positionsRecord[pos.playerId] = { x: pos.x, y: pos.y };
        });
        setPlayerPositions(positionsRecord);
      }
      
      // Apply zone lines
      if (setup.zoneLines) {
        setDefenseLineY(setup.zoneLines.defenseLineY);
        setMidfieldLineY(setup.zoneLines.midfieldLineY);
        setAttackLineY(setup.zoneLines.attackLineY);
      }
      
      // Apply drawings
      if (setup.drawingData) {
        setDrawings(setup.drawingData as Drawing[]);
      }
      
      // Apply tactical options
      if (setup.tacticalOptions) {
        setGoalkeeperTactic(setup.tacticalOptions.goalkeeper || 'none');
        setDefenseTactic(setup.tacticalOptions.defense || 'none');
        setMidfieldTactic(setup.tacticalOptions.midfield || 'none');
        setAttackTactic(setup.tacticalOptions.attack || 'none');
      }
      
      setShowLoadDialog(false);
      toast({
        title: "✅ Tattica caricata",
        description: `Setup "${setup.name}" applicato con successo`,
      });
    } catch (error) {
      toast({
        title: "❌ Errore",
        description: "Impossibile caricare il setup tattico",
        variant: "destructive",
      });
    }
  };
  
  // Track mouse position during drag
  const [dragMousePos, setDragMousePos] = useState<{ x: number; y: number } | null>(null);
  
  // Helper: Snap to grid (5% grid)
  const applySnapToGrid = (value: number): number => {
    if (!snapToGrid) return value;
    const gridSize = 5;
    return Math.round(value / gridSize) * gridSize;
  };
  
  // Helper: Remove player from field
  const removePlayer = (playerId: number) => {
    setPlayerPositions(prev => {
      const updated = { ...prev };
      delete updated[playerId];
      return updated;
    });
    const player = players.find(p => p.id === playerId);
    if (player) {
      toast({
        title: "🔄 Giocatore rimosso",
        description: `${player.lastName} rimosso dal campo`,
      });
    }
  };
  
  // Drag & Drop handler
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeId = active.id.toString();
    
    // Determine if dragging from sidebar or field
    const isFromSidebar = activeId.startsWith('sidebar-');
    const isFromField = activeId.startsWith('field-');
    const playerId = parseInt(activeId.replace('sidebar-', '').replace('field-', ''));
    const player = players.find(p => p.id === playerId);
    if (!player) return;
    
    // DRAG OUT: Remove player if dragged outside field
    if (!over || over.id !== 'field') {
      if (isFromField && playerPositions[playerId]) {
        removePlayer(playerId);
      }
      setDragMousePos(null);
      return;
    }
    
    // Get drop coordinates using final mouse position
    const fieldElement = document.getElementById('tactical-field');
    if (!fieldElement || !dragMousePos) return;
    
    const rect = fieldElement.getBoundingClientRect();
    let x = (dragMousePos.x - rect.left) / rect.width * 100;
    let y = (dragMousePos.y - rect.top) / rect.height * 100;
    
    // Apply snap to grid if enabled
    x = applySnapToGrid(x);
    y = applySnapToGrid(y);
    
    // Clamp to field boundaries
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));
    
    // Validate zone based on player role
    const zone = getZoneForY(y);
    const role = player.role || '';
    
    if (!isPlayerAllowedInZone(role, zone)) {
      toast({
        title: "❌ Zona non valida",
        description: `${player.lastName} (${role}) non può essere posizionato nella zona ${zone}`,
        variant: "destructive",
      });
      setDragMousePos(null);
      return;
    }
    
    // REPOSITION: If from field, just update position
    if (isFromField) {
      setPlayerPositions(prev => ({
        ...prev,
        [playerId]: { x, y }
      }));
      toast({
        title: "🔄 Giocatore riposizionato",
        description: `${player.lastName} spostato nella zona ${zone}`,
      });
      setDragMousePos(null);
      return;
    }
    
    // NEW PLACEMENT: Check if player already on field
    if (isFromSidebar && playerPositions[playerId]) {
      toast({
        title: "⚠️ Giocatore già presente",
        description: `${player.lastName} è già sul campo`,
        variant: "destructive",
      });
      setDragMousePos(null);
      return;
    }
    
    // Place player on field
    setPlayerPositions(prev => ({
      ...prev,
      [playerId]: { x, y }
    }));
    
    toast({
      title: "✅ Giocatore posizionato",
      description: `${player.lastName} nella zona ${zone}`,
    });
    
    setDragMousePos(null);
  };
  
  // Helper: Get zone based on Y coordinate
  const getZoneForY = (y: number): string => {
    if (y < attackLineY) return 'ATTACCO';
    if (y < midfieldLineY) return 'CENTROCAMPO';
    if (y < defenseLineY) return 'DIFESA';
    return 'PORTA';
  };
  
  // Helper: Validate if player role is allowed in zone
  const isPlayerAllowedInZone = (role: string, zone: string): boolean => {
    const roleNormalized = role.toLowerCase();
    
    if (zone === 'PORTA') {
      return roleNormalized.includes('portiere');
    }
    if (zone === 'DIFESA') {
      return roleNormalized.includes('difensore') || roleNormalized.includes('terzino');
    }
    if (zone === 'CENTROCAMPO') {
      return roleNormalized.includes('centrocampista') || roleNormalized.includes('mediano') || 
             roleNormalized.includes('trequartista') || roleNormalized.includes('mezzala');
    }
    if (zone === 'ATTACCO') {
      return roleNormalized.includes('attaccante') || roleNormalized.includes('ala') || 
             roleNormalized.includes('punta');
    }
    
    return false;
  };

  // Track mouse position during drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setDragMousePos({ x: e.clientX, y: e.clientY });
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-background">
        <Navigation />
        
        <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-card rounded-lg border">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Formazione Tattica Avanzata</h1>
              <p className="text-sm text-muted-foreground">
                Zone, linee divisorie e schemi tattici
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Match Selection */}
            <Select
              value={selectedMatchId?.toString() || ''}
              onValueChange={(value) => setSelectedMatchId(parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-[250px]" data-testid="select-match">
                <SelectValue placeholder="Seleziona Partita" />
              </SelectTrigger>
              <SelectContent>
                {matches.map((match) => (
                  <SelectItem key={match.id} value={match.id.toString()}>
                    {match.opponent} - {new Date(match.matchDate).toLocaleDateString('it-IT')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Formation System */}
            <Select
              value={selectedFormation}
              onValueChange={applyFormationPreset}
            >
              <SelectTrigger className="w-full sm:w-[150px]" data-testid="select-formation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(FORMATIONS).map((formation) => (
                  <SelectItem key={formation} value={formation}>
                    {formation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Tactical Tools Toolbar - Horizontal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <SaveIcon className="w-5 h-5" />
              Opzioni Tattiche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Positioning Options - NEW */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">⚡ Posizionamento</h3>
                <div className="space-y-2">
                  <Button
                    size="sm"
                    variant={snapToGrid ? "default" : "outline"}
                    className="w-full"
                    onClick={() => setSnapToGrid(!snapToGrid)}
                    data-testid="button-snap-grid"
                  >
                    <Move className="w-4 h-4 mr-2" />
                    {snapToGrid ? "Griglia ON" : "Griglia OFF"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => applyFormationPreset(selectedFormation)}
                    disabled={Object.keys(playerPositions).length === 0}
                    data-testid="button-align-formation"
                  >
                    <Activity className="w-4 h-4 mr-2" />
                    Allinea
                  </Button>
                </div>
              </div>
              
              {/* Setup Name */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">📝 Nome Tattica</h3>
                <Input
                  placeholder="es: Calcio d'angolo passivo"
                  value={setupName}
                  onChange={(e) => setSetupName(e.target.value)}
                  data-testid="input-setup-name"
                />
              </div>
              
              {/* Save/Load Actions */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">💾 Salva/Carica</h3>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={handleSaveTacticalSetup}
                    disabled={!selectedMatchId || !setupName.trim() || saveTacticalSetupMutation.isPending}
                    data-testid="button-save-setup"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salva
                  </Button>
                  
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => setShowLoadDialog(true)}
                    disabled={!selectedMatchId || savedSetups.length === 0}
                    data-testid="button-load-setup"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Carica ({savedSetups.length})
                  </Button>
                </div>
              </div>
              
              {/* Drawing Tools */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">🎨 Disegno</h3>
                <div className="grid grid-cols-3 gap-2">
                  <Button size="sm" variant="outline" disabled>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" disabled>
                    <Circle className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* 2-Column Layout: Players + Field */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* LEFT: Players Panel */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Giocatori Convocati
              </CardTitle>
              {/* Zone Filters */}
              <div className="flex flex-wrap gap-1 mt-3">
                <Button
                  size="sm"
                  variant={zoneFilter === 'ALL' ? 'default' : 'outline'}
                  onClick={() => setZoneFilter('ALL')}
                  className="h-7 text-xs"
                  data-testid="filter-all"
                >
                  Tutti
                </Button>
                <Button
                  size="sm"
                  variant={zoneFilter === 'PORTIERE' ? 'default' : 'outline'}
                  onClick={() => setZoneFilter('PORTIERE')}
                  className="h-7 text-xs"
                  data-testid="filter-goalkeeper"
                >
                  🥅 POR
                </Button>
                <Button
                  size="sm"
                  variant={zoneFilter === 'DIFENSORE' ? 'default' : 'outline'}
                  onClick={() => setZoneFilter('DIFENSORE')}
                  className="h-7 text-xs"
                  data-testid="filter-defense"
                >
                  🛡️ DIF
                </Button>
                <Button
                  size="sm"
                  variant={zoneFilter === 'CENTROCAMPISTA' ? 'default' : 'outline'}
                  onClick={() => setZoneFilter('CENTROCAMPISTA')}
                  className="h-7 text-xs"
                  data-testid="filter-midfield"
                >
                  ⚙️ CEN
                </Button>
                <Button
                  size="sm"
                  variant={zoneFilter === 'ATTACCANTE' ? 'default' : 'outline'}
                  onClick={() => setZoneFilter('ATTACCANTE')}
                  className="h-7 text-xs"
                  data-testid="filter-attack"
                >
                  ⚽ ATT
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {ROLE_GROUPS.map((group) => (
                <div key={group.id} className="space-y-2">
                  <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                    <span>{group.icon}</span>
                    {group.label}
                  </h3>
                  <div className="space-y-1">
                    {playersByRole[group.id].map((player) => (
                      <DraggablePlayer 
                        key={player.id} 
                        player={player} 
                        isOnField={!!playerPositions[player.id]}
                      />
                    ))}
                    {playersByRole[group.id].length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Nessun giocatore</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          {/* CENTER: Field with Tactical Controls */}
          <Card className="lg:col-span-9">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 mb-3">
                🎯 Opzioni Tattiche per Zona
              </CardTitle>
              {/* Tactical Dropdowns - Integrated with Field */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {/* Goalkeeper */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-primary">🥅 PORTIERE</label>
                  <Select value={goalkeeperTactic} onValueChange={setGoalkeeperTactic}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-goalkeeper-tactic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TACTICAL_OPTIONS.goalkeeper.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Defense */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-cyan-400">🛡️ DIFESA</label>
                  <Select value={defenseTactic} onValueChange={setDefenseTactic}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-defense-tactic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TACTICAL_OPTIONS.defense.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Midfield */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-yellow-400">⚙️ CENTROCAMPO</label>
                  <Select value={midfieldTactic} onValueChange={setMidfieldTactic}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-midfield-tactic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TACTICAL_OPTIONS.midfield.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Attack */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-pink-500">⚽ ATTACCO</label>
                  <Select value={attackTactic} onValueChange={setAttackTactic}>
                    <SelectTrigger className="h-8 text-xs" data-testid="select-attack-tactic">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TACTICAL_OPTIONS.attack.map((opt) => (
                        <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="p-0">
              <FieldWithPlayers
                playerPositions={playerPositions}
                players={players}
                defenseLineY={defenseLineY}
                midfieldLineY={midfieldLineY}
                attackLineY={attackLineY}
                currentTool={currentTool}
                currentColor={currentColor}
                currentWidth={currentWidth}
                drawings={drawings}
                onDrawingsChange={setDrawings}
                isDraggingDefense={isDraggingDefense}
                isDraggingMidfield={isDraggingMidfield}
                isDraggingAttack={isDraggingAttack}
                setDefenseLineY={setDefenseLineY}
                setMidfieldLineY={setMidfieldLineY}
                snapToGrid={snapToGrid}
                onPlayerRemove={removePlayer}
                setAttackLineY={setAttackLineY}
                setIsDraggingDefense={setIsDraggingDefense}
                setIsDraggingMidfield={setIsDraggingMidfield}
                tactics={{
                  goalkeeper: goalkeeperTactic,
                  defense: defenseTactic,
                  midfield: midfieldTactic,
                  attack: attackTactic,
                }}
                setIsDraggingAttack={setIsDraggingAttack}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Load Tactical Setup Dialog */}
      <Dialog open={showLoadDialog} onOpenChange={setShowLoadDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📋 Carica Tattica Salvata</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            {savedSetups.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nessuna tattica salvata per questa partita
              </p>
            ) : (
              savedSetups.map((setup) => (
                <Card key={setup.id} className="hover-elevate">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{setup.name}</h3>
                        <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                          {setup.formationSystem && (
                            <Badge variant="outline">{setup.formationSystem}</Badge>
                          )}
                          <span>{new Date(setup.createdAt).toLocaleDateString('it-IT')}</span>
                          <span>{new Date(setup.createdAt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {setup.tacticalOptions && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {setup.tacticalOptions.goalkeeper !== 'none' && (
                              <Badge variant="secondary" className="text-[10px]">
                                🥅 {TACTICAL_OPTIONS.goalkeeper.find(o => o.id === setup.tacticalOptions?.goalkeeper)?.label}
                              </Badge>
                            )}
                            {setup.tacticalOptions.defense !== 'none' && (
                              <Badge variant="secondary" className="text-[10px]">
                                🛡️ {TACTICAL_OPTIONS.defense.find(o => o.id === setup.tacticalOptions?.defense)?.label}
                              </Badge>
                            )}
                            {setup.tacticalOptions.midfield !== 'none' && (
                              <Badge variant="secondary" className="text-[10px]">
                                ⚙️ {TACTICAL_OPTIONS.midfield.find(o => o.id === setup.tacticalOptions?.midfield)?.label}
                              </Badge>
                            )}
                            {setup.tacticalOptions.attack !== 'none' && (
                              <Badge variant="secondary" className="text-[10px]">
                                ⚽ {TACTICAL_OPTIONS.attack.find(o => o.id === setup.tacticalOptions?.attack)?.label}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleLoadTacticalSetup(setup)}
                        data-testid={`button-apply-setup-${setup.id}`}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Applica
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLoadDialog(false)}>
              Annulla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </DndContext>
  );
}
