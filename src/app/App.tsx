import { RouterProvider } from "react-router";
import { router } from "./routes";
import { AuthProvider } from "./components/AuthProvider";
import { AutomationProvider } from "../lib/simulation/AutomationEngine";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  return (
    <AuthProvider>
      <AutomationProvider>
        <RouterProvider router={router} />
      </AutomationProvider>
      <Toaster />
    </AuthProvider>
  );
}
