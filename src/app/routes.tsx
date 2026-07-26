import { createBrowserRouter } from "react-router";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Landing } from "./pages/Landing";
import { Dashboard } from "./pages/Dashboard";
import { Alerts } from "./pages/Alerts";
import { DataAnalytics } from "./pages/DataAnalytics";
import { Settings } from "./pages/Settings";
import { Records } from "./pages/Records";
import { DryersList } from "./pages/dryers/DryersList";
import { DryerDetails } from "./pages/dryers/DryerDetails";
import { Layout } from "./components/Layout";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/landing",
    element: <Landing />,
  },
  {
    path: "/app",
    element: <Layout />,
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
        path: "dryers",
        element: <DryersList />,
      },
      {
        path: "dryers/:dryerId",
        element: <DryerDetails />,
      },
      {
        path: "records",
        element: <Records />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
    ],
  },
]);
