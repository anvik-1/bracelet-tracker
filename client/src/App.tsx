import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UnitsProvider } from "./contexts/UnitsContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import AddBracelet from "./pages/AddBracelet";
import EditBracelet from "./pages/EditBracelet";
import ThreadLibrary from "./pages/ThreadLibrary";
import Analytics from "./pages/Analytics";
import StringCalculator from "./pages/StringCalculator";
import BraceletDetail from "./pages/BraceletDetail";

function Router() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/add" component={AddBracelet} />
        <Route path="/edit/:id" component={EditBracelet} />
        <Route path="/bracelet/:id" component={BraceletDetail} />
        <Route path="/threads" component={ThreadLibrary} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/calculator" component={StringCalculator} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <UnitsProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </UnitsProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
