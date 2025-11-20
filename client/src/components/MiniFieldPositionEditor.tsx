import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Save, X } from 'lucide-react';

// Formazioni disponibili
const FORMATIONS = [
  '4-4-2',
  '4-3-3',
  '3-5-2',
  '4-2-3-1',
  '3-4-3',
  '4-5-1',
  '5-3-2',
  '5-4-1',
  '4-3-2-1',
  '3-4-1-2'
];

// Posizioni abbreviate
const POSITION_ABBREVIATIONS: Record<string, string> = {
  'POR': 'Portiere',
  'TD': 'Terzino Destro',
  'TS': 'Terzino Sinistro',
  'DC': 'Difensore Centrale',
  'ED': 'Esterno Destro',
  'ES': 'Esterno Sinistro',
  'CC': 'Centrocampista Centrale',
  'CDC': 'Centrocampista Difensivo Centrale',
  'COC': 'Centrocampista Offensivo Centrale',
  'TRQ': 'Trequartista',
  'ALA': 'Ala',
  'AD': 'Ala Destra',
  'AS': 'Ala Sinistra',
  'ATT': 'Attaccante',
  'PC': 'Punta Centrale'
};

// Zone cliccabili per formazione (coordinate percentuali)
const getFormationZones = (formation: string) => {
  const zones: Array<{
    id: string;
    label: string;
    x: number; // percentuale larghezza
    y: number; // percentuale altezza
    abbr: string;
  }> = [];

  switch (formation) {
    case '4-4-2':
      zones.push(
        { id: 'por', label: 'Portiere', x: 50, y: 90, abbr: 'POR' },
        { id: 'td', label: 'Terzino Destro', x: 80, y: 70, abbr: 'TD' },
        { id: 'dc1', label: 'Difensore Centrale', x: 60, y: 70, abbr: 'DC' },
        { id: 'dc2', label: 'Difensore Centrale', x: 40, y: 70, abbr: 'DC' },
        { id: 'ts', label: 'Terzino Sinistro', x: 20, y: 70, abbr: 'TS' },
        { id: 'ed', label: 'Esterno Destro', x: 80, y: 45, abbr: 'ED' },
        { id: 'cc1', label: 'Centrocampista Centrale', x: 60, y: 45, abbr: 'CC' },
        { id: 'cc2', label: 'Centrocampista Centrale', x: 40, y: 45, abbr: 'CC' },
        { id: 'es', label: 'Esterno Sinistro', x: 20, y: 45, abbr: 'ES' },
        { id: 'att1', label: 'Attaccante', x: 60, y: 20, abbr: 'ATT' },
        { id: 'att2', label: 'Attaccante', x: 40, y: 20, abbr: 'ATT' }
      );
      break;
    case '4-3-3':
      zones.push(
        { id: 'por', label: 'Portiere', x: 50, y: 90, abbr: 'POR' },
        { id: 'td', label: 'Terzino Destro', x: 80, y: 70, abbr: 'TD' },
        { id: 'dc1', label: 'Difensore Centrale', x: 60, y: 70, abbr: 'DC' },
        { id: 'dc2', label: 'Difensore Centrale', x: 40, y: 70, abbr: 'DC' },
        { id: 'ts', label: 'Terzino Sinistro', x: 20, y: 70, abbr: 'TS' },
        { id: 'cc1', label: 'Centrocampista', x: 65, y: 50, abbr: 'CC' },
        { id: 'cc2', label: 'Centrocampista', x: 50, y: 50, abbr: 'CC' },
        { id: 'cc3', label: 'Centrocampista', x: 35, y: 50, abbr: 'CC' },
        { id: 'ad', label: 'Ala Destra', x: 75, y: 25, abbr: 'AD' },
        { id: 'pc', label: 'Punta Centrale', x: 50, y: 20, abbr: 'PC' },
        { id: 'as', label: 'Ala Sinistra', x: 25, y: 25, abbr: 'AS' }
      );
      break;
    case '3-5-2':
      zones.push(
        { id: 'por', label: 'Portiere', x: 50, y: 90, abbr: 'POR' },
        { id: 'dc1', label: 'Difensore Centrale', x: 65, y: 72, abbr: 'DC' },
        { id: 'dc2', label: 'Difensore Centrale', x: 50, y: 72, abbr: 'DC' },
        { id: 'dc3', label: 'Difensore Centrale', x: 35, y: 72, abbr: 'DC' },
        { id: 'ed', label: 'Esterno Destro', x: 85, y: 50, abbr: 'ED' },
        { id: 'cc1', label: 'Centrocampista', x: 65, y: 50, abbr: 'CC' },
        { id: 'cc2', label: 'Centrocampista', x: 50, y: 50, abbr: 'CC' },
        { id: 'cc3', label: 'Centrocampista', x: 35, y: 50, abbr: 'CC' },
        { id: 'es', label: 'Esterno Sinistro', x: 15, y: 50, abbr: 'ES' },
        { id: 'att1', label: 'Attaccante', x: 60, y: 20, abbr: 'ATT' },
        { id: 'att2', label: 'Attaccante', x: 40, y: 20, abbr: 'ATT' }
      );
      break;
    case '4-2-3-1':
      zones.push(
        { id: 'por', label: 'Portiere', x: 50, y: 90, abbr: 'POR' },
        { id: 'td', label: 'Terzino Destro', x: 80, y: 70, abbr: 'TD' },
        { id: 'dc1', label: 'Difensore Centrale', x: 60, y: 70, abbr: 'DC' },
        { id: 'dc2', label: 'Difensore Centrale', x: 40, y: 70, abbr: 'DC' },
        { id: 'ts', label: 'Terzino Sinistro', x: 20, y: 70, abbr: 'TS' },
        { id: 'cdc1', label: 'Centrocampista Difensivo', x: 60, y: 55, abbr: 'CDC' },
        { id: 'cdc2', label: 'Centrocampista Difensivo', x: 40, y: 55, abbr: 'CDC' },
        { id: 'ad', label: 'Ala Destra', x: 75, y: 35, abbr: 'AD' },
        { id: 'trq', label: 'Trequartista', x: 50, y: 35, abbr: 'TRQ' },
        { id: 'as', label: 'Ala Sinistra', x: 25, y: 35, abbr: 'AS' },
        { id: 'pc', label: 'Punta Centrale', x: 50, y: 15, abbr: 'PC' }
      );
      break;
    default:
      // Default generico
      zones.push({ id: 'por', label: 'Portiere', x: 50, y: 90, abbr: 'POR' });
  }

  return zones;
};

interface MiniFieldPositionEditorProps {
  currentPositions: Record<string, string>;
  onSave: (positions: Record<string, string>) => void;
  playerRole?: string;
}

export function MiniFieldPositionEditor({ currentPositions, onSave, playerRole }: MiniFieldPositionEditorProps) {
  const [selectedFormation, setSelectedFormation] = useState<string>('4-4-2');
  const [positions, setPositions] = useState<Record<string, string>>(currentPositions || {});
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);
  const [sameForAll, setSameForAll] = useState<boolean>(!!currentPositions?.['*']);

  const zones = getFormationZones(selectedFormation);
  const currentPosition = sameForAll ? positions['*'] : positions[selectedFormation];

  const handleZoneClick = (abbr: string) => {
    if (sameForAll) {
      // Salva per TUTTE le formazioni con chiave speciale '*'
      setPositions({ '*': abbr });
    } else {
      setPositions(prev => ({
        ...prev,
        [selectedFormation]: abbr
      }));
    }
  };

  const handleClearFormation = () => {
    if (sameForAll) {
      setPositions({});
      setSameForAll(false);
    } else {
      const updated = { ...positions };
      delete updated[selectedFormation];
      setPositions(updated);
    }
  };

  const handleToggleSameForAll = (checked: boolean) => {
    setSameForAll(checked);
    if (checked) {
      // Se c'è una posizione corrente, convertila in globale
      if (currentPosition) {
        setPositions({ '*': currentPosition });
      } else {
        // Reset per permettere di selezionare una nuova posizione globale
        setPositions({});
      }
    } else if (positions['*']) {
      // Converti da globale a specifica per la formazione corrente
      const globalPos = positions['*'];
      setPositions({ [selectedFormation]: globalPos });
    }
  };

  const handleSave = () => {
    onSave(positions);
  };

  return (
    <Card className="border-cyan-500/30">
      <CardHeader>
        <CardTitle className="text-lg text-cyan-500 flex items-center justify-between">
          <span>Posizioni per Formazione</span>
          <Button size="sm" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Salva Modifiche Ruoli
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Checkbox: Stessa posizione per tutte le formazioni */}
        <div className="flex items-center space-x-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
          <Checkbox 
            id="same-for-all" 
            checked={sameForAll} 
            onCheckedChange={handleToggleSameForAll}
            data-testid="checkbox-same-position-all"
          />
          <label 
            htmlFor="same-for-all" 
            className="text-sm font-medium cursor-pointer select-none"
          >
            ✅ Stessa posizione per tutte le formazioni
          </label>
        </div>

        {/* Selezione Formazione */}
        {!sameForAll && (
          <div>
            <label className="text-sm font-medium mb-2 block">Seleziona Modulo:</label>
            <Select value={selectedFormation} onValueChange={setSelectedFormation}>
              <SelectTrigger className="w-full" data-testid="select-formation-module">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMATIONS.map(formation => (
                  <SelectItem key={formation} value={formation}>
                    {formation} {positions[formation] && `(${positions[formation]})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Mini Campo Interattivo */}
        <div className="bg-gradient-to-b from-green-900 to-green-800 rounded-lg p-4 relative" style={{ height: '400px' }}>
          {/* Linee campo */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-12 border-2 border-white/30"></div>
            <div className="absolute top-1/2 left-0 w-full h-px bg-white/30"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border-2 border-white/30"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-12 border-2 border-white/30"></div>
          </div>

          {/* Zone cliccabili */}
          {zones.map(zone => {
            const isSelected = currentPosition === zone.abbr;
            const isHovered = hoveredZone === zone.id;

            return (
              <button
                key={zone.id}
                onClick={() => handleZoneClick(zone.abbr)}
                onMouseEnter={() => setHoveredZone(zone.id)}
                onMouseLeave={() => setHoveredZone(null)}
                className={`absolute w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-cyan-500 text-black scale-110 ring-4 ring-cyan-300' 
                    : isHovered
                    ? 'bg-pink-500/80 text-white scale-105'
                    : 'bg-white/60 text-black hover:bg-white/80'
                }`}
                style={{
                  left: `${zone.x}%`,
                  top: `${zone.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
                data-testid={`zone-${zone.id}`}
              >
                {zone.abbr}
              </button>
            );
          })}
        </div>

        {/* Info Posizione Corrente */}
        <div className="space-y-2">
          {currentPosition ? (
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
              <div>
                <p className="text-sm font-medium">
                  {sameForAll ? 'Posizione per TUTTE le formazioni:' : `Posizione in ${selectedFormation}:`}
                </p>
                <p className="text-lg font-bold text-cyan-500">{POSITION_ABBREVIATIONS[currentPosition] || currentPosition}</p>
                {sameForAll && (
                  <p className="text-xs text-green-400 mt-1">✓ Applicata a tutti i moduli</p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={handleClearFormation} data-testid="button-clear-formation-position">
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="text-center p-4 text-muted-foreground text-sm">
              {sameForAll 
                ? 'Click su una zona del campo per assegnare la posizione per TUTTE le formazioni' 
                : `Click su una zona del campo per assegnare la posizione in ${selectedFormation}`
              }
            </div>
          )}
        </div>

        {/* Riepilogo Posizioni Salvate */}
        {Object.keys(positions).length > 0 && !sameForAll && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Posizioni Personalizzate:</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(positions)
                .filter(([formation]) => formation !== '*')
                .map(([formation, pos]) => (
                  <Badge key={formation} variant="outline" className="gap-1">
                    {formation}: {pos}
                  </Badge>
                ))}
            </div>
          </div>
        )}

        {playerRole && (
          <div className="text-xs text-muted-foreground">
            Ruolo principale: {playerRole}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
