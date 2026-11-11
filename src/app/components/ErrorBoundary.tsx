import { useRouteError, isRouteErrorResponse, Link } from "react-router";
import { Button } from "./ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export function RouteErrorBoundary() {
  const error = useRouteError();

  let title = "Unexpected Application Error";
  let description = "Something went wrong while loading this page.";
  let statusText = "";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = "Page Not Found";
      description = "The page or section you were looking for doesn't exist or has been relocated.";
      statusText = "404 Not Found";
    } else {
      statusText = `${error.status} ${error.statusText}`;
      description = error.data?.message || description;
    }
  } else if (error instanceof Error) {
    description = error.message;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {statusText && (
          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
            {statusText}
          </span>
        )}

        <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-600 text-sm mb-6">{description}</p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="bg-green-700 hover:bg-green-800 text-white">
            <Link to="/app" className="flex items-center gap-2">
              <Home className="w-4 h-4" /> Go to Dashboard
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Reload Page
          </Button>
        </div>
      </div>
    </div>
  );
}

