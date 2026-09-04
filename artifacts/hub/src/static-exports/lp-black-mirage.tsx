import { createRoot } from "react-dom/client";
import "../index.css";
import LpBlackFriday from "../pages/lp-black-friday";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Elemento #root não encontrado.");
}

createRoot(root).render(<LpBlackFriday />);