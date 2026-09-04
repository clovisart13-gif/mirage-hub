import { createRoot } from "react-dom/client";
import "../index.css";
import { gtmInit } from "../lib/gtm";
import LpSistema from "../pages/lp-sistema";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Elemento #root não encontrado.");
}

gtmInit();
createRoot(root).render(<LpSistema />);