import React from "react";
import { createRoot } from "react-dom/client";
import TripDeckApp from "./TripDeckApp.jsx";
import "../css/app.css";

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <TripDeckApp />
    </React.StrictMode>,
  );
}
