import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/Navigation";
import { Calendar, ChevronLeft, ChevronRight, Filter, Download } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type WeeklyPlannerData = {
  weekStart: string;
  days: {
    monday: string;
    wednesday: string;
    thursday: string;
  };
  players: Array<{
    id: number;
    firstName: string;
    lastName: string;
    number: number | null;
    role: string | null;
    attendances: {
      monday: string | null;
      wednesday: string | null;
      thursday: string | null;
    };
  }>;
};

type MonthlyPlannerData = {
  yearMonth: string;
  trainingDays: Array<{ date: string; dayName: string; dayNum: number; monthAbbr: string }>;
  players: Array<{
    id: number;
    firstName: string;
    lastName: string;
    number: number | null;
    role: string | null;
    attendances: Record<string, string | null>;
    totalPresenze: number;
    totalAssenze: number;
  }>;
};

export default function WeeklyPlannerPage() {
  // Calculate current week's Monday
  const getCurrentWeekMonday = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    return monday.toISOString().split('T')[0];
  };

  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeekMonday());
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timePeriodFilter, setTimePeriodFilter] = useState<'week' | 'month'>('week');

  // Get current year-month
  const getCurrentYearMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  // Weekly planner query
  const { data: weeklyData, isLoading: isLoadingWeekly } = useQuery<WeeklyPlannerData>({
    queryKey: ['/api/attendances/weekly-planner', selectedWeek],
    queryFn: async () => {
      const res = await fetch(`/api/attendances/weekly-planner?date=${selectedWeek}`);
      if (!res.ok) throw new Error('Failed to fetch planner data');
      return res.json();
    },
    enabled: timePeriodFilter === 'week',
  });

  // Monthly planner query
  const { data: monthlyData, isLoading: isLoadingMonthly } = useQuery<MonthlyPlannerData>({
    queryKey: ['/api/attendances/monthly-planner', getCurrentYearMonth()],
    queryFn: async () => {
      const res = await fetch(`/api/attendances/monthly-planner?yearMonth=${getCurrentYearMonth()}`);
      if (!res.ok) throw new Error('Failed to fetch monthly planner data');
      return res.json();
    },
    enabled: timePeriodFilter === 'month',
  });

  const isLoading = timePeriodFilter === 'week' ? isLoadingWeekly : isLoadingMonthly;

  // Navigation functions
  const goToPreviousWeek = () => {
    const currentWeek = new Date(selectedWeek);
    currentWeek.setDate(currentWeek.getDate() - 7);
    setSelectedWeek(currentWeek.toISOString().split('T')[0]);
  };

  const goToNextWeek = () => {
    const currentWeek = new Date(selectedWeek);
    currentWeek.setDate(currentWeek.getDate() + 7);
    setSelectedWeek(currentWeek.toISOString().split('T')[0]);
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(getCurrentWeekMonday());
  };

  // Normalize data for filtering (convert to common format)
  const playersForFiltering = timePeriodFilter === 'week' 
    ? weeklyData?.players.map(p => ({ ...p, role: p.role })) || []
    : monthlyData?.players.map(p => ({ ...p, role: p.role })) || [];

  // Get unique roles for filter
  const uniqueRoles = playersForFiltering.length
    ? Array.from(new Set(playersForFiltering.map(p => p.role).filter(Boolean))).sort() as string[]
    : [];

  // Filter players based on role and status
  const filteredPlayers = playersForFiltering.filter(player => {
    // Role filter
    if (roleFilter !== 'all' && player.role !== roleFilter) return false;

    // Status filter (check if player has the selected status in any day)
    if (statusFilter !== 'all') {
      const hasStatus = Object.values(player.attendances).some(
        status => status === statusFilter
      );
      if (!hasStatus) return false;
    }

    return true;
  }) || [];

  // Sort players by last name, then first name
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const nameA = `${a.lastName} ${a.firstName}`;
    const nameB = `${b.lastName} ${b.firstName}`;
    return nameA.localeCompare(nameB, 'it');
  });

  // Render status badge
  const renderStatusBadge = (status: string | null) => {
    if (!status) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }

    if (status === 'Presente') {
      return (
        <Badge className="bg-green-600 text-white font-bold">
          1
        </Badge>
      );
    }

    if (status === 'Assente') {
      return (
        <Badge variant="destructive" className="font-bold">
          0
        </Badge>
      );
    }

    if (status === 'Infortunato') {
      return (
        <Badge className="bg-orange-600 text-white font-bold">
          Inf
        </Badge>
      );
    }

    return <span className="text-xs text-muted-foreground">-</span>;
  };

  // Download data as CSV
  const downloadCSV = () => {
    if (timePeriodFilter === 'week') {
      if (!weeklyData) return;
      
      const headers = ['Numero', 'Cognome', 'Nome', 'Ruolo', 'Lunedì', 'Mercoledì', 'Giovedì'];
      const rows = sortedPlayers.map(player => {
        const p = player as any;
        return [
          p.number || '-',
          p.lastName,
          p.firstName,
          p.role || 'N/D',
          p.attendances.monday === 'Presente' ? '1' : p.attendances.monday === 'Assente' ? '0' : p.attendances.monday === 'Infortunato' ? 'Inf' : '-',
          p.attendances.wednesday === 'Presente' ? '1' : p.attendances.wednesday === 'Assente' ? '0' : p.attendances.wednesday === 'Infortunato' ? 'Inf' : '-',
          p.attendances.thursday === 'Presente' ? '1' : p.attendances.thursday === 'Assente' ? '0' : p.attendances.thursday === 'Infortunato' ? 'Inf' : '-',
        ];
      });

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `presenze_settimana_${weeklyData.days.monday}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Monthly export
      if (!monthlyData) return;
      
      const dayHeaders = monthlyData.trainingDays.map(d => `${d.dayName.slice(0, 3)} ${d.dayNum}`);
      const headers = ['Numero', 'Cognome', 'Nome', 'Ruolo', ...dayHeaders, 'Tot Pres', 'Tot Ass'];
      const rows = sortedPlayers.map(player => {
        const p = player as any;
        const dayValues = monthlyData.trainingDays.map(d => {
          const status = p.attendances[d.date];
          return status === 'Presente' ? '1' : status === 'Assente' ? '0' : status === 'Infortunato' ? 'Inf' : '-';
        });
        return [
          p.number || '-',
          p.lastName,
          p.firstName,
          p.role || 'N/D',
          ...dayValues,
          p.totalPresenze,
          p.totalAssenze,
        ];
      });

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.setAttribute('href', URL.createObjectURL(blob));
      link.setAttribute('download', `presenze_mese_${monthlyData.yearMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Check if player has injuries or low attendance for border styling
  const getPlayerRowClass = (player: typeof sortedPlayers[0]) => {
    const attendanceValues = Object.values(player.attendances);
    const hasInjury = attendanceValues.includes('Infortunato');
    const presentCount = attendanceValues.filter(a => a === 'Presente').length;
    const hasLowAttendance = presentCount < 2 && attendanceValues.some(a => a !== null);

    if (hasInjury) {
      return 'bg-yellow-500/30 border-l-4 border-l-yellow-500';
    }
    if (hasLowAttendance) {
      return 'bg-blue-500/30 border-l-4 border-l-blue-500';
    }
    return '';
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] to-[#16213e] text-white">
      <Navigation />
      <div className="max-w-7xl mx-auto space-y-6 p-6">
        
        {/* Header */}
        <Card className="border-primary/30 border-2 bg-gradient-to-br from-card/90 to-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <CardTitle className="text-3xl text-primary neon-glow-cyan flex items-center gap-3">
                <Calendar className="h-8 w-8" />
                Planner Presenze
              </CardTitle>

              <div className="flex items-center gap-4 flex-wrap">
                {/* Download Button */}
                <Button
                  onClick={downloadCSV}
                  variant="default"
                  size="sm"
                  className="gap-2"
                  data-testid="button-download-csv"
                >
                  <Download className="h-4 w-4" />
                  Download CSV
                </Button>

                {/* Week Navigation - Hide when month filter is active */}
                {timePeriodFilter === 'week' && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={goToPreviousWeek}
                      variant="outline"
                      size="icon"
                      data-testid="button-previous-week"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={goToCurrentWeek}
                      variant="outline"
                      size="sm"
                      data-testid="button-current-week"
                    >
                      Settimana Corrente
                    </Button>
                    <Button
                      onClick={goToNextWeek}
                      variant="outline"
                      size="icon"
                      data-testid="button-next-week"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Period info */}
            {(weeklyData || monthlyData) && (
              <p className="text-sm text-muted-foreground mt-2">
                {timePeriodFilter === 'month' 
                  ? `Presenze Allenamenti (${monthlyData?.players.length || 0} Giocatori)`
                  : weeklyData && `Settimana: Lunedì ${formatDate(weeklyData.days.monday)} - Giovedì ${formatDate(weeklyData.days.thursday)}`
                }
              </p>
            )}
          </CardHeader>
        </Card>

        {/* Filters */}
        <Card className="border-primary/30 border-2 bg-card/80">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Filtri:</span>
              </div>

              <Select value={timePeriodFilter} onValueChange={(value: 'week' | 'month') => setTimePeriodFilter(value)}>
                <SelectTrigger className="w-52" data-testid="select-time-period-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">📅 Settimana Corrente</SelectItem>
                  <SelectItem value="month">🗓️ Mese Corrente</SelectItem>
                </SelectContent>
              </Select>

              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-48" data-testid="select-role-filter">
                  <SelectValue placeholder="Tutti i ruoli" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti i ruoli</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status-filter">
                  <SelectValue placeholder="Tutti gli stati" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti gli stati</SelectItem>
                  <SelectItem value="Presente">1 - Presenti</SelectItem>
                  <SelectItem value="Assente">0 - Assenti</SelectItem>
                  <SelectItem value="Infortunato">Inf - Infortunati</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={() => {
                  setRoleFilter('all');
                  setStatusFilter('all');
                  setTimePeriodFilter('week');
                }}
                variant="ghost"
                size="sm"
                data-testid="button-reset-filters"
              >
                Rimuovi Filtri
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-primary/30 border-2 bg-card/80">
          <CardHeader>
            <CardTitle className="text-xl text-primary">
              Presenze Allenamenti ({sortedPlayers.length} Giocatori)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Caricamento...
              </div>
            ) : timePeriodFilter === 'week' && weeklyData ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-sm">N°</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Giocatore</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Ruolo</th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">
                        Lunedì<br/>
                        <span className="text-xs text-muted-foreground">{formatDate(weeklyData.days.monday)}</span>
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">
                        Mercoledì<br/>
                        <span className="text-xs text-muted-foreground">{formatDate(weeklyData.days.wednesday)}</span>
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-sm">
                        Giovedì<br/>
                        <span className="text-xs text-muted-foreground">{formatDate(weeklyData.days.thursday)}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nessun giocatore trovato
                        </td>
                      </tr>
                    ) : (
                      sortedPlayers.map((player) => {
                        const p = player as any;
                        return (
                          <tr
                            key={player.id}
                            className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${getPlayerRowClass(player)}`}
                            data-testid={`player-row-${player.id}`}
                          >
                            <td className="py-3 px-4">
                              <span className="font-bold text-secondary text-lg">
                                {player.number ? `#${player.number}` : '--'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-foreground">
                                {player.lastName} {player.firstName}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-muted-foreground">
                                {player.role || 'N/D'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {renderStatusBadge(p.attendances.monday)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {renderStatusBadge(p.attendances.wednesday)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {renderStatusBadge(p.attendances.thursday)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : timePeriodFilter === 'month' && monthlyData ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-sm sticky left-0 bg-card z-10">N°</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm sticky left-16 bg-card z-10">Giocatore</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm">Ruolo</th>
                      {monthlyData.trainingDays.map(day => (
                        <th key={day.date} className="text-center py-3 px-4 font-semibold text-sm min-w-[80px]">
                          {day.dayName}<br/>
                          <span className="text-xs text-muted-foreground">{day.dayNum} {day.monthAbbr}</span>
                        </th>
                      ))}
                      <th className="text-center py-3 px-4 font-semibold text-sm bg-primary/10 border-l-2 border-primary">
                        Totale<br/>
                        <span className="text-xs text-muted-foreground">Presenze</span>
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-sm bg-destructive/10 border-l-2 border-destructive">
                        Totale<br/>
                        <span className="text-xs text-muted-foreground">Assenze</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedPlayers.length === 0 ? (
                      <tr>
                        <td colSpan={monthlyData.trainingDays.length + 5} className="text-center py-8 text-muted-foreground">
                          Nessun giocatore trovato
                        </td>
                      </tr>
                    ) : (
                      sortedPlayers.map((player) => {
                        const p = player as any;
                        return (
                          <tr
                            key={player.id}
                            className={`border-b border-border/50 hover:bg-muted/50 transition-colors ${getPlayerRowClass(player)}`}
                            data-testid={`player-row-${player.id}`}
                          >
                            <td className="py-3 px-4 sticky left-0 bg-card">
                              <span className="font-bold text-secondary text-lg">
                                {player.number ? `#${player.number}` : '--'}
                              </span>
                            </td>
                            <td className="py-3 px-4 sticky left-16 bg-card">
                              <span className="font-semibold text-foreground">
                                {player.lastName} {player.firstName}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm text-muted-foreground">
                                {player.role || 'N/D'}
                              </span>
                            </td>
                            {monthlyData.trainingDays.map(day => (
                              <td key={day.date} className="py-3 px-4 text-center">
                                {renderStatusBadge(p.attendances[day.date])}
                              </td>
                            ))}
                            <td className="py-3 px-4 text-center bg-primary/5 border-l-2 border-primary">
                              <span className="font-bold text-primary text-lg">{p.totalPresenze}</span>
                            </td>
                            <td className="py-3 px-4 text-center bg-destructive/5 border-l-2 border-destructive">
                              <span className="font-bold text-destructive text-lg">{p.totalAssenze}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Legend */}
        <Card className="border-primary/30 bg-card/60">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="text-sm font-semibold">Legenda Presenze:</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600 text-white font-bold">1</Badge>
                  <span>Presente</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="font-bold">0</Badge>
                  <span>Assente</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-orange-600 text-white font-bold">Inf</Badge>
                  <span>Infortunato</span>
                </div>
              </div>

              <p className="text-sm font-semibold pt-2">Evidenziazioni:</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 border-2 border-yellow-500"></div>
                  <span>Bordo giallo: Giocatore con infortuni nella settimana</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 border-2 border-blue-500"></div>
                  <span>Bordo blu: Meno di 2 presenze nella settimana</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
