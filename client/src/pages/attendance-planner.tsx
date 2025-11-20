import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Download, Calendar, Settings } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import * as XLSX from 'xlsx';
import type { Player, TrainingAttendance } from "@shared/schema";

export default function AttendancePlannerPage() {
  const { toast } = useToast();
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('month');
  
  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState({
    number: true,
    name: true,
    role: true,
    presenti: true,
    assenti: true,
    infortuni: true,
    totale: true,
    percentuale: true,
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['/api/players'],
  });

  const { data: attendances = [] } = useQuery<TrainingAttendance[]>({
    queryKey: ['/api/attendances'],
  });

  // Helper to get date range based on period
  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (timePeriod === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { start: weekStart, end: now };
    } else if (timePeriod === 'month') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: monthStart, end: now };
    } else {
      const yearStart = new Date(now.getFullYear(), 0, 1);
      return { start: yearStart, end: now };
    }
  };

  // Filter attendances by date range
  const filterAttendancesByRange = (playerId: number) => {
    const { start, end } = getDateRange();
    return attendances.filter(att => {
      if (att.playerId !== playerId) return false;
      const attDate = new Date(att.date + 'T00:00:00');
      const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59);
      return attDate >= startDate && attDate <= endDate;
    });
  };

  // Helper to categorize players by role
  const getRoleCategory = (role: string | null): string => {
    if (!role) return 'Attaccanti';
    const roleLower = role.toLowerCase();
    
    if (roleLower.includes('portiere')) return 'Portieri';
    if (roleLower.includes('difensore') || roleLower.includes('terzino')) return 'Difensori';
    if (roleLower.includes('centrocampista') || roleLower.includes('mediano') || 
        roleLower.includes('trequartista') || roleLower.includes('ala')) return 'Centrocampisti';
    return 'Attaccanti';
  };

  // Group players by role category (memoized)
  const { groupedPlayers, sortedPlayers } = useMemo(() => {
    const grouped = {
      'Portieri': [] as Player[],
      'Difensori': [] as Player[],
      'Centrocampisti': [] as Player[],
      'Attaccanti': [] as Player[]
    };

    players.forEach(player => {
      const category = getRoleCategory(player.role);
      grouped[category as keyof typeof grouped].push(player);
    });

    // Sort each group alphabetically
    Object.keys(grouped).forEach(category => {
      grouped[category as keyof typeof grouped].sort((a, b) => {
        const nameA = `${a.lastName} ${a.firstName}`;
        const nameB = `${b.lastName} ${b.firstName}`;
        return nameA.localeCompare(nameB, 'it');
      });
    });

    const sorted = [
      ...grouped['Portieri'],
      ...grouped['Difensori'],
      ...grouped['Centrocampisti'],
      ...grouped['Attaccanti']
    ];

    return { groupedPlayers: grouped, sortedPlayers: sorted };
  }, [players]);

  // Calculate total training sessions in period (memoized - updates when timePeriod or attendances change)
  const totalTrainingSessions = useMemo(() => {
    const { start, end } = getDateRange();
    const uniqueDates = new Set(
      attendances
        .filter(att => {
          const attDate = new Date(att.date + 'T00:00:00');
          return attDate >= start && attDate <= end;
        })
        .map(att => att.date)
    );
    return uniqueDates.size;
  }, [timePeriod, attendances]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = sortedPlayers.map(player => {
      const playerAttendances = filterAttendancesByRange(player.id);
      const presentiCount = playerAttendances.filter(a => a.status === 'Presente').length;
      const assentiCount = playerAttendances.filter(a => a.status === 'Assente').length;
      const infortuniCount = playerAttendances.filter(a => a.status === 'Infortunato').length;
      const totale = presentiCount + assentiCount + infortuniCount;
      const percentuale = totale > 0 ? Math.round((presentiCount / totale) * 100) : 0;

      const row: any = {};
      if (visibleColumns.number) row['N°'] = player.number || '';
      if (visibleColumns.name) row['Giocatore'] = `${player.lastName} ${player.firstName}`;
      if (visibleColumns.role) row['Ruolo'] = player.role || 'N/D';
      if (visibleColumns.presenti) row['Presenti'] = presentiCount;
      if (visibleColumns.assenti) row['Assenti'] = assentiCount;
      if (visibleColumns.infortuni) row['Infortuni'] = infortuniCount;
      if (visibleColumns.totale) row['Totale'] = totale;
      if (visibleColumns.percentuale) row['% Presenze'] = `${percentuale}%`;
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presenze');
    
    const periodLabel = timePeriod === 'week' ? 'Settimana' : timePeriod === 'month' ? 'Mese' : 'Anno';
    const fileName = `Planner_Presenze_${periodLabel}_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
    toast({ title: "✅ Export Excel completato", description: `File: ${fileName}` });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-primary">Planner Presenze</h1>
            <p className="text-lg text-muted-foreground">
              Monitora presenze, assenze e infortuni agli allenamenti
            </p>
          </div>

          <Card className="border-primary/30 border-2">
            <CardHeader className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-2xl text-primary">Registro Presenze ({players.length} Giocatori)</CardTitle>
                  <p className="text-sm text-muted-foreground font-semibold">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Allenamenti nel periodo: <span className="text-primary">{totalTrainingSessions}</span>
                  </p>
                </div>
                
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-muted-foreground font-semibold">Periodo:</span>
                  <Select value={timePeriod} onValueChange={(v) => setTimePeriod(v as any)}>
                    <SelectTrigger className="w-32" data-testid="select-time-period">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Settimana</SelectItem>
                      <SelectItem value="month">Mese</SelectItem>
                      <SelectItem value="year">Anno</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Settings className="h-4 w-4" />
                        Colonne
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Visualizza Colonne</h4>
                        <div className="grid gap-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.number}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, number: !!checked }))}
                            />
                            <span className="text-sm">N° Maglia</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.name}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, name: !!checked }))}
                            />
                            <span className="text-sm">Nome</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.role}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, role: !!checked }))}
                            />
                            <span className="text-sm">Ruolo</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.presenti}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, presenti: !!checked }))}
                            />
                            <span className="text-sm">✅ Presenti</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.assenti}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, assenti: !!checked }))}
                            />
                            <span className="text-sm">❌ Assenti</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.infortuni}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, infortuni: !!checked }))}
                            />
                            <span className="text-sm">🤕 Infortuni</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.totale}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, totale: !!checked }))}
                            />
                            <span className="text-sm">📊 Totale</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <Checkbox 
                              checked={visibleColumns.percentuale}
                              onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, percentuale: !!checked }))}
                            />
                            <span className="text-sm">% Presenze</span>
                          </label>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Button 
                    onClick={handleExportExcel}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                    data-testid="button-export-excel"
                  >
                    <Download className="h-4 w-4" />
                    Export Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-primary/50">
                      {visibleColumns.number && <th className="text-left py-3 px-4 font-semibold text-sm bg-background">N°</th>}
                      {visibleColumns.name && <th className="text-left py-3 px-4 font-semibold text-sm bg-background">Giocatore</th>}
                      {visibleColumns.role && <th className="text-left py-3 px-4 font-semibold text-sm bg-background">Ruolo</th>}
                      {visibleColumns.presenti && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">✅ Presenti</th>}
                      {visibleColumns.assenti && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">❌ Assenti</th>}
                      {visibleColumns.infortuni && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">🤕 Infortuni</th>}
                      {visibleColumns.totale && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">📊 Totale</th>}
                      {visibleColumns.percentuale && <th className="text-center py-3 px-4 font-semibold text-sm bg-background">% Presenze</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nessun giocatore nella rosa
                        </td>
                      </tr>
                    ) : (
                      <>
                        {/* Portieri Section */}
                        {groupedPlayers['Portieri'].length > 0 && (
                          <>
                            <tr className="bg-primary/10">
                              <td colSpan={8} className="py-3 px-4 font-bold text-lg text-primary">
                                🧤 PORTIERI ({groupedPlayers['Portieri'].length})
                              </td>
                            </tr>
                            {groupedPlayers['Portieri'].map((player) => {
                              const playerAttendances = filterAttendancesByRange(player.id);
                              const presentiCount = playerAttendances.filter(a => a.status === 'Presente').length;
                              const assentiCount = playerAttendances.filter(a => a.status === 'Assente').length;
                              const infortuniCount = playerAttendances.filter(a => a.status === 'Infortunato').length;
                              const totale = presentiCount + assentiCount + infortuniCount;
                              const percentuale = totale > 0 ? Math.round((presentiCount / totale) * 100) : 0;
                              
                              return (
                                <tr 
                                  key={player.id} 
                                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                                  data-testid={`player-row-${player.id}`}
                                >
                                  {visibleColumns.number && (
                                    <td className="py-3 px-4">
                                      <span className="font-bold text-secondary text-lg">
                                        {player.number ? `#${player.number}` : '--'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.name && (
                                    <td className="py-3 px-4">
                                      <span className="font-semibold text-foreground">{player.lastName} {player.firstName}</span>
                                    </td>
                                  )}
                                  {visibleColumns.role && (
                                    <td className="py-3 px-4">
                                      <span className="text-sm text-muted-foreground">
                                        {player.role || 'N/D'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.presenti && (
                                    <td className="py-3 px-4 text-center">
                                      {presentiCount > 0 && (
                                        <Badge variant="default" className="bg-green-600 text-white font-mono">
                                          {presentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.assenti && (
                                    <td className="py-3 px-4 text-center">
                                      {assentiCount > 0 && (
                                        <Badge variant="default" className="bg-red-600 text-white font-mono">
                                          {assentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.infortuni && (
                                    <td className="py-3 px-4 text-center">
                                      {infortuniCount > 0 && (
                                        <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                          {infortuniCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.totale && (
                                    <td className="py-3 px-4 text-center">
                                      {totale > 0 && (
                                        <Badge variant="outline" className="font-mono">
                                          {totale}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.percentuale && (
                                    <td className="py-3 px-4 text-center">
                                      {totale > 0 && (
                                        <Badge 
                                          variant="default" 
                                          className={`font-mono ${
                                            percentuale >= 80 ? 'bg-green-600' : 
                                            percentuale >= 60 ? 'bg-yellow-500 text-black' : 
                                            'bg-red-600'
                                          }`}
                                        >
                                          {percentuale}%
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </>
                        )}

                        {/* Difensori Section */}
                        {groupedPlayers['Difensori'].length > 0 && (
                          <>
                            <tr className="bg-primary/10">
                              <td colSpan={8} className="py-3 px-4 font-bold text-lg text-primary">
                                🛡️ DIFENSORI ({groupedPlayers['Difensori'].length})
                              </td>
                            </tr>
                            {groupedPlayers['Difensori'].map((player) => {
                              const playerAttendances = filterAttendancesByRange(player.id);
                              const presentiCount = playerAttendances.filter(a => a.status === 'Presente').length;
                              const assentiCount = playerAttendances.filter(a => a.status === 'Assente').length;
                              const infortuniCount = playerAttendances.filter(a => a.status === 'Infortunato').length;
                              const totale = presentiCount + assentiCount + infortuniCount;
                              const percentuale = totale > 0 ? Math.round((presentiCount / totale) * 100) : 0;
                              
                              return (
                                <tr 
                                  key={player.id} 
                                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                                  data-testid={`player-row-${player.id}`}
                                >
                                  {visibleColumns.number && (
                                    <td className="py-3 px-4">
                                      <span className="font-bold text-secondary text-lg">
                                        {player.number ? `#${player.number}` : '--'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.name && (
                                    <td className="py-3 px-4">
                                      <span className="font-semibold text-foreground">{player.lastName} {player.firstName}</span>
                                    </td>
                                  )}
                                  {visibleColumns.role && (
                                    <td className="py-3 px-4">
                                      <span className="text-sm text-muted-foreground">
                                        {player.role || 'N/D'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.presenti && (
                                    <td className="py-3 px-4 text-center">
                                      {presentiCount > 0 && (
                                        <Badge variant="default" className="bg-green-600 text-white font-mono">
                                          {presentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.assenti && (
                                    <td className="py-3 px-4 text-center">
                                      {assentiCount > 0 && (
                                        <Badge variant="default" className="bg-red-600 text-white font-mono">
                                          {assentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.infortuni && (
                                    <td className="py-3 px-4 text-center">
                                      {infortuniCount > 0 && (
                                        <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                          {infortuniCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.totale && (
                                    <td className="py-3 px-4 text-center">
                                      {totale > 0 && (
                                        <Badge variant="outline" className="font-mono">
                                          {totale}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.percentuale && (
                                    <td className="py-3 px-4 text-center">
                                      {totale > 0 && (
                                        <Badge 
                                          variant="default" 
                                          className={`font-mono ${
                                            percentuale >= 80 ? 'bg-green-600' : 
                                            percentuale >= 60 ? 'bg-yellow-500 text-black' : 
                                            'bg-red-600'
                                          }`}
                                        >
                                          {percentuale}%
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </>
                        )}

                        {/* Centrocampisti Section */}
                        {groupedPlayers['Centrocampisti'].length > 0 && (
                          <>
                            <tr className="bg-primary/10">
                              <td colSpan={8} className="py-3 px-4 font-bold text-lg text-primary">
                                ⚽ CENTROCAMPISTI ({groupedPlayers['Centrocampisti'].length})
                              </td>
                            </tr>
                            {groupedPlayers['Centrocampisti'].map((player) => {
                              const playerAttendances = filterAttendancesByRange(player.id);
                              const presentiCount = playerAttendances.filter(a => a.status === 'Presente').length;
                              const assentiCount = playerAttendances.filter(a => a.status === 'Assente').length;
                              const infortuniCount = playerAttendances.filter(a => a.status === 'Infortunato').length;
                              const totale = presentiCount + assentiCount + infortuniCount;
                              const percentuale = totale > 0 ? Math.round((presentiCount / totale) * 100) : 0;
                              
                              return (
                                <tr 
                                  key={player.id} 
                                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                                  data-testid={`player-row-${player.id}`}
                                >
                                  {visibleColumns.number && (
                                    <td className="py-3 px-4">
                                      <span className="font-bold text-secondary text-lg">
                                        {player.number ? `#${player.number}` : '--'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.name && (
                                    <td className="py-3 px-4">
                                      <span className="font-semibold text-foreground">{player.lastName} {player.firstName}</span>
                                    </td>
                                  )}
                                  {visibleColumns.role && (
                                    <td className="py-3 px-4">
                                      <span className="text-sm text-muted-foreground">
                                        {player.role || 'N/D'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.presenti && (
                                    <td className="py-3 px-4 text-center">
                                      {presentiCount > 0 && (
                                        <Badge variant="default" className="bg-green-600 text-white font-mono">
                                          {presentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.assenti && (
                                    <td className="py-3 px-4 text-center">
                                      {assentiCount > 0 && (
                                        <Badge variant="default" className="bg-red-600 text-white font-mono">
                                          {assentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.infortuni && (
                                    <td className="py-3 px-4 text-center">
                                      {infortuniCount > 0 && (
                                        <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                          {infortuniCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.totale && (
                                    <td className="py-3 px-4 text-center">
                                      {totale > 0 && (
                                        <Badge variant="outline" className="font-mono">
                                          {totale}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.percentuale && (
                                    <td className="py-3 px-4 text-center">
                                      {totale > 0 && (
                                        <Badge 
                                          variant="default" 
                                          className={`font-mono ${
                                            percentuale >= 80 ? 'bg-green-600' : 
                                            percentuale >= 60 ? 'bg-yellow-500 text-black' : 
                                            'bg-red-600'
                                          }`}
                                        >
                                          {percentuale}%
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </>
                        )}

                        {/* Attaccanti Section */}
                        {groupedPlayers['Attaccanti'].length > 0 && (
                          <>
                            <tr className="bg-primary/10">
                              <td colSpan={8} className="py-3 px-4 font-bold text-lg text-primary">
                                ⚡ ATTACCANTI ({groupedPlayers['Attaccanti'].length})
                              </td>
                            </tr>
                            {groupedPlayers['Attaccanti'].map((player) => {
                              const playerAttendances = filterAttendancesByRange(player.id);
                              const presentiCount = playerAttendances.filter(a => a.status === 'Presente').length;
                              const assentiCount = playerAttendances.filter(a => a.status === 'Assente').length;
                              const infortuniCount = playerAttendances.filter(a => a.status === 'Infortunato').length;
                              const totale = presentiCount + assentiCount + infortuniCount;
                              const percentuale = totale > 0 ? Math.round((presentiCount / totale) * 100) : 0;
                              
                              return (
                                <tr 
                                  key={player.id} 
                                  className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                                  data-testid={`player-row-${player.id}`}
                                >
                                  {visibleColumns.number && (
                                    <td className="py-3 px-4">
                                      <span className="font-bold text-secondary text-lg">
                                        {player.number ? `#${player.number}` : '--'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.name && (
                                    <td className="py-3 px-4">
                                      <span className="font-semibold text-foreground">{player.lastName} {player.firstName}</span>
                                    </td>
                                  )}
                                  {visibleColumns.role && (
                                    <td className="py-3 px-4">
                                      <span className="text-sm text-muted-foreground">
                                        {player.role || 'N/D'}
                                      </span>
                                    </td>
                                  )}
                                  {visibleColumns.presenti && (
                                    <td className="py-3 px-4 text-center">
                                      {presentiCount > 0 && (
                                        <Badge variant="default" className="bg-green-600 text-white font-mono">
                                          {presentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.assenti && (
                                    <td className="py-3 px-4 text-center">
                                      {assentiCount > 0 && (
                                        <Badge variant="default" className="bg-red-600 text-white font-mono">
                                          {assentiCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.infortuni && (
                                    <td className="py-3 px-4 text-center">
                                      {infortuniCount > 0 && (
                                        <Badge variant="default" className="bg-yellow-500 text-black font-mono">
                                          {infortuniCount}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.totale && (
                                    <td className="py-3 px-4 text-center">
                                      {totale > 0 && (
                                        <Badge variant="outline" className="font-mono">
                                          {totale}
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                  {visibleColumns.percentuale && (
                                    <td className="py-3 px-4 text-center">
                                      {totale > 0 && (
                                        <Badge 
                                          variant="default" 
                                          className={`font-mono ${
                                            percentuale >= 80 ? 'bg-green-600' : 
                                            percentuale >= 60 ? 'bg-yellow-500 text-black' : 
                                            'bg-red-600'
                                          }`}
                                        >
                                          {percentuale}%
                                        </Badge>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </>
                        )}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
