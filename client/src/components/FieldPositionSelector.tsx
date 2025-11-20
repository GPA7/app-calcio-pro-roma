import { useState } from "react";
import { Badge } from "@/components/ui/badge";

interface Position {
  id: string;
  name: string;
  x: number; // percentage from left
  y: number; // percentage from top
  zone: 'defense' | 'midfield' | 'attack' | 'goalkeeper';
}

const POSITIONS: Position[] = [
  // Goalkeeper
  { id: 'GK', name: 'Portiere', x: 50, y: 90, zone: 'goalkeeper' },
  
  // Defense
  { id: 'CB', name: 'Difensore Centrale', x: 50, y: 75, zone: 'defense' },
  { id: 'LB', name: 'Terzino Sinistro', x: 15, y: 75, zone: 'defense' },
  { id: 'RB', name: 'Terzino Destro', x: 85, y: 75, zone: 'defense' },
  
  // Midfield
  { id: 'CDM', name: 'Mediano', x: 50, y: 55, zone: 'midfield' },
  { id: 'CM', name: 'Centrocampista', x: 50, y: 45, zone: 'midfield' },
  { id: 'LM', name: 'Esterno Sinistro', x: 15, y: 45, zone: 'midfield' },
  { id: 'RM', name: 'Esterno Destro', x: 85, y: 45, zone: 'midfield' },
  { id: 'CAM', name: 'Trequartista', x: 50, y: 30, zone: 'midfield' },
  
  // Attack
  { id: 'LW', name: 'Ala Sinistra', x: 20, y: 20, zone: 'attack' },
  { id: 'RW', name: 'Ala Destra', x: 80, y: 20, zone: 'attack' },
  { id: 'ST', name: 'Punta Centrale', x: 50, y: 15, zone: 'attack' },
];

const getZoneColor = (zone: string) => {
  switch (zone) {
    case 'goalkeeper': return 'bg-green-500';
    case 'defense': return 'bg-blue-500';
    case 'midfield': return 'bg-cyan-500';
    case 'attack': return 'bg-pink-500';
    default: return 'bg-gray-500';
  }
};

interface FieldPositionSelectorProps {
  value?: string;
  onChange: (position: string) => void;
}

export default function FieldPositionSelector({ value, onChange }: FieldPositionSelectorProps) {
  const selectedPosition = POSITIONS.find(p => p.name === value);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-primary">Posizione Principale in Campo</h3>
        {selectedPosition && (
          <Badge className={`${getZoneColor(selectedPosition.zone)} text-white`}>
            {selectedPosition.name}
          </Badge>
        )}
      </div>

      {/* Soccer Field */}
      <div className="relative w-full aspect-[2/3] bg-gradient-to-b from-green-600 to-green-700 rounded-lg border-2 border-white/30 overflow-hidden">
        {/* Field lines */}
        <div className="absolute inset-0">
          {/* Center line */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/40"></div>
          
          {/* Center circle */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white/40 rounded-full"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white/60 rounded-full"></div>
          
          {/* Penalty areas */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-16 border-2 border-t-2 border-white/40 border-b-0"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 border-2 border-b-2 border-white/40 border-t-0"></div>
          
          {/* Goals */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-2 bg-white/60"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-2 bg-white/60"></div>
        </div>

        {/* Position Markers */}
        {POSITIONS.map((pos) => (
          <button
            key={pos.id}
            onClick={() => onChange(pos.name)}
            className={`absolute w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold transition-all hover:scale-125 ${
              selectedPosition?.id === pos.id 
                ? `${getZoneColor(pos.zone)} ring-4 ring-white scale-125 z-10` 
                : 'bg-white/20 hover:bg-white/40'
            }`}
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            data-testid={`position-${pos.id}`}
          >
            {pos.id}
          </button>
        ))}
      </div>

      {/* Position Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-muted-foreground">Portiere</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className="text-muted-foreground">Difesa</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
          <span className="text-muted-foreground">Centrocampo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-pink-500"></div>
          <span className="text-muted-foreground">Attacco</span>
        </div>
      </div>
    </div>
  );
}
