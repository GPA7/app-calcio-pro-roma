import { Switch, Route } from "wouter";
import { useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import HomePage from "@/pages/home";
import RosterPage from "@/pages/roster";
import MatchLivePage from "@/pages/match-live";
import MatchOfflinePage from "@/pages/match-offline";
import MatchReportPage from "@/pages/match-report";
import MatchDataPage from "@/pages/match-data";
import AdminPage from "@/pages/admin";
import MobilePage from "@/pages/mobile";
import MobileAppPage from "@/pages/mobile-app";
import AttendancePage from "@/pages/attendance";
import AttendancePlannerPage from "@/pages/attendance-planner";
import ConvocazionePage from "@/pages/convocazione";
import FormazioniPage from "@/pages/formazioni-new";
import TattichePage from "@/pages/tattiche";
import WeeklyPlannerPage from "@/pages/weekly-planner";
import PlayerDetailPage from "@/pages/player-detail";
import AnalisiPartitaPage from "@/pages/analisi-partita";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/rosa" component={RosterPage} />
      <Route path="/giocatore/:id" component={PlayerDetailPage} />
      <Route path="/convocazione" component={ConvocazionePage} />
      <Route path="/formazione" component={FormazioniPage} />
      <Route path="/tattiche" component={TattichePage} />
      <Route path="/partita-live" component={MatchLivePage} />
      <Route path="/partita-offline" component={MatchOfflinePage} />
      <Route path="/match-report/:matchId" component={MatchReportPage} />
      <Route path="/dati-partita" component={MatchDataPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/mobile" component={MobilePage} />
      <Route path="/mobile-app" component={MobileAppPage} />
      <Route path="/presenze" component={AttendancePage} />
      <Route path="/planner-presenze" component={AttendancePlannerPage} />
      <Route path="/planner-settimanale" component={WeeklyPlannerPage} />
      <Route path="/analisi-partita" component={AnalisiPartitaPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
