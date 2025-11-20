import type { Player } from '@shared/schema';

// Mapping dei ruoli giocatore alle posizioni abbreviate
export const ROLE_TO_POSITION_MAP: Record<string, string[]> = {
  'Portiere': ['POR'],
  'Difensore Centrale': ['DC'],
  'Terzino Destro': ['TD', 'ED'],
  'Terzino Sinistro': ['TS', 'ES'],
  'Difensore': ['DC', 'TD', 'TS'],
  'Centrocampista Centrale': ['CC', 'CDC', 'COC'],
  'Centrocampista Difensivo Centrale': ['CDC', 'CC'],
  'Centrocampista Offensivo Centrale': ['COC', 'TRQ', 'CC'],
  'Centrocampista': ['CC', 'CDC', 'COC'],
  'Trequartista': ['TRQ', 'COC', 'AD', 'AS'],
  'Esterno Destro': ['ED', 'AD', 'TD'],
  'Esterno Sinistro': ['ES', 'AS', 'TS'],
  'Ala Destra': ['AD', 'ED'],
  'Ala Sinistra': ['AS', 'ES'],
  'Ala': ['AD', 'AS', 'ALA'],
  'Attaccante': ['ATT', 'PC', 'AD', 'AS'],
  'Punta Centrale': ['PC', 'ATT'],
};

// Posizioni disponibili per formazione
export const FORMATION_POSITIONS: Record<string, string[]> = {
  '4-4-2': ['POR', 'TD', 'DC', 'DC', 'TS', 'ED', 'CC', 'CC', 'ES', 'ATT', 'ATT'],
  '4-3-3': ['POR', 'TD', 'DC', 'DC', 'TS', 'CC', 'CC', 'CC', 'AD', 'PC', 'AS'],
  '3-5-2': ['POR', 'DC', 'DC', 'DC', 'ED', 'CC', 'CC', 'CC', 'ES', 'ATT', 'ATT'],
  '4-2-3-1': ['POR', 'TD', 'DC', 'DC', 'TS', 'CDC', 'CDC', 'AD', 'TRQ', 'AS', 'PC'],
  '3-4-3': ['POR', 'DC', 'DC', 'DC', 'ED', 'CC', 'CC', 'ES', 'AD', 'PC', 'AS'],
  '4-5-1': ['POR', 'TD', 'DC', 'DC', 'TS', 'ED', 'CC', 'CC', 'CC', 'ES', 'PC'],
  '5-3-2': ['POR', 'TD', 'DC', 'DC', 'DC', 'TS', 'CC', 'CC', 'CC', 'ATT', 'ATT'],
  '5-4-1': ['POR', 'TD', 'DC', 'DC', 'DC', 'TS', 'ED', 'CC', 'CC', 'ES', 'PC'],
  '4-3-2-1': ['POR', 'TD', 'DC', 'DC', 'TS', 'CC', 'CC', 'CC', 'AD', 'AS', 'PC'],
  '3-4-1-2': ['POR', 'DC', 'DC', 'DC', 'ED', 'CC', 'CC', 'ES', 'TRQ', 'ATT', 'ATT'],
};

/**
 * Calcola la posizione migliore per un giocatore in una formazione specifica
 * Priorità:
 * 1. Posizione personalizzata (formationPositions)
 * 2. Ruolo principale con specializzazioni (roleSpecializations)
 * 3. Ruolo principale generico
 * 4. Portieri restano SEMPRE in porta
 */
export function getPlayerPositionForFormation(
  player: Player,
  formation: string,
  alreadyAssignedPositions: Set<string> = new Set()
): string | null {
  // 1. PRIORITÀ MASSIMA: Posizione globale (stessa per tutte le formazioni)
  if (player.formationPositions && player.formationPositions['*']) {
    return player.formationPositions['*'];
  }

  // 2. PRIORITÀ ALTA: Posizione personalizzata specifica per formazione
  if (player.formationPositions && player.formationPositions[formation]) {
    return player.formationPositions[formation];
  }

  // 3. REGOLA ASSOLUTA: Portieri restano SEMPRE in porta
  if (player.role?.toLowerCase().includes('portiere')) {
    return 'POR';
  }

  const formationPositions = FORMATION_POSITIONS[formation] || [];

  // 3. Usa roleSpecializations se disponibili
  if (player.roleSpecializations && Object.keys(player.roleSpecializations).length > 0) {
    // Ordina le specializzazioni per percentuale (dalla più alta alla più bassa)
    const sortedSpecs = Object.entries(player.roleSpecializations)
      .sort(([, a], [, b]) => b - a);

    for (const [role, _percentage] of sortedSpecs) {
      const possiblePositions = ROLE_TO_POSITION_MAP[role] || [];
      
      for (const pos of possiblePositions) {
        // Trova una posizione disponibile in questa formazione che non sia già assegnata
        if (formationPositions.includes(pos) && !alreadyAssignedPositions.has(pos)) {
          return pos;
        }
      }
    }
  }

  // 4. Fallback: usa il ruolo principale
  if (player.role) {
    const possiblePositions = ROLE_TO_POSITION_MAP[player.role] || [];
    
    for (const pos of possiblePositions) {
      if (formationPositions.includes(pos) && !alreadyAssignedPositions.has(pos)) {
        return pos;
      }
    }
  }

  // 5. Nessuna posizione trovata
  return null;
}

/**
 * Assegna automaticamente tutti i giocatori alla formazione in modo intelligente
 */
export function assignPlayersToFormation(
  players: Player[],
  formation: string
): Record<number, string> {
  const assignments: Record<number, string> = {};
  const assignedPositions = new Set<string>();

  // Prima passata: Portieri e posizioni personalizzate (globali e specifiche)
  for (const player of players) {
    if (player.role?.toLowerCase().includes('portiere')) {
      assignments[player.id] = 'POR';
      assignedPositions.add('POR');
    } else if (player.formationPositions && player.formationPositions['*']) {
      // Posizione globale (stessa per tutte le formazioni)
      const globalPos = player.formationPositions['*'];
      assignments[player.id] = globalPos;
      assignedPositions.add(globalPos);
    } else if (player.formationPositions && player.formationPositions[formation]) {
      // Posizione specifica per questa formazione
      const customPos = player.formationPositions[formation];
      assignments[player.id] = customPos;
      assignedPositions.add(customPos);
    }
  }

  // Seconda passata: Altri giocatori in base a specializzazioni e ruolo
  for (const player of players) {
    if (!assignments[player.id]) {
      const position = getPlayerPositionForFormation(player, formation, assignedPositions);
      if (position) {
        assignments[player.id] = position;
        assignedPositions.add(position);
      }
    }
  }

  return assignments;
}

/**
 * Verifica se un giocatore può giocare in una certa posizione
 */
export function canPlayerPlayPosition(player: Player, position: string): boolean {
  // Portieri possono giocare solo in porta
  if (player.role?.toLowerCase().includes('portiere')) {
    return position === 'POR';
  }

  // Posizione globale (tutte le formazioni)
  if (player.formationPositions && player.formationPositions['*']) {
    return player.formationPositions['*'] === position;
  }

  // Posizione personalizzata specifica
  if (player.formationPositions) {
    for (const [formation, pos] of Object.entries(player.formationPositions)) {
      if (formation !== '*' && pos === position) return true;
    }
  }

  // Controlla roleSpecializations
  if (player.roleSpecializations) {
    for (const role of Object.keys(player.roleSpecializations)) {
      const possiblePositions = ROLE_TO_POSITION_MAP[role] || [];
      if (possiblePositions.includes(position)) return true;
    }
  }

  // Controlla ruolo principale
  if (player.role) {
    const possiblePositions = ROLE_TO_POSITION_MAP[player.role] || [];
    return possiblePositions.includes(position);
  }

  return false;
}
