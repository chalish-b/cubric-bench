import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import PllTest from "./PllTest";

// Tiny query-param router: ?page=pll opens the PLL algorithm test page.
const page = new URLSearchParams(window.location.search).get("page");
const Root = page === "pll" ? PllTest : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Root />
  </StrictMode>
);
