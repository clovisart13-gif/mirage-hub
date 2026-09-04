import { Switch, Route, Router as WouterRouter } from "wouter";
import Home from "@/pages/Home";
import GeralOnboarding from "@/pages/GeralOnboarding";
import HelenaOnboarding from "@/pages/HelenaOnboarding";
import ErpOnboarding from "@/pages/ErpOnboarding";
import DiagnosticoForm from "@/pages/DiagnosticoForm";
import FornecedoresForm from "@/pages/FornecedoresForm";
import CandidatosForm from "@/pages/CandidatosForm";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/geral" component={GeralOnboarding} />
      <Route path="/helena" component={HelenaOnboarding} />
      <Route path="/erp" component={ErpOnboarding} />
      <Route path="/diagnostico" component={DiagnosticoForm} />
      <Route path="/fornecedores" component={FornecedoresForm} />
      <Route path="/candidatos" component={CandidatosForm} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Router />
    </WouterRouter>
  );
}
