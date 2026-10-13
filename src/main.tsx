import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AppProviders } from "./AppProviders";
// PrimeReact styles are loaded globally so every list page (DataTable, Paginator, etc.)
// is styled regardless of which lazy-loaded route happened to load first.
import "primereact/resources/themes/lara-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./index.css";
import "./i18n";        

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <AppProviders>
      <App />
    </AppProviders>
);
