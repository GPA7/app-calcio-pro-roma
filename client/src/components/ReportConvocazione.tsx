import { forwardRef } from 'react';
import proRomaLogo from '@assets/logo proroma_1761322516639.png';
import type { TemporaryPlayer } from '@shared/schema';

type Player = {
  id: number;
  firstName: string;
  lastName: string;
  number: number | null;
  role: string | null;
  convocationStatus: 'Convocabile' | 'Convocabile solo 1 allenamento' | 'Infortunato' | 'Espulso' | 'Riabilitato' | 'Riabilitato Infortunato' | 'NC scelta tecnica' | 'NC per assenze' | 'NC per motivi societari' | null;
  isConvocato: number | null;
  yellowCards: number | null;
  redCards: number | null;
  suspensionDays: number | null;
};

type ReportConvocazioneProps = {
  matchDate: string;
  opponent: string;
  opponentLogoUrl?: string | null;
  fieldArrivalTime: string;
  matchStartTime: string;
  matchAddress: string;
  isHome: number;
  players: Player[];
  playerYellowCards: Record<number, number>;
  recentAttendances: { playerId: number; presentiCount: number; infortunatoCount: number }[];
  isOfficialReport?: boolean;
  reportType?: 'base' | 'ufficiale' | 'lista-ufficiale';
  temporaryPlayers?: TemporaryPlayer[];
};

const ReportConvocazione = forwardRef<HTMLDivElement, ReportConvocazioneProps>(
  ({ matchDate, opponent, opponentLogoUrl, fieldArrivalTime, matchStartTime, matchAddress, isHome, players, playerYellowCards, recentAttendances, isOfficialReport = false, reportType = 'ufficiale', temporaryPlayers = [] }, ref) => {
    
    // Determine teams order and address based on isHome
    const homeTeam = isHome === 1 ? 'Pro Roma Calcio' : opponent;
    const awayTeam = isHome === 1 ? opponent : 'Pro Roma Calcio';
    const finalAddress = isHome === 1 ? 'Via Verrio Flacco, 41, 00177 Roma RM' : matchAddress;
    
    // Helper: Get attendance count for player
    const getAttendanceCount = (playerId: number) => {
      const attendance = recentAttendances.find(a => a.playerId === playerId);
      return attendance?.presentiCount || 0;
    };

    // Helper: Get injury count for player
    const getInjuryCount = (playerId: number) => {
      const attendance = recentAttendances.find(a => a.playerId === playerId);
      return attendance?.infortunatoCount || 0;
    };

    // Helper: Get role macro category
    const getRoleMacro = (role: string | null): string => {
      if (!role) return 'Altro';
      const roleLower = role.toLowerCase();
      if (roleLower.includes('portiere') || roleLower.includes('por')) return 'Portiere';
      if (roleLower.includes('difens') || roleLower.includes('terzin')) return 'Difensore';
      if (roleLower.includes('centrocampist') || roleLower.includes('mediano') || roleLower.includes('regista')) return 'Centrocampista';
      if (roleLower.includes('attac') || roleLower.includes('ala') || roleLower.includes('trequartista') || roleLower.includes('punta') || roleLower.includes('esterno')) return 'Attaccante';
      return 'Altro';
    };

    // Convocati grouped by role
    const convocati = players.filter(p => p.isConvocato === 1);
    
    const portieri = convocati.filter(p => getRoleMacro(p.role) === 'Portiere');
    const difensori = convocati.filter(p => getRoleMacro(p.role) === 'Difensore');
    const centrocampisti = convocati.filter(p => getRoleMacro(p.role) === 'Centrocampista');
    const attaccanti = convocati.filter(p => getRoleMacro(p.role) === 'Attaccante');

    // Non convocati by status
    const espulsi = players.filter(p => p.convocationStatus === 'Espulso');
    const infortunati = players.filter(p => p.convocationStatus === 'Infortunato' || p.convocationStatus === 'Riabilitato Infortunato');
    const ncAssenze = players.filter(p => p.convocationStatus === 'NC per assenze');
    const ncSceltaTecnica = players.filter(p => p.convocationStatus === 'NC scelta tecnica');
    const ncMotiviSocietari = players.filter(p => p.convocationStatus === 'NC per motivi societari');

    // Format date to Italian format (gg.mm.aaaa)
    const formatDateShort = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    };

    // Format date with weekday
    const formatDateLong = (dateStr: string) => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    // Render diverso per Lista Ufficiale
    if (reportType === 'lista-ufficiale') {
      const allConvocati = [...convocati, ...temporaryPlayers.map((tp, idx) => ({
        id: -idx - 1,
        firstName: tp.name.split(' ')[1] || '',
        lastName: tp.name.split(' ')[0] || tp.name,
        number: null,
        role: tp.role,
        convocationStatus: null,
        isConvocato: 1,
        yellowCards: 0,
        redCards: null,
        suspensionDays: null
      }))];

      // Raggruppa per ruolo e ordina alfabeticamente
      const portieri = allConvocati.filter(p => getRoleMacro(p.role) === 'Portiere').sort((a, b) => a.lastName.localeCompare(b.lastName));
      const difensori = allConvocati.filter(p => getRoleMacro(p.role) === 'Difensore').sort((a, b) => a.lastName.localeCompare(b.lastName));
      const centrocampisti = allConvocati.filter(p => getRoleMacro(p.role) === 'Centrocampista').sort((a, b) => a.lastName.localeCompare(b.lastName));
      const attaccanti = allConvocati.filter(p => getRoleMacro(p.role) === 'Attaccante').sort((a, b) => a.lastName.localeCompare(b.lastName));
      
      // Array ordinato finale
      const allConvocatiOrdinati = [...portieri, ...difensori, ...centrocampisti, ...attaccanti];

      return (
        <div ref={ref} className="bg-white text-black p-4" style={{ fontFamily: 'Arial, sans-serif', fontSize: '9px' }}>
          {/* Header uguale al Report Ufficiale */}
          <div className="text-center mb-2">
            <h1 className="text-lg font-bold">SSD PRO ROMA CALCIO arl</h1>
          </div>

          {/* Logos and Title */}
          <div className="border-2 border-black p-2 mb-2">
            <div className="flex items-center justify-between mb-2">
              <img src={proRomaLogo} alt="Pro Roma Calcio" className="h-12 w-12 object-contain border-0" />
              <div className="text-center flex-1">
                <h2 className="text-lg font-bold">GESTIONE PARTITA</h2>
              </div>
              {opponentLogoUrl ? (
                <img src={opponentLogoUrl} alt={opponent} className="h-12 w-12 object-contain border-0" />
              ) : (
                <div className="h-12 w-12 border-2 border-gray-300 rounded-full flex items-center justify-center bg-gray-100">
                  <span className="text-[8px] text-gray-500 text-center">Logo<br/>Avv.</span>
                </div>
              )}
            </div>

            {/* Match Info */}
            <div className="grid grid-cols-3 gap-1 text-[9px] border-t-2 border-black pt-1">
              <div>
                <strong>Istruttore:</strong> Paolo Paradisi
              </div>
              <div>
                <strong>Categoria:</strong> Under 18
              </div>
              <div>
                <strong>Stagione:</strong> 2025/2026
              </div>
            </div>

            <div className="mt-1 text-[9px] leading-snug">
              <div>
                <span className="font-bold">I sotto elencati atleti sono convocati per il giorno:</span>{' '}
                <span className="text-red-600 font-bold">{formatDateLong(matchDate) || '______'}</span>
                {' '}
                <span className="font-bold">Data:</span>{' '}
                <span className="text-red-600 font-bold">{formatDateShort(matchDate) || '__.__'}</span>
              </div>
              <div>
                <span className="font-bold">Indirizzo del campo:</span>{' '}
                <span className="text-red-600 font-bold">{finalAddress || '______________________'}</span>
                {' '}
                <span className="font-bold">Alle ore:</span>{' '}
                <span className="text-red-600 font-bold">{fieldArrivalTime || '__.__'}</span>
              </div>
              <div>
                <span className="font-bold">Per disputare l'incontro:</span>{' '}
                <span className="text-red-600 font-bold">di Campionato</span>
                {' '}
                <span className="font-bold">Tra:</span>{' '}
                <span className="text-red-600 font-bold">{homeTeam || '______'}</span>
                {' '}
                <span className="font-bold">e</span>{' '}
                <span className="text-red-600 font-bold">{awayTeam || 'Pro Roma Calcio'}</span>
              </div>
              <div>
                <span className="font-bold">Che avrà inizio alle ore:</span>{' '}
                <span className="text-red-600 font-bold">{matchStartTime || '__.__'}</span>
                {' '}
                <span className="font-bold">Presso il campo:</span>{' '}
                <span className="text-red-600 font-bold">{finalAddress || '______________________'}</span>
              </div>
            </div>
          </div>

          {/* Tabella Convocati con T/P, CR, CG - ordinata per ruolo e colorata */}
          <div className="mb-2">
            <h3 className="font-bold text-[10px] mb-0.5 bg-cyan-100 p-0.5 border border-black">CONVOCATI</h3>
            <table className="w-full border-collapse border border-black text-[8px]">
              <thead>
                <tr className="bg-gradient-to-r from-cyan-200 to-pink-200">
                  <th className="border border-black px-0.5 py-0.5 w-7">N°</th>
                  <th className="border border-black px-0.5 py-0.5 text-left w-24">Cognome Nome</th>
                  <th className="border border-black px-0.5 py-0.5 w-10">Ruolo</th>
                  <th className="border border-black px-0.5 py-0.5 w-7">🟨</th>
                  <th className="border border-black px-0.5 py-0.5 w-6">T</th>
                  <th className="border border-black px-0.5 py-0.5 w-6">P</th>
                  <th className="border border-black px-0.5 py-0.5 w-6">CR</th>
                  <th className="border border-black px-0.5 py-0.5 w-6">CG</th>
                </tr>
              </thead>
              <tbody>
                {allConvocatiOrdinati.map((player, idx) => {
                  const currentRole = getRoleMacro(player.role);
                  const prevRole = idx > 0 ? getRoleMacro(allConvocatiOrdinati[idx - 1].role) : null;
                  const isRoleChange = currentRole !== prevRole;
                  
                  // Colore sfondo per ruolo
                  let bgColor = '';
                  if (currentRole === 'Portiere') bgColor = 'bg-blue-50';
                  else if (currentRole === 'Difensore') bgColor = 'bg-green-50';
                  else if (currentRole === 'Centrocampista') bgColor = 'bg-yellow-50';
                  else if (currentRole === 'Attaccante') bgColor = 'bg-red-50';
                  
                  return (
                    <tr key={player.id} className={bgColor}>
                      <td className={`border border-black px-0.5 py-0.5 text-center ${isRoleChange ? 'border-t-[3px]' : ''}`}>{idx + 1}</td>
                      <td className={`border border-black px-0.5 py-0.5 ${isRoleChange ? 'border-t-[3px]' : ''}`}>{player.lastName} {player.firstName}</td>
                      <td className={`border border-black px-0.5 py-0.5 text-center ${isRoleChange ? 'border-t-[3px]' : ''}`}>
                        {currentRole.substring(0, 3)}
                      </td>
                      <td className={`border border-black px-0.5 py-0.5 text-center ${isRoleChange ? 'border-t-[3px]' : ''}`}>{playerYellowCards[player.id] || 0}</td>
                      <td className={`border border-black px-0.5 py-0.5 text-center ${isRoleChange ? 'border-t-[3px]' : ''}`}>☐</td>
                      <td className={`border border-black px-0.5 py-0.5 text-center ${isRoleChange ? 'border-t-[3px]' : ''}`}>☐</td>
                      <td className={`border border-black px-0.5 py-0.5 text-center ${isRoleChange ? 'border-t-[3px]' : ''}`}>☐</td>
                      <td className={`border border-black px-0.5 py-0.5 text-center ${isRoleChange ? 'border-t-[3px]' : ''}`}>☐</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Sezione Cambi - righe più alte con colori */}
          <div className="mb-2">
            <h3 className="font-bold text-[10px] mb-0.5 bg-orange-100 p-0.5 border border-black">CAMBI</h3>
            <table className="w-full border-collapse border border-black text-[9px]">
              <thead>
                <tr className="bg-gradient-to-r from-orange-200 to-yellow-200">
                  <th className="border border-black px-1 py-0.5">Cognome OUT</th>
                  <th className="border border-black px-1 py-0.5 w-14">N° OUT</th>
                  <th className="border border-black px-1 py-0.5">Cognome IN</th>
                  <th className="border border-black px-1 py-0.5 w-14">N° IN</th>
                  <th className="border border-black px-1 py-0.5 w-16">Tempo</th>
                  <th className="border border-black px-1 py-0.5 w-16">Minuto</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-orange-50' : 'bg-white'}>
                    <td className="border border-black px-1 py-2.5"></td>
                    <td className="border border-black px-1 py-2.5"></td>
                    <td className="border border-black px-1 py-2.5"></td>
                    <td className="border border-black px-1 py-2.5"></td>
                    <td className="border border-black px-1 py-2.5"></td>
                    <td className="border border-black px-1 py-2.5"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sezione Tempi di Gioco con colori */}
          <div className="mb-2 border-2 border-black p-1.5 bg-purple-50">
            <h3 className="font-bold text-[10px] mb-1 text-purple-900">⏱️ TEMPI DI GIOCO</h3>
            <div className="flex gap-4 text-[9px]">
              <div className="flex-1">
                <strong>Recupero 1° Tempo:</strong> _________________
              </div>
              <div className="flex-1">
                <strong>Recupero 2° Tempo:</strong> _________________
              </div>
            </div>
          </div>

          {/* Sezione Goal Fatti / Goal Subiti - con colori FC-style */}
          <div className="grid grid-cols-2 gap-2">
            {/* Goal Fatti - PIÙ LINEE */}
            <div>
              <h3 className="font-bold text-[10px] mb-0.5 bg-green-100 p-0.5 border border-black">⚽ GOAL FATTI</h3>
              <table className="w-full border-collapse border border-black text-[9px]">
                <thead>
                  <tr className="bg-gradient-to-r from-green-200 to-cyan-200">
                    <th className="border border-black px-1 py-0.5 text-left">Cognome</th>
                    <th className="border border-black px-1 py-0.5 w-10">N°</th>
                    <th className="border border-black px-1 py-0.5 w-12">Min</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-green-50' : 'bg-white'}>
                      <td className="border border-black px-1 py-2"></td>
                      <td className="border border-black px-1 py-2"></td>
                      <td className="border border-black px-1 py-2"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Goal Subiti - MENO RETTANGOLI */}
            <div>
              <h3 className="font-bold text-[10px] mb-0.5 bg-red-100 p-0.5 border border-black">🥅 GOAL SUBITI</h3>
              <div className="border-2 border-black p-2 bg-red-50">
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="border-2 border-red-600 h-10 flex items-center justify-center font-bold text-sm bg-white hover:bg-red-100 transition-colors">
                      {i}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Layout standard per Report Completo, Ufficiale, Base
    return (
      <div ref={ref} className="bg-white text-black p-6" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="text-center mb-3">
          <h1 className="text-xl font-bold mb-1">SSD PRO ROMA CALCIO arl</h1>
        </div>

        {/* Logos and Title */}
        <div className="border-2 border-black p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <img src={proRomaLogo} alt="Pro Roma Calcio" className="h-16 w-16 object-contain border-0" />
            <div className="text-center flex-1">
              <h2 className="text-2xl font-bold">ELENCO</h2>
              <h2 className="text-2xl font-bold">CALCIATORI</h2>
            </div>
            {opponentLogoUrl ? (
              <img src={opponentLogoUrl} alt={opponent} className="h-16 w-16 object-contain border-0" />
            ) : (
              <div className="h-16 w-16 border-2 border-gray-300 rounded-full flex items-center justify-center bg-gray-100">
                <span className="text-xs text-gray-500 text-center">Logo<br/>Avv.</span>
              </div>
            )}
          </div>

          {/* Match Info */}
          <div className="grid grid-cols-3 gap-2 text-xs border-t-2 border-black pt-2">
            <div>
              <strong>Istruttore:</strong> Paolo Paradisi
            </div>
            <div>
              <strong>Categoria:</strong> Under 18
            </div>
            <div>
              <strong>Stagione:</strong> 2025/2026
            </div>
          </div>

          <div className="mt-2 text-xs leading-relaxed">
            <div className="mb-1">
              <span className="font-bold">I sotto elencati atleti sono convocati per il giorno:</span>{' '}
              <span className="text-red-600 font-bold">{formatDateLong(matchDate) || '______'}</span>
              {' '}
              <span className="font-bold">Data:</span>{' '}
              <span className="text-red-600 font-bold">{formatDateShort(matchDate) || '__.__'}</span>
            </div>
            <div className="mb-1">
              <span className="font-bold">Indirizzo del campo:</span>{' '}
              <span className="text-red-600 font-bold">{finalAddress || '______________________'}</span>
              {' '}
              <span className="font-bold">Alle ore:</span>{' '}
              <span className="text-red-600 font-bold">{fieldArrivalTime || '__.__'}</span>
            </div>
            <div className="mb-1">
              <span className="font-bold">Per disputare l'incontro:</span>{' '}
              <span className="text-red-600 font-bold">di Campionato</span>
              {' '}
              <span className="font-bold">Tra:</span>{' '}
              <span className="text-red-600 font-bold">{homeTeam || '______'}</span>
              {' '}
              <span className="font-bold">e</span>{' '}
              <span className="text-red-600 font-bold">{awayTeam || 'Pro Roma Calcio'}</span>
            </div>
            <div>
              <span className="font-bold">Che avrà inizio alle ore:</span>{' '}
              <span className="text-red-600 font-bold">{matchStartTime || '__.__'}</span>
              {' '}
              <span className="font-bold">Presso il campo:</span>{' '}
              <span className="text-red-600 font-bold">{finalAddress || '______________________'}</span>
            </div>
          </div>
        </div>

        {/* Convocati Table and Side Info */}
        <div className="flex gap-4 mb-4">
          {/* Left: Players Table */}
          <div className="flex-1">
            <table className="w-full border-collapse border-2 border-black text-[11px]" style={{ lineHeight: '1.4' }}>
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-black px-2 py-1 w-10">N°</th>
                  <th className="border border-black px-2 py-1 text-left">Cognome Nome</th>
                  <th className="border border-black px-2 py-1 w-14">Ruolo</th>
                  {reportType === 'ufficiale' && <th className="border border-black px-2 py-1 w-14">🟨 Gialli</th>}
                  {reportType === 'ufficiale' && <th className="border border-black px-2 py-1 w-14">All.ti</th>}
                  {reportType === 'ufficiale' && <th className="border border-black px-2 py-1 w-14">🤕 Inf.</th>}
                </tr>
              </thead>
            <tbody>
              {/* Portieri */}
              {portieri.length > 0 && (
                <>
                  <tr className="bg-blue-50">
                    <td colSpan={reportType === 'base' ? 3 : 6} className="border border-black px-2 py-1 font-bold">🥅 PORTIERI</td>
                  </tr>
                  {portieri.map((player, idx) => (
                    <tr key={player.id}>
                      <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border border-black px-2 py-1">{player.lastName} {player.firstName}</td>
                      <td className="border border-black px-2 py-1 text-center">Port</td>
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{playerYellowCards[player.id] || 0}</td>}
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{getAttendanceCount(player.id)}</td>}
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{getInjuryCount(player.id)}</td>}
                    </tr>
                  ))}
                </>
              )}

              {/* Difensori */}
              {difensori.length > 0 && (
                <>
                  <tr className="bg-green-50">
                    <td colSpan={reportType === 'base' ? 3 : 6} className="border border-black px-2 py-1 font-bold">🛡️ DIFENSORI</td>
                  </tr>
                  {difensori.map((player, idx) => (
                    <tr key={player.id}>
                      <td className="border border-black px-2 py-1 text-center">{portieri.length + idx + 1}</td>
                      <td className="border border-black px-2 py-1">{player.lastName} {player.firstName}</td>
                      <td className="border border-black px-2 py-1 text-center">Dif</td>
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{playerYellowCards[player.id] || 0}</td>}
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{getAttendanceCount(player.id)}</td>}
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{getInjuryCount(player.id)}</td>}
                    </tr>
                  ))}
                </>
              )}

              {/* Centrocampisti */}
              {centrocampisti.length > 0 && (
                <>
                  <tr className="bg-yellow-50">
                    <td colSpan={reportType === 'base' ? 3 : 6} className="border border-black px-2 py-1 font-bold">⚙️ CENTROCAMPISTI</td>
                  </tr>
                  {centrocampisti.map((player, idx) => (
                    <tr key={player.id}>
                      <td className="border border-black px-2 py-1 text-center">{portieri.length + difensori.length + idx + 1}</td>
                      <td className="border border-black px-2 py-1">{player.lastName} {player.firstName}</td>
                      <td className="border border-black px-2 py-1 text-center">Cen</td>
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{playerYellowCards[player.id] || 0}</td>}
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{getAttendanceCount(player.id)}</td>}
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{getInjuryCount(player.id)}</td>}
                    </tr>
                  ))}
                </>
              )}

              {/* Attaccanti */}
              {attaccanti.length > 0 && (
                <>
                  <tr className="bg-red-50">
                    <td colSpan={reportType === 'base' ? 3 : 6} className="border border-black px-2 py-1 font-bold">⚽ ATTACCANTI</td>
                  </tr>
                  {attaccanti.map((player, idx) => (
                    <tr key={player.id}>
                      <td className="border border-black px-2 py-1 text-center">{portieri.length + difensori.length + centrocampisti.length + idx + 1}</td>
                      <td className="border border-black px-2 py-1">{player.lastName} {player.firstName}</td>
                      <td className="border border-black px-2 py-1 text-center">Att</td>
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{playerYellowCards[player.id] || 0}</td>}
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{getAttendanceCount(player.id)}</td>}
                      {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">{getInjuryCount(player.id)}</td>}
                    </tr>
                  ))}
                </>
              )}

              {/* Giocatori da Altre Categorie */}
              {temporaryPlayers && temporaryPlayers.length > 0 && (
                <>
                  <tr className="bg-pink-100">
                    <td colSpan={reportType === 'base' ? 3 : 6} className="border border-black px-2 py-1 font-bold">👥 DA ALTRE CATEGORIE</td>
                  </tr>
                  {temporaryPlayers.map((player, idx) => {
                    const currentNumber = portieri.length + difensori.length + centrocampisti.length + attaccanti.length + idx + 1;
                    const roleAbbr = player.role.includes('Port') ? 'Port' : 
                                     player.role.includes('Difens') ? 'Dif' :
                                     player.role.includes('Centroc') ? 'Cen' : 'Att';
                    return (
                      <tr key={`temp-${idx}`}>
                        <td className="border border-black px-2 py-1 text-center">{currentNumber}</td>
                        <td className="border border-black px-2 py-1">{player.name} <span className="text-pink-600 font-semibold">({player.status === 'TITOLARE' ? 'T' : 'P'})</span></td>
                        <td className="border border-black px-2 py-1 text-center">{roleAbbr}</td>
                        {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">-</td>}
                        {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">-</td>}
                        {reportType === 'ufficiale' && <td className="border border-black px-2 py-1 text-center">-</td>}
                      </tr>
                    );
                  })}
                </>
              )}
            </tbody>
            </table>
          </div>

          {/* Right: Dirigenti e Info Utili - Vertical Layout */}
          <div className="w-80 space-y-3">
            {/* Dirigenti e Mister - Box Rosso */}
            <div className="border-2 border-red-600 p-3 bg-red-50">
              <h4 className="font-bold mb-1 text-red-700 text-xs">Dirigenti:</h4>
              <p className="mb-0.5 text-[10px]">Giancarlo Palombini</p>
              <p className="mb-0.5 text-[10px]">Fabrizio Gala</p>
              <p className="mt-1 mb-0.5 font-bold text-red-700 text-xs">Il direttore sportivo</p>
              <p className="font-bold mb-1 text-[10px]">Luigi Bosco</p>
              <h4 className="font-bold mt-2 mb-1 text-red-700 text-xs">Mister:</h4>
              <p className="mb-0.5 text-[10px]">Paolo Paradisi</p>
              <p className="mb-0.5 text-[10px]">Mister Luca Paradisi</p>
              <p className="mb-0 text-[10px]">Mister Francesco Suozzo</p>
            </div>
            
            {/* Info e Note - Sviluppato in Verticale */}
            <div className="border-2 border-black p-3">
              <h4 className="font-bold mb-2 text-xs">Info utili:</h4>
              <p className="text-red-600 font-bold mb-3 text-[10px] leading-relaxed">
                IMPORTANTE: portare documento/carta d'identità
              </p>
              <h4 className="font-bold mb-2 mt-4 text-xs">Note dal Mr:</h4>
              <p className="text-[10px] leading-relaxed">
                Massima puntualità, venire con tuta di rappresentanza e portare il kit di allenamento.
              </p>
            </div>
          </div>
        </div>

        {/* Non Convocati Section - Compatto */}
        {(espulsi.length > 0 || infortunati.length > 0 || ncAssenze.length > 0 || ncSceltaTecnica.length > 0 || ncMotiviSocietari.length > 0) && (
          <div className="border-2 border-red-600 p-2">
            <h3 className="text-xs font-bold mb-1 text-red-600">NON CONVOCATI</h3>
            
            {/* Espulsi */}
            {espulsi.length > 0 && (
              <div>
                <span className="font-bold text-red-700 text-[10px]">🔴 Espulsi:</span>{' '}
                <span className="text-[10px]">
                  {espulsi.map((player, idx) => (
                    <span key={player.id}>
                      {player.lastName} {player.firstName} ({player.suspensionDays || 0} gg)
                      {idx < espulsi.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {/* NC per assenze */}
            {ncAssenze.length > 0 && (
              <div>
                <span className="font-bold text-gray-700 text-[10px]">📵 NC per Assenze:</span>{' '}
                <span className="text-[10px]">
                  {ncAssenze.map((player, idx) => (
                    <span key={player.id}>
                      {player.lastName} {player.firstName} ({getAttendanceCount(player.id)}/3)
                      {idx < ncAssenze.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {/* NC scelta tecnica - nascosto in report ufficiale */}
            {!isOfficialReport && ncSceltaTecnica.length > 0 && (
              <div>
                <span className="font-bold text-orange-700 text-[10px]">⛔ NC Scelta Tecnica:</span>{' '}
                <span className="text-[10px]">
                  {ncSceltaTecnica.map((player, idx) => (
                    <span key={player.id}>
                      {player.lastName} {player.firstName}
                      {idx < ncSceltaTecnica.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {/* NC motivi societari - nascosto in report ufficiale */}
            {!isOfficialReport && ncMotiviSocietari.length > 0 && (
              <div>
                <span className="font-bold text-purple-700 text-[10px]">🏛️ NC Motivi Societari:</span>{' '}
                <span className="text-[10px]">
                  {ncMotiviSocietari.map((player, idx) => (
                    <span key={player.id}>
                      {player.lastName} {player.firstName}
                      {idx < ncMotiviSocietari.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </div>
            )}

            {/* Infortunati */}
            {infortunati.length > 0 && (
              <div>
                <span className="font-bold text-yellow-700 text-[10px]">🤕 Infortunati:</span>{' '}
                <span className="text-[10px]">
                  {infortunati.map((player, idx) => (
                    <span key={player.id}>
                      {player.lastName} {player.firstName}
                      {idx < infortunati.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

ReportConvocazione.displayName = 'ReportConvocazione';

export default ReportConvocazione;
