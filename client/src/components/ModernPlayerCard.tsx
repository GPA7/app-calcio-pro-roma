import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  Eye, 
  Timer, 
  UserCheck, 
  TrendingUp,
  Shield,
  Target,
  Zap,
  Users
} from 'lucide-react';
import type { Player } from '@shared/schema';

interface ModernPlayerCardProps {
  player: Player;
  onView: (player: Player) => void;
  onDelete: (id: number) => void;
  stats?: {
    minutesPlayed?: number;
    convocations?: number;
    minuteEntered?: number;
  };
}

// Ruoli e loro icone/colori
const roleConfig: Record<string, { icon: any; color: string; bgColor: string }> = {
  'Portiere': { icon: Shield, color: '#10b981', bgColor: 'bg-emerald-500/10' },
  'Difensore': { icon: Shield, color: '#3b82f6', bgColor: 'bg-blue-500/10' },
  'Difensore Centrale': { icon: Shield, color: '#3b82f6', bgColor: 'bg-blue-500/10' },
  'Terzino Destro': { icon: Shield, color: '#3b82f6', bgColor: 'bg-blue-500/10' },
  'Terzino Sinistro': { icon: Shield, color: '#3b82f6', bgColor: 'bg-blue-500/10' },
  'Centrocampista': { icon: Zap, color: '#f59e0b', bgColor: 'bg-amber-500/10' },
  'Centrocampista Centrale': { icon: Zap, color: '#f59e0b', bgColor: 'bg-amber-500/10' },
  'Trequartista': { icon: Target, color: '#8b5cf6', bgColor: 'bg-violet-500/10' },
  'Attaccante': { icon: Target, color: '#ef4444', bgColor: 'bg-red-500/10' },
  'Ala Destra': { icon: TrendingUp, color: '#ec4899', bgColor: 'bg-pink-500/10' },
  'Ala Sinistra': { icon: TrendingUp, color: '#ec4899', bgColor: 'bg-pink-500/10' },
  'Esterno Alto Destro': { icon: TrendingUp, color: '#ec4899', bgColor: 'bg-pink-500/10' },
  'default': { icon: Users, color: '#64748b', bgColor: 'bg-slate-500/10' }
};

export function ModernPlayerCard({ player, onView, onDelete, stats }: ModernPlayerCardProps) {
  const [imageError, setImageError] = useState(false);

  // Get role config
  const role = player.role || 'default';
  const config = roleConfig[role] || roleConfig.default;
  const RoleIcon = config.icon;

  // Get initials for fallback
  const getInitials = () => {
    const first = player.firstName?.charAt(0)?.toUpperCase() || '';
    const last = player.lastName?.charAt(0)?.toUpperCase() || '';
    return `${last}${first}`;
  };

  // Get status badge
  const getStatusBadge = () => {
    if (player.convocationStatus === 'Espulso') {
      return <Badge className="bg-red-600 text-white text-[10px] px-2 py-0.5">🔴 Espulso</Badge>;
    }
    if (player.convocationStatus === 'Riabilitato') {
      return <Badge className="bg-green-600 text-white text-[10px] px-2 py-0.5">✅ Riabilitato</Badge>;
    }
    if (player.convocationStatus === 'Riabilitato Infortunato') {
      return <Badge className="bg-orange-600 text-white text-[10px] px-2 py-0.5">🟠 Riab. Infort.</Badge>;
    }
    if (player.convocationStatus === 'Infortunato') {
      return <Badge className="bg-yellow-600 text-white text-[10px] px-2 py-0.5">🤕 Infortunato</Badge>;
    }
    if (player.isConvocato === 1) {
      return <Badge className="bg-cyan-500 text-white text-[10px] px-2 py-0.5">✅ Convocato</Badge>;
    }
    return null;
  };

  return (
    <div 
      className="group relative overflow-hidden rounded-xl transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02]"
      style={{
        background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FF8C00 100%)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      }}
      data-testid={`card-player-${player.id}`}
    >
      {/* Hover Glow Effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(0, 234, 255, 0.3) 0%, transparent 70%)',
        }}
      />

      {/* Geometric Pattern Background */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`pattern-${player.id}`} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="2" fill="white" opacity="0.5"/>
              <rect x="10" y="10" width="20" height="20" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#pattern-${player.id})`} />
        </svg>
      </div>

      {/* Card Content */}
      <div className="relative p-5 flex flex-col h-full">
        {/* Header: Jersey Number + Status */}
        <div className="flex items-start justify-between mb-3">
          {/* Jersey Number */}
          <div className="flex-shrink-0">
            <div className="text-6xl font-black text-white/90" style={{ 
              textShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 20px rgba(255,255,255,0.5)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              letterSpacing: '-0.05em'
            }}>
              {player.number || '—'}
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge()}
          </div>
        </div>

        {/* Player Name */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-white leading-tight mb-1" style={{
            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}>
            {player.lastName}
          </h3>
          <p className="text-sm font-semibold text-white/90" style={{
            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
          }}>
            {player.firstName}
          </p>
        </div>

        {/* Photo / Avatar Section */}
        <div className="mb-4 flex justify-center">
          {player.photoUrl && !imageError ? (
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white/30 shadow-xl">
              <img
                src={player.photoUrl}
                alt={`${player.firstName} ${player.lastName}`}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full flex items-center justify-center border-4 border-white/30 shadow-xl"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <span className="text-5xl font-black text-white/90" style={{
                textShadow: '0 2px 6px rgba(0,0,0,0.4)'
              }}>
                {getInitials()}
              </span>
            </div>
          )}
        </div>

        {/* Role Badge */}
        <div className="mb-4 flex justify-center">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${config.bgColor} border border-white/20`}
            style={{
              backdropFilter: 'blur(10px)',
              background: 'rgba(255, 255, 255, 0.15)'
            }}
          >
            <RoleIcon className="w-4 h-4 text-white" />
            <span className="text-sm font-bold text-white">
              {player.role || 'N/D'}
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Minuti Giocati */}
          <div className="text-center p-3 rounded-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <Timer className="w-4 h-4 text-white mx-auto mb-1" />
            <div className="text-2xl font-black text-white" style={{
              textShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}>
              {stats?.minutesPlayed || 0}
            </div>
            <div className="text-[9px] font-semibold text-white/80 uppercase tracking-wide">
              Min
            </div>
          </div>

          {/* Convocazioni */}
          <div className="text-center p-3 rounded-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <UserCheck className="w-4 h-4 text-white mx-auto mb-1" />
            <div className="text-2xl font-black text-white" style={{
              textShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}>
              {stats?.convocations || 0}
            </div>
            <div className="text-[9px] font-semibold text-white/80 uppercase tracking-wide">
              Conv
            </div>
          </div>

          {/* Minuto Entrato */}
          <div className="text-center p-3 rounded-lg"
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
          >
            <TrendingUp className="w-4 h-4 text-white mx-auto mb-1" />
            <div className="text-2xl font-black text-white" style={{
              textShadow: '0 1px 3px rgba(0,0,0,0.3)'
            }}>
              {stats?.minuteEntered || 0}
            </div>
            <div className="text-[9px] font-semibold text-white/80 uppercase tracking-wide">
              Entrato
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(player)}
            className="bg-white/20 hover:bg-white/30 border-white/30 text-white font-bold backdrop-blur-sm"
            data-testid={`button-view-${player.id}`}
          >
            <Eye className="w-4 h-4 mr-2" />
            Dettagli
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(player.id)}
            className="bg-red-500/30 hover:bg-red-500/50 border-red-400/50 text-white font-bold backdrop-blur-sm"
            data-testid={`button-delete-${player.id}`}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Elimina
          </Button>
        </div>
      </div>

      {/* Premium Shine Effect */}
      <div className="absolute top-0 left-0 w-full h-full opacity-0 group-hover:opacity-30 transition-opacity duration-500 pointer-events-none"
        style={{
          background: 'linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.8) 50%, transparent 70%)',
          backgroundSize: '200% 200%',
          animation: 'shine 2s infinite'
        }}
      />
    </div>
  );
}
