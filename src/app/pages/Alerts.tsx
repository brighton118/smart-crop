import { useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Droplets,
  Bug,
  Cloud,
  Thermometer,
  Sprout,
  TrendingUp,
  X,
  ChevronDown,
  ChevronUp,
  Wind,
  Zap,
} from "lucide-react";

// Section icon images (generated custom icons)
const SECTION_ICONS = {
  soil:        "/icons/icon_soil_moisture.png",
  pest:        "/icons/icon_pest_warnings.png",
  weather:     "/icons/icon_weather_alerts.png",
  temperature: "/icons/icon_temperature_alerts.png",
  growth:      "/icons/icon_growth_yield.png",
} as const;

// ── Types ──────────────────────────────────────────────────────────────────

type AlertStatus = "critical" | "warning" | "normal";

interface Alert {
  id: string;
  title: string;
  message: string;
  status: AlertStatus;
  icon: React.ElementType;
  time: string;
  recommendation?: string;
}

interface AlertSection {
  key: string;
  label: string;
  sectionIcon: React.ElementType; // lucide fallback (unused on header)
  imgSrc: string;                 // custom section image icon
  color: {
    header: string;
    iconBg: string;
    iconFg: string;
    dot: string;
  };
  alerts: Alert[];
}

// ── Data ───────────────────────────────────────────────────────────────────

const SECTIONS: AlertSection[] = [
  {
    key: "soil",
    label: "Soil Moisture",
    sectionIcon: Droplets,
    imgSrc: SECTION_ICONS.soil,
    color: {
      header: "bg-blue-50 border-blue-200",
      iconBg:  "bg-blue-100",
      iconFg:  "text-blue-600",
      dot:     "bg-blue-500",
    },
    alerts: [
      {
        id: "soil-1",
        title: "Irrigation Needed – Field A",
        message: "Soil moisture level has dropped to 30% in Field A. Immediate irrigation is recommended.",
        status: "critical",
        icon: Droplets,
        time: "10 minutes ago",
        recommendation: "Start irrigation system for 2–3 hours to restore optimal moisture levels (45–50%).",
      },
      {
        id: "soil-2",
        title: "Moisture Declining – Field C",
        message: "Soil moisture in Field C is trending downward (42%). Approaching the lower threshold.",
        status: "warning",
        icon: Droplets,
        time: "45 minutes ago",
        recommendation: "Schedule irrigation within the next 4 hours to prevent stress on crops.",
      },
      {
        id: "soil-3",
        title: "Field B Moisture Optimal",
        message: "Field B is maintaining ideal soil moisture of 52%. No action required.",
        status: "normal",
        icon: Droplets,
        time: "1 hour ago",
      },
    ],
  },
  {
    key: "pest",
    label: "Pest Warnings",
    sectionIcon: Bug,
    imgSrc: SECTION_ICONS.pest,
    color: {
      header: "bg-orange-50 border-orange-200",
      iconBg:  "bg-orange-100",
      iconFg:  "text-orange-600",
      dot:     "bg-orange-500",
    },
    alerts: [
      {
        id: "pest-1",
        title: "Aphid Risk – High",
        message: "Current temperature (28°C) and humidity (65%) create favourable conditions for aphid infestation in the next 48 hours.",
        status: "warning",
        icon: Bug,
        time: "1 hour ago",
        recommendation: "Inspect crops for early signs of aphids. Consider applying organic neem-based spray as a preventive measure.",
      },
      {
        id: "pest-2",
        title: "Fungal Disease Risk",
        message: "Prolonged leaf wetness detected. Risk of fungal diseases (powdery mildew) elevated in greenhouse.",
        status: "warning",
        icon: Bug,
        time: "3 hours ago",
        recommendation: "Improve ventilation in the greenhouse. Apply copper-based fungicide as a precaution.",
      },
      {
        id: "pest-3",
        title: "No Pest Activity Detected",
        message: "Pest monitoring sensors report no abnormal activity across all zones.",
        status: "normal",
        icon: Bug,
        time: "6 hours ago",
      },
    ],
  },
  {
    key: "weather",
    label: "Weather Alerts",
    sectionIcon: Cloud,
    imgSrc: SECTION_ICONS.weather,
    color: {
      header: "bg-sky-50 border-sky-200",
      iconBg:  "bg-sky-100",
      iconFg:  "text-sky-600",
      dot:     "bg-sky-500",
    },
    alerts: [
      {
        id: "weather-1",
        title: "Heavy Rainfall Forecast",
        message: "Heavy rainfall expected in 24 hours. Precipitation: 25–35 mm.",
        status: "warning",
        icon: Cloud,
        time: "2 hours ago",
        recommendation: "Delay irrigation schedule. Ensure all drainage systems are clear of debris.",
      },
      {
        id: "weather-2",
        title: "Strong Wind Advisory",
        message: "Wind gusts up to 55 km/h forecast for tomorrow afternoon.",
        status: "warning",
        icon: Wind,
        time: "2 hours ago",
        recommendation: "Secure greenhouse frames, nets, and any loose equipment on the farm.",
      },
      {
        id: "weather-3",
        title: "Clear Weather – Next 3 Days",
        message: "No adverse weather expected for the next 72 hours. Ideal farming conditions.",
        status: "normal",
        icon: Cloud,
        time: "4 hours ago",
        recommendation: "Good window for pesticide application and field inspections.",
      },
    ],
  },
  {
    key: "temperature",
    label: "Temperature Alerts",
    sectionIcon: Thermometer,
    imgSrc: SECTION_ICONS.temperature,
    color: {
      header: "bg-red-50 border-red-200",
      iconBg:  "bg-red-100",
      iconFg:  "text-red-600",
      dot:     "bg-red-500",
    },
    alerts: [
      {
        id: "temp-1",
        title: "Extreme Heat Warning",
        message: "Maximum temperature expected tomorrow: 38°C. Crop stress risk is high for sensitive varieties.",
        status: "critical",
        icon: Thermometer,
        time: "3 hours ago",
        recommendation: "Increase irrigation frequency. Consider shade cloth over tomatoes and leafy greens. Avoid fieldwork during peak hours (11 AM–3 PM).",
      },
      {
        id: "temp-2",
        title: "Night Temperature Drop",
        message: "Overnight temperatures may fall to 10°C. Risk of cold stress for tropical crops.",
        status: "warning",
        icon: Thermometer,
        time: "5 hours ago",
        recommendation: "Cover sensitive seedlings. Consider using row covers or mulch to retain soil heat.",
      },
      {
        id: "temp-3",
        title: "Greenhouse Temperature Normal",
        message: "Greenhouse temperature steady at 24°C — within optimal range for all current crops.",
        status: "normal",
        icon: Thermometer,
        time: "30 minutes ago",
      },
    ],
  },
  {
    key: "growth",
    label: "Growth & Yield Updates",
    sectionIcon: Sprout,
    imgSrc: SECTION_ICONS.growth,
    color: {
      header: "bg-green-50 border-green-200",
      iconBg:  "bg-green-100",
      iconFg:  "text-green-600",
      dot:     "bg-green-500",
    },
    alerts: [
      {
        id: "growth-1",
        title: "Yield Prediction Updated",
        message: "AI model predicts a 12% increase in wheat yield compared to last season based on current growth trends.",
        status: "normal",
        icon: TrendingUp,
        time: "1 day ago",
        recommendation: "Current practices are highly effective. Maintain your irrigation and fertilisation schedule.",
      },
      {
        id: "growth-2",
        title: "Nutrient Deficiency Detected",
        message: "Leaf colour analysis indicates possible nitrogen deficiency in the north field.",
        status: "warning",
        icon: Zap,
        time: "8 hours ago",
        recommendation: "Apply nitrogen-rich fertiliser (e.g. urea) at recommended rates. Re-test soil in 7 days.",
      },
      {
        id: "growth-3",
        title: "Field B – Optimal Growth",
        message: "Field B is showing excellent growth parameters. All metrics within the ideal range.",
        status: "normal",
        icon: Sprout,
        time: "5 hours ago",
      },
    ],
  },
];

// ── Style helpers ─────────────────────────────────────────────────────────

function getAlertStyles(status: AlertStatus) {
  switch (status) {
    case "critical":
      return {
        card:    "bg-red-50 border-red-200",
        iconBg:  "bg-red-100",
        iconFg:  "text-red-600",
        badge:   "destructive" as const,
        label:   "Critical",
      };
    case "warning":
      return {
        card:    "bg-yellow-50 border-yellow-200",
        iconBg:  "bg-yellow-100",
        iconFg:  "text-yellow-600",
        badge:   "outline" as const,
        label:   "Warning",
      };
    case "normal":
      return {
        card:    "bg-green-50 border-green-200",
        iconBg:  "bg-green-100",
        iconFg:  "text-green-600",
        badge:   "secondary" as const,
        label:   "Normal",
      };
  }
}

function StatusIcon({ status }: { status: AlertStatus }) {
  if (status === "critical") return <AlertTriangle className="w-4 h-4" />;
  if (status === "warning")  return <AlertCircle   className="w-4 h-4" />;
  return <CheckCircle className="w-4 h-4" />;
}

// ── Alert Card ─────────────────────────────────────────────────────────────

function AlertCard({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  const styles = getAlertStyles(alert.status);
  const Icon = alert.icon;

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
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" className="text-xs h-8">Details</Button>
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

function AlertSection({
  section,
  alerts,
  onDismiss,
}: {
  section: AlertSection;
  alerts: Alert[];
  onDismiss: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const criticalCount = alerts.filter((a) => a.status === "critical").length;
  const warningCount  = alerts.filter((a) => a.status === "warning").length;

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border ${section.color.header} hover:opacity-90 transition-opacity`}
      >
        <div className="flex items-center gap-3">
          {/* Custom image icon */}
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
              {warningCount  > 0 && <span className="ml-1 text-yellow-600 font-medium">• {warningCount} warning{warningCount > 1 ? "s" : ""}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mini status dots */}
          <div className="flex gap-1">
            {alerts.map((a) => (
              <span
                key={a.id}
                className={`w-2 h-2 rounded-full ${
                  a.status === "critical" ? "bg-red-500" :
                  a.status === "warning"  ? "bg-yellow-400" : "bg-green-500"
                }`}
              />
            ))}
          </div>
          {collapsed
            ? <ChevronDown className="w-5 h-5 text-gray-400" />
            : <ChevronUp   className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {/* Alerts */}
      {!collapsed && (
        <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
          {alerts.length === 0 ? (
            <p className="text-sm text-gray-400 py-3 pl-2">All clear — no notifications in this category.</p>
          ) : (
            alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} onDismiss={onDismiss} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export function Alerts() {
  // Flatten all alerts with their section key to support per-alert dismissal
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  function handleDismiss(id: string) {
    setDismissedIds((prev) => new Set([...prev, id]));
  }

  // Per-section filtered alerts (excluding dismissed)
  const sectionsWithAlerts = SECTIONS.map((section) => ({
    ...section,
    alerts: section.alerts.filter((a) => !dismissedIds.has(a.id)),
  }));

  // Global counts
  const allAlerts   = sectionsWithAlerts.flatMap((s) => s.alerts);
  const criticalCount = allAlerts.filter((a) => a.status === "critical").length;
  const warningCount  = allAlerts.filter((a) => a.status === "warning").length;
  const normalCount   = allAlerts.filter((a) => a.status === "normal").length;

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Alerts & Recommendations</h1>
          <p className="text-gray-600 mt-1">Notifications are grouped by category for quick monitoring.</p>
        </div>
        {dismissedIds.size > 0 && (
          <button
            onClick={() => setDismissedIds(new Set())}
            className="text-sm text-primary underline underline-offset-2 hover:opacity-70"
          >
            Restore {dismissedIds.size} dismissed
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
              <p className="text-sm text-green-700 font-medium">All Good</p>
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
        {sectionsWithAlerts.map((section) => (
          <AlertSection
            key={section.key}
            section={section}
            alerts={section.alerts}
            onDismiss={handleDismiss}
          />
        ))}
      </div>
    </div>
  );
}
