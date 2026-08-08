import { useState, useEffect } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { useAuth } from "../components/AuthProvider";
import { supabase } from "../../lib/supabase";
import { getOrCreateDefaultFarm } from "../../lib/farmUtils";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Droplets,
  Cloud,
  Thermometer,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bell,
  Sparkles
} from "lucide-react";

// Section icon images
const SECTION_ICONS = {
  soil: "/icons/icon_soil_moisture.png",
  pest: "/icons/icon_pest_warnings.png",
  weather: "/icons/icon_weather_alerts.png",
  temperature: "/icons/icon_temperature_alerts.png",
  growth: "/icons/icon_growth_yield.png",
  general: "/icons/icon_growth_yield.png",
} as const;

// ── Types ──────────────────────────────────────────────────────────────────

type LocalAlertStatus = "critical" | "warning" | "normal";

interface LocalAlert {
  id: string;
  title: string;
  message: string;
  status: LocalAlertStatus;
  icon: React.ElementType;
  time: string;
  recommendation?: string;
  dbStatus: string;
}

interface AlertSection {
  key: string;
  label: string;
  sectionIcon: React.ElementType;
  imgSrc: string;
  color: {
    header: string;
    iconBg: string;
    iconFg: string;
    dot: string;
  };
  alerts: LocalAlert[];
}

// ── Style helpers ─────────────────────────────────────────────────────────

function getAlertStyles(status: LocalAlertStatus) {
  switch (status) {
    case "critical":
      return {
        card: "bg-red-50 border-red-200",
        iconBg: "bg-red-100",
        iconFg: "text-red-600",
        badge: "destructive" as const,
        label: "Critical",
      };
    case "warning":
      return {
        card: "bg-yellow-50 border-yellow-200",
        iconBg: "bg-yellow-100",
        iconFg: "text-yellow-600",
        badge: "outline" as const,
        label: "Warning",
      };
    case "normal":
      return {
        card: "bg-green-50 border-green-200",
        iconBg: "bg-green-100",
        iconFg: "text-green-600",
        badge: "secondary" as const,
        label: "Normal",
      };
  }
}

function StatusIcon({ status }: { status: LocalAlertStatus }) {
  if (status === "critical") return <AlertTriangle className="w-4 h-4" />;
  if (status === "warning") return <AlertCircle className="w-4 h-4" />;
  return <CheckCircle className="w-4 h-4" />;
}

// ── Alert Card ─────────────────────────────────────────────────────────────

function AlertCard({ alert, onDismiss }: { alert: LocalAlert; onDismiss: (id: string) => void }) {
  const styles = getAlertStyles(alert.status);
  const Icon = alert.icon;
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className={`${styles.card} border`}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            <div className={`${styles.iconBg} rounded-lg p-2.5 flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${styles.iconFg}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <h4 className="font-semibold text-gray-900 text-sm">{alert.title}</h4>
                <Badge variant={styles.badge} className="flex items-center gap-1 text-xs">
                  <StatusIcon status={alert.status} />
                  {styles.label}
                </Badge>
              </div>
              <p className="text-sm text-gray-700">{alert.message}</p>
              {alert.recommendation && (
                <div className="mt-3 p-3 bg-white/60 rounded-lg border border-gray-200">
                  <p className="text-xs font-semibold text-gray-800 mb-1">💡 AI Recommendation</p>
                  <p className="text-xs text-gray-700">{alert.recommendation}</p>
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">{alert.time}</p>

              {/* Expanded Details */}
              {showDetails && (
                <div className="mt-3 p-4 bg-white rounded-lg border border-gray-200 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="font-semibold text-gray-600">Alert ID</p>
                      <p className="text-gray-800 font-mono">{alert.id.slice(0, 12)}…</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600">Severity</p>
                      <p className="text-gray-800 capitalize">{alert.status}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600">Database Status</p>
                      <p className="text-gray-800">{alert.dbStatus}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-600">Timestamp</p>
                      <p className="text-gray-800">{alert.time}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 pt-1 border-t">{alert.message}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={() => {
                const event = new CustomEvent('openAiChatContext', {
                  detail: { prompt: `Can you explain why I received this alert and what I should do? Alert: [${alert.title}] ${alert.message}` }
                });
                window.dispatchEvent(event);
              }}
              title="Ask AI to analyze this alert"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Ask AI
            </Button>
            <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setShowDetails((v) => !v)}>
              {showDetails ? "Hide" : "Details"}
            </Button>
            <button
              onClick={() => onDismiss(alert.id)}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Section ────────────────────────────────────────────────────────────────

function AlertSectionGroup({
  section,
  alerts,
  onDismiss,
}: {
  section: AlertSection;
  alerts: LocalAlert[];
  onDismiss: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const criticalCount = alerts.filter((a) => a.status === "critical").length;
  const warningCount = alerts.filter((a) => a.status === "warning").length;

  if (alerts.length === 0) return null;

  return (
    <div className="space-y-3">
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border ${section.color.header} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 shadow-sm border border-white/60">
            <img
              src={section.imgSrc}
              alt={section.label}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-left">
            <h2 className="font-semibold text-gray-900 text-base">{section.label}</h2>
            <p className="text-xs text-gray-500">
              {alerts.length} notification{alerts.length !== 1 ? "s" : ""}
              {criticalCount > 0 && <span className="ml-2 text-red-600 font-medium">• {criticalCount} critical</span>}
              {warningCount > 0 && <span className="ml-1 text-yellow-600 font-medium">• {warningCount} warning{warningCount > 1 ? "s" : ""}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {alerts.map((a) => (
              <span
                key={a.id}
                className={`w-2 h-2 rounded-full ${a.status === "critical" ? "bg-red-500" :
                  a.status === "warning" ? "bg-yellow-400" : "bg-green-500"
                  }`}
              />
            ))}
          </div>
          {collapsed
            ? <ChevronDown className="w-5 h-5 text-gray-400" />
            : <ChevronUp className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {!collapsed && (
        <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
          {alerts.map((alert) => (
            <AlertCard key={alert.id} alert={alert} onDismiss={onDismiss} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export function Alerts() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sectionsWithAlerts, setSectionsWithAlerts] = useState<AlertSection[]>([]);
  const [restoredCount, setRestoredCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchAlerts();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'Alert' },
        () => {
          // Re-fetch when any alert is inserted, updated, or deleted
          fetchAlerts(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  async function fetchAlerts(silent = false) {
    if (!silent) setLoading(true);

    const [
      farmData,
      { data: allSensors },
      { data: allAlerts }
    ] = await Promise.all([
      getOrCreateDefaultFarm(user!.uid),
      supabase.from("Sensor").select("*"),
      supabase.from("Alert")
        .select("*, sensor:Sensor(*)")
        .neq("status", "RESOLVED")
        .order("createdAt", { ascending: false })
    ]);

    if (!farmData || !allSensors || !allAlerts) {
      setLoading(false);
      return;
    }

    const zoneIds = farmData.zones.map((z: any) => z.id);
    const validSensorIds = new Set(allSensors.filter((s: any) => zoneIds.includes(s.zoneId)).map((s: any) => s.id));

    const relevantAlerts = allAlerts.filter((a: any) => validSensorIds.has(a.sensorId));

    processAlerts(relevantAlerts as any[]);
    setLoading(false);
  }

  function processAlerts(dbAlerts: any[]) {
    // Blueprint for sections
    const initialSections: AlertSection[] = [
      {
        key: "soil", label: "Soil Moisture", sectionIcon: Droplets, imgSrc: SECTION_ICONS.soil,
        color: { header: "bg-blue-50 border-blue-200", iconBg: "bg-blue-100", iconFg: "text-blue-600", dot: "bg-blue-500" },
        alerts: []
      },
      {
        key: "temperature", label: "Temperature Alerts", sectionIcon: Thermometer, imgSrc: SECTION_ICONS.temperature,
        color: { header: "bg-red-50 border-red-200", iconBg: "bg-red-100", iconFg: "text-red-600", dot: "bg-red-500" },
        alerts: []
      },
      {
        key: "weather", label: "Weather Alerts", sectionIcon: Cloud, imgSrc: SECTION_ICONS.weather,
        color: { header: "bg-sky-50 border-sky-200", iconBg: "bg-sky-100", iconFg: "text-sky-600", dot: "bg-sky-500" },
        alerts: []
      },
      {
        key: "general", label: "General Notifications", sectionIcon: Bell, imgSrc: SECTION_ICONS.general,
        color: { header: "bg-gray-50 border-gray-200", iconBg: "bg-gray-100", iconFg: "text-gray-600", dot: "bg-gray-500" },
        alerts: []
      }
    ];

    dbAlerts.forEach(a => {
      const type = a.type === "CRITICAL" ? "critical" : a.type === "WARNING" ? "warning" : "normal";

      let sectionKey = "general";
      let icon = AlertCircle;

      if (a.sensor?.type === "SOIL_MOISTURE" || a.sensor?.type === "RAINFALL") {
        sectionKey = "soil"; icon = Droplets;
      } else if (a.sensor?.type === "TEMPERATURE") {
        sectionKey = "temperature"; icon = Thermometer;
      } else if (a.sensor?.type === "HUMIDITY" || a.sensor?.type === "WIND_SPEED") {
        sectionKey = "weather"; icon = Cloud;
      }

      const localAlert: LocalAlert = {
        id: a.id,
        title: `${a.type} - ${a.sensor?.name || "System"}`,
        message: a.message,
        status: type as LocalAlertStatus,
        icon: icon,
        time: new Date(a.createdAt).toLocaleString(),
        dbStatus: a.status
      };

      const section = initialSections.find(s => s.key === sectionKey);
      if (section) section.alerts.push(localAlert);
    });

    setSectionsWithAlerts(initialSections);
  }

  async function handleDismiss(id: string) {
    // Optimistic update
    setSectionsWithAlerts(prev => prev.map(section => ({
      ...section,
      alerts: section.alerts.filter(a => a.id !== id)
    })));

    setRestoredCount(c => c + 1);

    const { error } = await supabase
      .from("Alert")
      .update({ status: "RESOLVED" })
      .eq("id", id);

    if (error) console.error("Error dismissing alert:", error);
  }

  async function handleRestore() {
    setRestoredCount(0);
    // Real app would fetch resolved, but here we just re-fetch active ones or undo
    // For simplicity, we just trigger a refetch of all active if we want to restore some mock state
    fetchAlerts();
  }

  const allAlerts = sectionsWithAlerts.flatMap((s) => s.alerts);
  const criticalCount = allAlerts.filter((a) => a.status === "critical").length;
  const warningCount = allAlerts.filter((a) => a.status === "warning").length;
  const normalCount = allAlerts.filter((a) => a.status === "normal").length;

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Alerts & Recommendations</h1>
          <p className="text-gray-600 mt-1">Notifications are grouped by category for quick monitoring.</p>
        </div>
        {restoredCount > 0 && (
          <button
            onClick={handleRestore}
            className="text-sm text-primary underline underline-offset-2 hover:opacity-70"
          >
            Refresh Alerts
          </button>
        )}
      </div>

      {/* ── Summary Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-red-700 font-medium">Critical</p>
              <p className="text-3xl font-bold text-red-900">{criticalCount}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700 font-medium">Warnings</p>
              <p className="text-3xl font-bold text-yellow-900">{warningCount}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Normal / Info</p>
              <p className="text-3xl font-bold text-green-900">{normalCount}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Sectioned Alerts ── */}
      <div className="space-y-6">
        {allAlerts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">All clear! No active alerts right now.</p>
            </CardContent>
          </Card>
        ) : (
          sectionsWithAlerts.map((section) => (
            <AlertSectionGroup
              key={section.key}
              section={section}
              alerts={section.alerts}
              onDismiss={handleDismiss}
            />
          ))
        )}
      </div>
    </div>
  );
}
