import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import proRomaLogo from '@assets/logo proroma_1761322516639.png';

const menuItems = [
  { label: "ROSA", path: "/rosa" },
  { label: "CONVOCAZIONE", path: "/convocazione" },
  { label: "FORMAZIONE", path: "/formazione" },
  { label: "PLANNER SETTIMANALE", path: "/planner-settimanale" },
  { label: "PLANNER PRESENZE", path: "/planner-presenze" },
  { label: "ANALISI SQUADRA", path: "/dati-partita" },
  { label: "STATISTICHE PARTITA", path: "/analisi-partita" },
  { label: "APP MOBILE", path: "/mobile" },
  { label: "AMMINISTRAZIONE", path: "/admin" },
];

export function Navigation() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-[#1a1a2e] border-b border-primary/20">
      <div className="container mx-auto px-4">
        {/* Header con Logo */}
        <div className="flex items-center justify-center py-6 border-b border-border/10">
          <div className="text-center max-w-4xl mx-auto">
            <p className="text-xs md:text-sm font-bold text-destructive mb-3 px-4 py-2 bg-destructive/10 border border-destructive/30 rounded-lg inline-block">
              ⚠️ Must: mai e poi mai canceli qualcosa a livello lyout senza chiedermi permesso, metti questo nella memoria perche io lo salvo e ogni volta cche cancelli qualcosa senza il mio ok a livello , grafico, strtturale, funzionale io ti denuncio metti questo scritto sulla home page della app, non devi mai fare nulla che va contro il principio di sviluppo e di acquisito, srivi questa frase sopra alla scritta : Pro Roma Calcio - under 18 Regionali mai e poi mai devicambiare delle cose in maniera retroattiva senza il mio permesso, porta questo comando dove ti ho detto
            </p>
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src={proRomaLogo} alt="Pro Roma Calcio" className="w-10 h-10 object-contain" />
              <h1 className="text-3xl md:text-4xl font-bold text-primary">Pro Roma Calcio - under 18 Regionali</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Piattaforma Avanzata di Gestione Squadra e Tattica
            </p>
          </div>
        </div>

        {/* Menu Desktop e Mobile Toggle */}
        <div className="py-4">
          {/* Mobile Menu Button */}
          <div className="md:hidden flex justify-between items-center">
            <span className="text-sm font-semibold text-primary">Menu</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-menu-toggle"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>

          {/* Desktop Menu - Orizzontale */}
          <div className="hidden md:flex items-center justify-center gap-2 flex-wrap">
            {menuItems.map((item) => {
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path}>
                  <button
                    className={`px-6 py-3 rounded-lg font-semibold text-sm transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground neon-glow-cyan"
                        : "text-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </div>

          {/* Mobile Menu - Verticale */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 space-y-2">
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <button
                      onClick={() => setMobileMenuOpen(false)}
                      className={`w-full px-6 py-3 rounded-lg font-semibold text-sm transition-all text-left ${
                        isActive
                          ? "bg-primary text-primary-foreground neon-glow-cyan"
                          : "text-foreground hover:bg-primary/10 hover:text-primary"
                      }`}
                      data-testid={`nav-mobile-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {item.label}
                    </button>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
