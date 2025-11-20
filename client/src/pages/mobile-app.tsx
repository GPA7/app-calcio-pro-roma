import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Users, Shield, Calendar, ClipboardList } from "lucide-react";

export default function MobileAppPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const timeString = currentTime.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateString = currentTime.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Buongiorno!';
    if (hour < 18) return 'Buon pomeriggio!';
    return 'Buonasera!';
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <div className="h-full overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👋</span>
              <h2 className="text-2xl font-bold text-foreground">{getGreeting()}</h2>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <span>{timeString} • {dateString.split(' ')[0]}</span>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                Online
              </Badge>
            </div>
          </div>

          {/* Azioni Rapide */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              ⚡ Azioni Rapide
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <Link href="/partita-live?mobile=true">
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-primary/10 border border-primary/30 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-goto-partita-live">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-3xl">⚽</span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Partita Live</p>
                    <p className="text-xs text-muted-foreground">Apri Pulsantiera</p>
                  </div>
                </div>
              </Link>

              <Link href="/partita-offline">
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-goto-partita-offline">
                  <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center">
                    <span className="text-3xl">📝</span>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Partita Offline</p>
                    <p className="text-xs text-muted-foreground">Registra eventi</p>
                  </div>
                </div>
              </Link>

              <Link href="/mobile#convocati">
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-green-500/10 border border-green-500/30 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-goto-convocati">
                  <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center">
                    <ClipboardList className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Lista Convocati</p>
                    <p className="text-xs text-muted-foreground">Vedi convocazione</p>
                  </div>
                </div>
              </Link>

              <Link href="/presenze">
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-secondary/10 border border-secondary/30 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-goto-presenze">
                  <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
                    <Calendar className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Presenze</p>
                    <p className="text-xs text-muted-foreground">Registra oggi</p>
                  </div>
                </div>
              </Link>

              <Link href="/formazione">
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-goto-formazione">
                  <div className="w-14 h-14 rounded-full bg-purple-500 flex items-center justify-center">
                    <Shield className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Formazione</p>
                    <p className="text-xs text-muted-foreground">Modifica lineup</p>
                  </div>
                </div>
              </Link>

              <Link href="/rosa">
                <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-500/10 border border-blue-500/30 hover-elevate active-elevate-2 cursor-pointer" data-testid="button-goto-rosa">
                  <div className="w-14 h-14 rounded-full bg-blue-500 flex items-center justify-center">
                    <Users className="h-7 w-7" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Rosa</p>
                    <p className="text-xs text-muted-foreground">Vedi squadra</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
