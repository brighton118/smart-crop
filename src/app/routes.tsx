import { createBrowserRouter, Navigate } from "react-router";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Alerts } from "./pages/Alerts";
import { DataAnalytics } from "./pages/DataAnalytics";
import { Settings } from "./pages/Settings";
import { Records } from "./pages/Records";
import { PlantsManagement } from "./pages/PlantsManagement";
import { Layout } from "./components/Layout";
import { RouteErrorBoundary } from "./components/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/register",
    element: <Register />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/landing",
    element: <Landing />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/app",
    element: <Layout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: "alerts",
        element: <Alerts />,
      },
      {
        path: "data-analytics",
        element: <DataAnalytics />,
      },
      {
        path: "records",
        element: <Records />,
      },
      {
        path: "plants",
        element: <PlantsManagement />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        // Safe redirect for previous dryers route
        path: "dryers/*",
        element: <Navigate to="/app" replace />,
      },
      {
        path: "dryers",
        element: <Navigate to="/app" replace />,
      },
      {
        path: "*",
        element: <Navigate to="/app" replace />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/app" replace />,
  },
]);
