import { StrictMode } from 'react';
  import { createRoot } from "react-dom/client";
  import { RouterProvider } from 'react-router';
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import './lib/i18n';

  createRoot(document.getElementById("root")!).render(<App />);