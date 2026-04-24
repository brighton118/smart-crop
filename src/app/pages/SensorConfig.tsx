import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../components/AuthProvider";
import { supabase, DbSensor, DbZone, SensorType, SensorStatus } from "../../lib/supabase";
import { getOrCreateDefaultFarm } from "../../lib/farmUtils";
import {
  Wifi,
  WifiOff,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  RefreshCw,
  Activity,
  Thermometer,
  Droplets,
  Wind,
  Sun,
  Zap,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Radio,
  Loader2,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SENSOR_META: Record<string, { icon: React.ElementType; color: string; label: string; defaultUnit: string; min: number; max: number }> = {
  SOIL_MOISTURE: { icon: Droplets,    color: "text-blue-600",   label: "Soil Moisture", defaultUnit: "%",    min: 0,  max: 100 },
  TEMPERATURE:   { icon: Thermometer, color: "text-orange-500", label: "Temperature",   defaultUnit: "°C",   min: -10, max: 60 },
  HUMIDITY:      { icon: Wind,        color: "text-sky-500",    label: "Humidity",      defaultUnit: "%",    min: 0,  max: 100 },
  LIGHT:         { icon: Sun,         color: "text-yellow-500", label: "Light",         defaultUnit: "lux",  min: 0,  max: 100000 },
  WIND_SPEED:    { icon: Activity,    color: "text-teal-500",   label: "Wind Speed",    defaultUnit: "km/h", min: 0,  max: 120 },
  RAINFALL:      { icon: Zap,         color: "text-indigo-500", label: "Rainfall",      defaultUnit: "mm",   min: 0,  max: 500 },
};

function genId() {
  return "DEV-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function randomBetween(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

// Visual simulation state
interface VisualSensor extends DbSensor {
  lastValue: number;
}

// ─── Empty form state ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: "",
  type: "SOIL_MOISTURE" as SensorType,
  deviceId: "",
  samplingRate: 10,
  minThreshold: 20,
  maxThreshold: 80,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SensorConfig() {
  const { user } = useAuth();
  const [sensors, setSensors] = useState<VisualSensor[]>([]);
  const [zone, setZone] = useState<DbZone | null>(null);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [liveLog, setLiveLog] = useState<{ id: string; sensorName: string; value: number; unit: string; time: string; status: "ok" | "warn" }[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const logRef = useRef<HTMLDivElement>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize DB Data
  useEffect(() => {
    if (!user) return;
    async function loadData() {
      const data = await getOrCreateDefaultFarm(user!.id);
      if (data) {
        setZone(data.zone);
        await fetchSensors(data.zone.id);
      }
      setLoading(false);
    }
    loadData();
  }, [user]);

  async function fetchSensors(zoneId: string) {
    const { data, error } = await supabase.from("Sensor").select("*").eq("zoneId", zoneId);
    if (error) {
      console.error("Error fetching sensors:", error);
      return;
    }
    
    // Attach a random initial simulated value to each
    const visualSensors = (data as DbSensor[]).map(s => {
      const meta = SENSOR_META[s.type];
      return {
        ...s,
        lastValue: randomBetween(s.minThreshold, s.maxThreshold)
      };
    });
    setSensors(visualSensors);
  }

  // Real-time visual simulation tick (frontend only)
  useEffect(() => {
    if (!isStreaming) {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      setSensors((prev) =>
        prev.map((s) => {
          if (!s.enabled || s.status === "OFFLINE") return s;
          const { min, max } = SENSOR_META[s.type];
          const spread = (max - min) * 0.08;
          let next = s.lastValue + randomBetween(-spread, spread);
          next = parseFloat(Math.min(max, Math.max(min, next)).toFixed(1));
          const isWarn = next < s.minThreshold || next > s.maxThreshold;
          
          return {
            ...s,
            lastValue: next,
            status: isWarn ? "WARNING" : "ONLINE",
            lastSeen: new Date().toISOString(),
          };
        })
      );
    }, 2500);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isStreaming]);

  // Build live log entries whenever sensors update
  useEffect(() => {
    if (!isStreaming) return;
    setSensors((current) => {
      const entry = current
        .filter((s) => s.enabled && s.status !== "OFFLINE")
        .slice(0, 1)
        .map((s) => ({
          id: Math.random().toString(36).slice(2),
          sensorName: s.name,
          value: s.lastValue,
          unit: s.unit,
          time: new Date().toLocaleTimeString(),
          status: (s.status === "WARNING" ? "warn" : "ok") as "ok" | "warn",
        }));
      if (entry.length) {
        setLiveLog((prev) => [entry[0], ...prev].slice(0, 40));
      }
      return current;
    });
  }, [sensors.map((s) => s.lastValue).join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll log
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [liveLog]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function handleAddSensor() {
    if (!zone) return;
    setActionLoading(true);
    const meta = SENSOR_META[form.type];
    
    const { data, error } = await supabase.from("Sensor").insert([{
      name: form.name || `${meta.label} Sensor`,
      type: form.type,
      zoneId: zone.id,
      deviceId: form.deviceId || genId(),
      samplingRate: form.samplingRate,
      minThreshold: form.minThreshold,
      maxThreshold: form.maxThreshold,
      enabled: true,
      status: "ONLINE",
      unit: meta.defaultUnit
    }]).select().single();

    if (error) {
      console.error("Error adding sensor:", error);
    } else {
      const newSensor = data as DbSensor;
      setSensors((prev) => [...prev, { ...newSensor, lastValue: randomBetween(newSensor.minThreshold, newSensor.maxThreshold) }]);
      setShowAddForm(false);
      setForm({ ...EMPTY_FORM });
    }
    setActionLoading(false);
  }

  async function handleUpdateSensor() {
    if (!editingId) return;
    setActionLoading(true);
    
    const meta = SENSOR_META[form.type];
    const updates = {
      name: form.name,
      type: form.type,
      deviceId: form.deviceId,
      samplingRate: form.samplingRate,
      minThreshold: form.minThreshold,
      maxThreshold: form.maxThreshold,
      unit: meta.defaultUnit
    };

    const { error } = await supabase.from("Sensor").update(updates).eq("id", editingId);

    if (error) {
      console.error("Error updating sensor:", error);
    } else {
      setSensors((prev) =>
        prev.map((s) => s.id === editingId ? { ...s, ...updates } : s)
      );
      setEditingId(null);
      setShowAddForm(false);
    }
    setActionLoading(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("Sensor").delete().eq("id", id);
    if (error) {
      console.error("Error deleting sensor:", error);
    } else {
      setSensors((prev) => prev.filter((s) => s.id !== id));
    }
  }

  async function handleToggle(id: string, currentEnabled: boolean) {
    const newEnabled = !currentEnabled;
    const newStatus = newEnabled ? "ONLINE" : "OFFLINE";

    // Optimistic update
    setSensors((prev) =>
      prev.map((s) => s.id === id ? { ...s, enabled: newEnabled, status: newStatus } : s)
    );

    const { error } = await supabase.from("Sensor").update({ 
      enabled: newEnabled, 
      status: newStatus 
    }).eq("id", id);

    if (error) {
      console.error("Error toggling sensor:", error);
      // Revert on error
      setSensors((prev) =>
        prev.map((s) => s.id === id ? { ...s, enabled: currentEnabled, status: currentEnabled ? "ONLINE" : "OFFLINE" } : s)
      );
    }
  }

  function startEdit(sensor: VisualSensor) {
    setEditingId(sensor.id);
    setForm({
      name: sensor.name,
      type: sensor.type,
      deviceId: sensor.deviceId,
      samplingRate: sensor.samplingRate,
      minThreshold: sensor.minThreshold,
      maxThreshold: sensor.maxThreshold,
    });
    setShowAddForm(true);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const online  = sensors.filter((s) => s.status === "ONLINE").length;
  const warning = sensors.filter((s) => s.status === "WARNING").length;
  const offline = sensors.filter((s) => s.status === "OFFLINE").length;

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Sensor Configuration</h1>
          <p className="text-gray-600 mt-1">Register, configure and monitor your IoT sensors for real-time updates.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsStreaming((v) => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isStreaming
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isStreaming ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {isStreaming ? "Live Streaming" : "Paused"}
          </button>
          <Button
            onClick={() => { setShowAddForm(true); setEditingId(null); setForm({ ...EMPTY_FORM }); }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Sensor
          </Button>
        </div>
      </div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Sensors", value: sensors.length, icon: Radio,        color: "bg-primary/10 text-primary" },
          { label: "Online",        value: online,          icon: CheckCircle2, color: "bg-green-50 text-green-600" },
          { label: "Warnings",      value: warning,         icon: AlertCircle,  color: "bg-yellow-50 text-yellow-600" },
          { label: "Offline",       value: offline,         icon: WifiOff,      color: "bg-red-50 text-red-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Add / Form Panel ── */}
      {(showAddForm || editingId) && (
        <Card className="border-2 border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              {editingId ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingId ? "Edit Sensor" : "Register New Sensor"}
            </CardTitle>
            <CardDescription>
              {editingId ? "Update sensor configuration and thresholds." : "Connect a new IoT sensor to the system."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sensorName">Sensor Name</Label>
                <Input
                  id="sensorName"
                  placeholder="e.g. North Field Moisture"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sensorType">Sensor Type</Label>
                <select
                  id="sensorType"
                  className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as SensorType })}
                >
                  {(Object.keys(SENSOR_META) as SensorType[]).map((t) => (
                    <option key={t} value={t}>{SENSOR_META[t].label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sensorZone">Farm Zone</Label>
                <Input
                  id="sensorZone"
                  value={zone?.name || ""}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deviceId">Device ID</Label>
                <Input
                  id="deviceId"
                  placeholder="e.g. DEV-007"
                  value={form.deviceId}
                  onChange={(e) => setForm({ ...form, deviceId: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="samplingRate">Sampling Rate (seconds)</Label>
                <Input
                  id="samplingRate"
                  type="number"
                  min={1}
                  value={form.samplingRate}
                  onChange={(e) => setForm({ ...form, samplingRate: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Alert Thresholds</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={form.minThreshold}
                    onChange={(e) => setForm({ ...form, minThreshold: Number(e.target.value) })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={form.maxThreshold}
                    onChange={(e) => setForm({ ...form, maxThreshold: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <Button
                variant="outline"
                onClick={() => { setShowAddForm(false); setEditingId(null); }}
                disabled={actionLoading}
              >
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button onClick={editingId ? handleUpdateSensor : handleAddSensor} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {editingId ? "Save Changes" : "Register Sensor"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Main Grid: sensor list + live log ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Sensor Cards */}
        <div className="xl:col-span-2 space-y-4">
          {sensors.map((sensor) => {
            const meta = SENSOR_META[sensor.type];
            const Icon = meta?.icon || Radio;
            const isEditing = editingId === sensor.id;
            const pct = (() => {
              if(!meta) return 0;
              const { min, max } = meta;
              return Math.round(((sensor.lastValue - min) / (max - min)) * 100);
            })();
            const barColor =
              sensor.status === "WARNING" ? "bg-yellow-400" :
              sensor.status === "OFFLINE" ? "bg-gray-300" : "bg-green-500";

            return (
              <Card
                key={sensor.id}
                className={`transition-all border-l-4 ${
                  sensor.status === "ONLINE"  ? "border-l-green-500" :
                  sensor.status === "WARNING" ? "border-l-yellow-400" :
                                                "border-l-gray-300"
                } ${isEditing ? "ring-2 ring-primary" : ""}`}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Icon + Value */}
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      sensor.status === "OFFLINE" ? "bg-gray-100" : "bg-green-50"
                    }`}>
                      <Icon className={`w-7 h-7 ${sensor.status === "OFFLINE" ? "text-gray-400" : meta?.color || "text-gray-500"}`} />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">{sensor.name}</h3>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {zone?.name || "Unknown Zone"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={sensor.status === "ONLINE" ? "default" : sensor.status === "WARNING" ? "secondary" : "outline"}
                            className={`text-xs ${
                              sensor.status === "ONLINE"  ? "bg-green-100 text-green-700 border-green-200" :
                              sensor.status === "WARNING" ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                                            "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {sensor.status === "ONLINE"  ? <Wifi    className="w-3 h-3 mr-1" /> :
                             sensor.status === "WARNING" ? <AlertCircle className="w-3 h-3 mr-1" /> :
                                                           <WifiOff className="w-3 h-3 mr-1" />}
                            {sensor.status.charAt(0).toUpperCase() + sensor.status.slice(1).toLowerCase()}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Current: <span className={`font-semibold ${meta?.color || ""}`}>{sensor.lastValue} {sensor.unit}</span></span>
                          <span>Threshold: {sensor.minThreshold}–{sensor.maxThreshold} {sensor.unit}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>

                      {/* Meta row */}
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Every {sensor.samplingRate}s</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(sensor.lastSeen).toLocaleTimeString()}</span>
                        <span className="font-mono">{sensor.deviceId}</span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex sm:flex-col items-center gap-2 flex-shrink-0">
                      <Switch
                        checked={sensor.enabled}
                        onCheckedChange={() => handleToggle(sensor.id, sensor.enabled)}
                        aria-label="Toggle sensor"
                      />
                      <button
                        onClick={() => startEdit(sensor)}
                        className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                        title="Edit sensor"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sensor.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete sensor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {sensors.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <Radio className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No sensors configured yet.</p>
                <p className="text-sm text-gray-400 mt-1">Click "Add Sensor" to register your first IoT device.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Live Feed */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-green-600" />
                  Live Data Feed
                </span>
                {isStreaming && (
                  <span className="text-xs font-normal text-green-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Streaming
                  </span>
                )}
              </CardTitle>
              <CardDescription className="text-xs">Real-time sensor readings</CardDescription>
            </CardHeader>
            <Separator />
            <CardContent className="p-0">
              <div
                ref={logRef}
                className="h-96 overflow-y-auto space-y-0 divide-y divide-gray-50"
              >
                {liveLog.length === 0 && (
                  <p className="text-center text-xs text-gray-400 py-8">Waiting for data…</p>
                )}
                {liveLog.map((entry) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between px-4 py-2.5 text-xs hover:bg-gray-50 transition-colors ${
                      entry.status === "warn" ? "bg-yellow-50/60" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {entry.status === "warn"
                        ? <AlertCircle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                        : <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />}
                      <span className="truncate text-gray-700">{entry.sensorName}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className={`font-semibold ${entry.status === "warn" ? "text-yellow-600" : "text-gray-900"}`}>
                        {entry.value} {entry.unit}
                      </span>
                      <span className="text-gray-400">{entry.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Connection Protocol card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Connection Protocols</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Supabase Realtime",status: "Connected",    color: "text-green-600", dot: "bg-green-500" },
                { name: "MQTT Broker",      status: "Connected",    color: "text-green-600", dot: "bg-green-500" },
                { name: "LoRaWAN Gateway",  status: "Connected",    color: "text-green-600", dot: "bg-green-500" },
                { name: "REST API Bridge",  status: "Idle",         color: "text-yellow-600", dot: "bg-yellow-400" },
              ].map(({ name, status, color, dot }) => (
                <div key={name} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{name}</span>
                  <span className={`flex items-center gap-1.5 font-medium ${color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                    {status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
