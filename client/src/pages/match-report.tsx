import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, Calendar, MapPin, Clock } from "lucide-react";

type Player = {
  id: number;
  firstName: string;
  lastName: string;
  number?: number;
  role?: string;
};

export default function MatchReport() {
  const [, params] = useRoute("/match-report/:matchId");
  const matchId = params?.matchId ? parseInt(params.matchId) : null;

  // Fetch match data
  const { data: match } = useQuery<any>({
    queryKey: ['/api/matches', matchId],
    enabled: !!matchId,
  });

  // Fetch match events
  const { data: matchEvents = [] } = useQuery<any[]>({
    queryKey: ['/api/matches', matchId, 'events'],
    enabled: !!matchId,
  });

  // Fetch formations
  const { data: formations = [] } = useQuery<any[]>({
    queryKey: ['/api/formations', matchId],
    enabled: !!matchId,
  });

  // Fetch all players
  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ['/api/players'],
  });

  // Fetch convocation
  const { data: convocations = [] } = useQuery<any[]>({
    queryKey: ['/api/convocations'],
  });

  const convocation = convocations.find(c => 
    c.opponent === match?.opponent && c.matchDate === match?.date
  );

  const titolari = formations
    .filter((f: any) => f.status === 'TITOLARE')
    .map((f: any) => players.find(p => p.id === f.playerId))
    .filter(Boolean);

  const panchina = formations
    .filter((f: any) => f.status === 'PANCHINA')
    .map((f: any) => players.find(p => p.id === f.playerId))
    .filter(Boolean);

  // Categorize events
  const sostituzioni = matchEvents.filter(e => e.eventType === 'Sostituzione');
  const espulsi = matchEvents.filter(e => e.eventType === 'Cartellino Rosso');
  const ammoniti = matchEvents.filter(e => e.eventType === 'Cartellino Giallo');
  const goalsFatti = matchEvents.filter(e => e.eventType === 'Gol');
  const goalsSubiti = matchEvents.filter(e => e.eventType === 'Goal Subito');
  const infortuni = matchEvents.filter(e => e.eventType === 'Infortunio');
  const rigori = matchEvents.filter(e => e.eventType === 'Rigore');

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-8">
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Screen Controls (hidden in print) */}
      <div className="print:hidden bg-slate-900 text-white p-4 flex justify-between items-center">
        <Link href="/partita-offline">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Indietro
          </Button>
        </Link>
        <Button onClick={() => window.print()} variant="default">
          <Printer className="w-4 h-4 mr-2" />
          Stampa Report
        </Button>
      </div>

      {/* Professional Match Report */}
      <div className="max-w-5xl mx-auto p-8 print:p-12">
        
        {/* Header */}
        <div className="text-center mb-8 border-b-4 border-slate-900 pb-6">
          <h1 className="text-4xl font-black tracking-tight mb-2">REPORT PARTITA</h1>
          <p className="text-2xl font-bold text-slate-700">Pro Roma Calcio - under 18 Regionali</p>
        </div>

        {/* Match Details Hero */}
        <Card className="mb-6 border-2 border-slate-900">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6 items-center">
              {/* Home Team */}
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600 mb-2">Pro Roma Calcio - under 18 Regionali</p>
                <div className="text-6xl font-black">{goalsFatti.length}</div>
              </div>

              {/* VS */}
              <div className="text-center">
                <p className="text-lg font-bold text-slate-500">VS</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Calendar className="w-4 h-4" />
                  <p className="text-sm">{new Date(match.date).toLocaleDateString('it-IT')}</p>
                </div>
              </div>

              {/* Away Team */}
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600 mb-2">{match.opponent}</p>
                <div className="text-6xl font-black">{goalsSubiti.length}</div>
              </div>
            </div>

            {/* Match Info */}
            {convocation && (
              <div className="mt-6 pt-6 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <MapPin className="w-4 h-4 mx-auto mb-1 text-slate-600" />
                  <p className="text-xs text-slate-600">CAMPO</p>
                  <p className="font-semibold text-sm">{(convocation as any).matchAddress || 'N/D'}</p>
                </div>
                <div>
                  <Clock className="w-4 h-4 mx-auto mb-1 text-slate-600" />
                  <p className="text-xs text-slate-600">ARRIVO</p>
                  <p className="font-semibold text-sm">{(convocation as any).fieldArrivalTime || 'N/D'}</p>
                </div>
                <div>
                  <Clock className="w-4 h-4 mx-auto mb-1 text-slate-600" />
                  <p className="text-xs text-slate-600">INIZIO</p>
                  <p className="font-semibold text-sm">{(convocation as any).matchStartTime || 'N/D'}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formation Section */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <Card className="border-2 border-green-700">
            <CardHeader className="bg-green-700 text-white">
              <CardTitle className="text-lg">⚽ TITOLARI ({titolari.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {titolari.map((player: any) => (
                  <div key={player.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                    <span className="font-semibold">#{player.number || '?'}</span>
                    <span className="flex-1 ml-3">{player.lastName} {player.firstName}</span>
                    <span className="text-xs text-slate-600">{player.role}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-orange-600">
            <CardHeader className="bg-orange-600 text-white">
              <CardTitle className="text-lg">🔄 PANCHINA ({panchina.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2">
                {panchina.map((player: any) => (
                  <div key={player.id} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                    <span className="font-semibold">#{player.number || '?'}</span>
                    <span className="flex-1 ml-3">{player.lastName} {player.firstName}</span>
                    <span className="text-xs text-slate-600">{player.role}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Events Summary */}
        <Card className="mb-6 border-2 border-slate-900">
          <CardHeader className="bg-slate-900 text-white">
            <CardTitle>📊 STATISTICHE EVENTO</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-3xl font-black text-green-600">{goalsFatti.length}</p>
                <p className="text-sm text-slate-600">Goal Fatti</p>
              </div>
              <div>
                <p className="text-3xl font-black text-red-600">{goalsSubiti.length}</p>
                <p className="text-sm text-slate-600">Goal Subiti</p>
              </div>
              <div>
                <p className="text-3xl font-black text-yellow-600">{ammoniti.length}</p>
                <p className="text-sm text-slate-600">Ammoniti</p>
              </div>
              <div>
                <p className="text-3xl font-black text-red-700">{espulsi.length}</p>
                <p className="text-sm text-slate-600">Espulsi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Events by Category */}
        <div className="space-y-6">
          
          {/* Goals Fatti */}
          {goalsFatti.length > 0 && (
            <Card className="border-2 border-green-600">
              <CardHeader className="bg-green-600 text-white">
                <CardTitle>⚽ MARCATORI - GOAL FATTI ({goalsFatti.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {goalsFatti.map((event: any, idx: number) => {
                    const player = players.find(p => p.id === event.playerId);
                    return (
                      <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded border border-green-200">
                        <div>
                          <span className="font-bold">#{player?.number || '?'} {player?.lastName} {player?.firstName}</span>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-700">{event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Goals Subiti */}
          {goalsSubiti.length > 0 && (
            <Card className="border-2 border-red-600">
              <CardHeader className="bg-red-600 text-white">
                <CardTitle>⚽ GOAL SUBITI ({goalsSubiti.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {goalsSubiti.map((event: any, idx: number) => {
                    return (
                      <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200">
                        <div>
                          <span className="font-bold text-red-700">Goal dell'avversario</span>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-red-700">{event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Substitutions */}
          {sostituzioni.length > 0 && (
            <Card className="border-2 border-purple-600">
              <CardHeader className="bg-purple-600 text-white">
                <CardTitle>🔄 SOSTITUZIONI ({sostituzioni.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {sostituzioni.map((event: any, idx: number) => {
                    const playerOut = players.find(p => p.id === event.playerId);
                    const playerIn = event.secondPlayerId ? players.find(p => p.id === event.secondPlayerId) : null;
                    return (
                      <div key={idx} className="p-3 bg-purple-50 rounded border border-purple-200">
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <p className="text-red-700 text-sm">❌ ESCE: #{playerOut?.number || '?'} {playerOut?.lastName} {playerOut?.firstName}</p>
                            <p className="text-green-700 text-sm">✅ ENTRA: #{playerIn?.number || '?'} {playerIn?.lastName} {playerIn?.firstName}</p>
                          </div>
                          <Badge className="bg-purple-700">{event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Yellow Cards */}
          {ammoniti.length > 0 && (
            <Card className="border-2 border-yellow-600">
              <CardHeader className="bg-yellow-600 text-white">
                <CardTitle>🟨 AMMONITI ({ammoniti.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {ammoniti.map((event: any, idx: number) => {
                    const player = players.find(p => p.id === event.playerId);
                    return (
                      <div key={idx} className="flex justify-between items-center p-3 bg-yellow-50 rounded border border-yellow-200">
                        <span className="font-semibold">#{player?.number || '?'} {player?.lastName} {player?.firstName}</span>
                        <Badge className="bg-yellow-700">{event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Red Cards */}
          {espulsi.length > 0 && (
            <Card className="border-2 border-red-600">
              <CardHeader className="bg-red-600 text-white">
                <CardTitle>🟥 ESPULSIONI ({espulsi.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {espulsi.map((event: any, idx: number) => {
                    const player = players.find(p => p.id === event.playerId);
                    return (
                      <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded border border-red-200">
                        <span className="font-semibold">#{player?.number || '?'} {player?.lastName} {player?.firstName}</span>
                        <Badge className="bg-red-700">{event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Injuries */}
          {infortuni.length > 0 && (
            <Card className="border-2 border-orange-600">
              <CardHeader className="bg-orange-600 text-white">
                <CardTitle>🤕 INFORTUNI ({infortuni.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2">
                  {infortuni.map((event: any, idx: number) => {
                    const player = players.find(p => p.id === event.playerId);
                    return (
                      <div key={idx} className="flex justify-between items-center p-3 bg-orange-50 rounded border border-orange-200">
                        <span className="font-semibold">#{player?.number || '?'} {player?.lastName} {player?.firstName}</span>
                        <Badge className="bg-orange-700">{event.minute}' - {event.half === 1 ? '1° T' : '2° T'}</Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t-2 border-slate-900 text-center text-sm text-slate-600">
          <p>Report generato il {new Date().toLocaleDateString('it-IT')} alle {new Date().toLocaleTimeString('it-IT')}</p>
          <p className="mt-2 font-bold">Pro Roma Calcio - under 18 Regionali - Sistema di Gestione Partite</p>
        </div>

      </div>
    </div>
  );
}
