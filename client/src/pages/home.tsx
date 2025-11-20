import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Shield, Settings, Smartphone } from "lucide-react";
import { Navigation } from "@/components/Navigation";

export default function HomePage() {
  const menuItems = [
    {
      title: "Rosa",
      description: "Gestisci giocatori, ruoli e numeri di maglia",
      icon: Users,
      href: "/rosa",
      color: "text-blue-600",
      testId: "link-rosa"
    },
    {
      title: "Presenze",
      description: "Registra presenze allenamento e visualizza statistiche",
      icon: Calendar,
      href: "/presenze",
      color: "text-green-600",
      testId: "link-presenze"
    },
    {
      title: "Formazione",
      description: "Seleziona titolari e panchina per la partita",
      icon: Shield,
      href: "/formazione",
      color: "text-purple-600",
      testId: "link-formazione"
    },
    {
      title: "App Mobile",
      description: "Visualizza interfaccia mobile ottimizzata",
      icon: Smartphone,
      href: "/mobile",
      color: "text-orange-600",
      testId: "link-mobile"
    },
    {
      title: "Amministrazione",
      description: "Scarica dati, carica rosa e configura eventi",
      icon: Settings,
      href: "/admin",
      color: "text-gray-600",
      testId: "link-admin"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Gestione Presenze Calcio
          </h1>
          <p className="text-muted-foreground text-lg">
            Sistema completo per gestione rosa, presenze e partite live
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card 
                className="hover-elevate active-elevate-2 transition-all cursor-pointer h-full"
                data-testid={item.testId}
              >
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg bg-muted ${item.color}`}>
                      <item.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">{item.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {item.description}
                  </CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="text-lg">🎯 Funzionalità Principali</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 rounded-md bg-muted">
                  <p className="font-semibold mb-1">Gestione Rosa</p>
                  <p className="text-muted-foreground">Aggiungi, modifica ed elimina giocatori</p>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <p className="font-semibold mb-1">Presenze & Report</p>
                  <p className="text-muted-foreground">Traccia presenze e scarica statistiche</p>
                </div>
                <div className="p-3 rounded-md bg-muted">
                  <p className="font-semibold mb-1">Partita Live</p>
                  <p className="text-muted-foreground">Timer, eventi e sostituzioni in tempo reale</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
