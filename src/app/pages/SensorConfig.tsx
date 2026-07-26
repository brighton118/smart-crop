import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../components/AuthProvider";
import { supabase, DbZone, DbFan, DbCooler, DbEnvironmentalThreshold } from "../../lib/supabase";
import { getOrCreateDefaultFarm } from "../../lib/farmUtils";
import { toast } from "sonner";
import {
  WifiOff,
  Plus,
  Trash2,
  Save,
  X,
  Activity,
  Thermometer,
  Droplets,
  Wind,
  CheckCircle2,
  AlertCircle,
  Radio,
  Loader2,
  Snowflake,
  Settings2,
  History,
  Fan,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function genId() {
  return "ESP32-" + Math.random().toString(36).substring(2, 6).toUpperCase();
}

import { useAutomation } from "../../lib/simulation/AutomationEngine";

// ─── Component ────────────────────────────────────────────────────────────────

export function SensorConfig() {
  const { user } = useAuth();

  // Global Automation Context
  const { nodes, chartData, isStreaming, setIsStreaming } = useAutomation();

  const eventLogRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [zones, setZones] = useState<DbZone[]>([]);
  const [fans, setFans] = useState<DbFan[]>([]);
  const [coolers, setCoolers] = useState<DbCooler[]>([]);
  const [thresholds, setThresholds] = useState<Record<string, DbEnvironmentalThreshold>>({});
  const [devices, setDevices] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  const EMPTY_FORM = { name: "", zoneId: "", deviceId: "", esp32Id: "", gpioPin: 4 };
  const [form, setForm] = useState(EMPTY_FORM);
  const [showAddForm, setShowAddForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [editingThresholdZone, setEditingThresholdZone] = useState<string | null>(null);
  const [thresholdForm, setThresholdForm] = useState<DbEnvironmentalThreshold | null>(null);

  // Initialize DB Data
  useEffect(() => {
    if (!user) return;
    async function loadData() {
      const data = await getOrCreateDefaultFarm(user!.id);
      if (data) {
        setZones(data.zones);
        setForm(prev => ({ ...prev, zoneId: data.zone.id }));
        await fetchEquipment(data.zones.map(z => z.id));
        await fetchThresholds(data.zones.map(z => z.id));

        const { data: dData } = await supabase.from("Device").select("*");
        if (dData) setDevices(dData);

        const { data: eData } = await supabase
          .from("EquipmentEvent")
          .select(`*, Fan(id, name, zoneId), Cooler(id, name, zoneId)`)
          .order("timestamp", { ascending: false })
          .limit(50);
        if (eData) setEvents(eData);
      }
      setLoading(false);
    }
    loadData();

    // Event listener for updates
    const sub = supabase.channel('sensor_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'EquipmentEvent' }, async () => {
        const { data: eData } = await supabase
          .from("EquipmentEvent")
          .select(`*, Fan(id, name, zoneId), Cooler(id, name, zoneId)`)
          .order("timestamp", { ascending: false })
          .limit(50);
        if (eData) setEvents(eData);
      }).subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [user]);

  async function fetchEquipment(zoneIds: string[]) {
    // In a real scenario we'd do a Join or multiple calls. For now we assume they exist or we mock them.
    // If not in DB yet (due to RLS or fresh migration), we can fallback to state.
    const { data: fData } = await supabase.from("Fan").select("*").in("zoneId", zoneIds);
    if (fData) setFans(fData as DbFan[]);

    const { data: cData } = await supabase.from("Cooler").select("*").in("zoneId", zoneIds);
    if (cData) setCoolers(cData as DbCooler[]);
  }

  async function fetchThresholds(zoneIds: string[]) {
    const { data } = await supabase.from("EnvironmentalThreshold").select("*").in("zoneId", zoneIds);
    if (data) {
      const tMap: Record<string, DbEnvironmentalThreshold> = {};
      data.forEach((t: DbEnvironmentalThreshold) => tMap[t.zoneId] = t);
      setThresholds(tMap);
    }
  }

  // ─── Control Logic (Simulated "Backend") ──────────────────────────────────────

  // Helper mutable functions for simulation
  async function triggerEvent(equipmentId: string | null, type: 'fan' | 'cooler' | 'alert', newState: string, reason: string) {
    const ev = {
      fanId: type === 'fan' ? equipmentId : null,
      coolerId: type === 'cooler' ? equipmentId : null,
      previousState: newState === 'ON' ? 'OFF' : 'ON',
      newState,
      triggerReason: reason,
    };

    // Write event to backend so Equipment page sees it!
    await supabase.from('EquipmentEvent').insert(ev);

    // Refresh UI list
    const { data: eData } = await supabase
      .from("EquipmentEvent")
      .select(`*, Fan(id, name, zoneId), Cooler(id, name, zoneId)`)
      .order("timestamp", { ascending: false })
      .limit(50);
    if (eData) setEvents(eData);
  }



  async function handleToggleMode(equipmentId: string, type: 'fan' | 'cooler', currentMode: 'MANUAL' | 'AUTOMATIC') {
    const newMode = currentMode === 'MANUAL' ? 'AUTOMATIC' : 'MANUAL';

    // We update local state instantly for UI
    if (type === 'fan') {
      setFans(prev => prev.map(f => f.id === equipmentId ? { ...f, mode: newMode } : f));
      await supabase.from("Fan").update({ mode: newMode }).eq("id", equipmentId);
    } else {
      setCoolers(prev => prev.map(c => c.id === equipmentId ? { ...c, mode: newMode } : c));
      await supabase.from("Cooler").update({ mode: newMode }).eq("id", equipmentId);
    }
  }

  async function handleToggleStatus(equipmentId: string, type: 'fan' | 'cooler', currentStatus: 'ON' | 'OFF') {
    const newStatus = currentStatus === 'ON' ? 'OFF' : 'ON';

    if (type === 'fan') {
      setFans(prev => prev.map(f => f.id === equipmentId ? { ...f, status: newStatus } : f));
      await supabase.from("Fan").update({ status: newStatus }).eq("id", equipmentId);
      triggerEvent(equipmentId, 'fan', newStatus, 'Manual override activated by operator.');
    } else {
      setCoolers(prev => prev.map(c => c.id === equipmentId ? { ...c, status: newStatus } : c));
      await supabase.from("Cooler").update({ status: newStatus }).eq("id", equipmentId);
      triggerEvent(equipmentId, 'cooler', newStatus, 'Manual override activated by operator.');
    }
  }


  // ── Node CRUD ──────────────────────────────────────────────────────────────────

  async function handleAddNode() {
    if (!form.zoneId) {
      toast.error("Please select a valid Drying Room.");
      return;
    }
    setActionLoading(true);

    const { error } = await supabase.from("Sensor").insert([{
      id: crypto.randomUUID(),
      name: form.name || "ESP32 Node",
      type: "TEMPERATURE", // Legacy field, we can just use generic if we didn't migrate it out 
      zoneId: form.zoneId,
      deviceId: form.deviceId || genId(),
      esp32Id: form.esp32Id || null,
      gpioPin: form.gpioPin,
      samplingRate: 10,
      minThreshold: 0,
      maxThreshold: 100,
      enabled: true,
      status: "ONLINE",
      unit: "",
      updatedAt: new Date().toISOString()
    }]).select().single();

    if (error) {
      console.error("Error adding node:", error);
      toast.error(`Failed to add node: ${error.message}`);
    } else {
      setShowAddForm(false);
      setForm({ ...EMPTY_FORM });
      toast.success(`${form.name || 'Node'} registered successfully!`);
    }
    setActionLoading(false);
  }

  async function handleDeleteNode(id: string) {
    const { error } = await supabase.from("Sensor").delete().eq("id", id);
    if (error) {
      toast.error(`Failed to delete node: ${error.message}`);
    } else {
      toast.success("ESP32 Sensor removed from database.");
    }
  }

  async function handleSaveThreshold() {
    if (!thresholdForm) return;
    setActionLoading(true);
    const { data, error } = await supabase.from('EnvironmentalThreshold').upsert({
      ...thresholdForm,
      id: thresholdForm.id || crypto.randomUUID(),
      updatedAt: new Date().toISOString()
    }, { onConflict: 'zoneId' }).select().single();

    if (error) {
      toast.error("Failed to save thresholds: " + error.message);
    } else {
      setThresholds(prev => ({ ...prev, [thresholdForm.zoneId]: data as DbEnvironmentalThreshold }));
      setEditingThresholdZone(null);
      toast.success("Drying thresholds saved successfully.");
      triggerEvent(null, 'alert', 'UPDATED', `Environmental thresholds updated by operator for ${zones.find(z => z.id === thresholdForm.zoneId)?.name}`);
    }
    setActionLoading(false);
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalNodes = nodes.length;
  const onlineNodes = nodes.filter((n) => n.status === "ONLINE").length;
  const offlineNodes = nodes.filter((n) => n.status === "OFFLINE").length;
  const warningNodes = nodes.filter((n) => n.status === "WARNING").length;

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 border-l-4 border-green-600 pl-3">Drying Environment Monitoring</h1>
          <p className="text-gray-600 mt-2">Monitor cannabis drying rooms, track moisture, and control environmental equipment.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsStreaming(!isStreaming)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isStreaming
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${isStreaming ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
            {isStreaming ? "Live Feed Active" : "Feed Paused"}
          </button>
          <Button
            onClick={() => { setShowAddForm(!showAddForm); setForm({ ...EMPTY_FORM }); }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Connect ESP32 Node
          </Button>
        </div>
      </div>

      {/* ── Top Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm font-semibold text-gray-500 mb-1">Total Sensors</p><div className="flex items-center gap-2"><Radio className="w-5 h-5 text-gray-400" /><span className="text-2xl font-bold">{totalNodes}</span></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm font-semibold text-gray-500 mb-1">Online</p><div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500" /><span className="text-2xl font-bold">{onlineNodes}</span></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm font-semibold text-gray-500 mb-1">Offline</p><div className="flex items-center gap-2"><WifiOff className="w-5 h-5 text-gray-400" /><span className="text-2xl font-bold">{offlineNodes}</span></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm font-semibold text-gray-500 mb-1">Drying Rooms</p><div className="flex items-center gap-2"><Settings2 className="w-5 h-5 text-blue-500" /><span className="text-2xl font-bold">{zones.length}</span></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm font-semibold text-gray-500 mb-1">Warnings</p><div className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-yellow-500" /><span className="text-2xl font-bold">{warningNodes}</span></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm font-semibold text-gray-500 mb-1">Critical Alerts</p><div className="flex items-center gap-2"><Activity className="w-5 h-5 text-red-500" /><span className="text-2xl font-bold">0</span></div></CardContent></Card>
      </div>

      {/* ── Add / Form Panel ── */}
      {showAddForm && (
        <Card className="border-2 border-green-600/30 bg-green-50/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Radio className="w-5 h-5 text-green-600" /> Register ESP32 Sensor Node
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sensorName">Device Name</Label>
                <Input id="sensorName" placeholder="e.g. Rack A Monitor" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sensorZone">Assigned Drying Room</Label>
                <select id="sensorZone" className="w-full px-3 py-2 border rounded-lg bg-white text-sm" value={form.zoneId} onChange={(e) => setForm({ ...form, zoneId: e.target.value })}>
                  <option value="" disabled>Select Room</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deviceId">Sensor Device ID / Serial</Label>
                <Input id="deviceId" placeholder="e.g. DHT22-001" value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="esp32Id">Map to ESP32 Device</Label>
                <select id="esp32Id" className="w-full px-3 py-2 border rounded-lg bg-white text-sm" value={form.esp32Id} onChange={(e) => setForm({ ...form, esp32Id: e.target.value })}>
                  <option value="">No Controller</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gpioPin">GPIO Pin</Label>
                <Input id="gpioPin" type="number" min="0" max="39" value={form.gpioPin} onChange={(e) => setForm({ ...form, gpioPin: parseInt(e.target.value) || 4 })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => { setShowAddForm(false); }} disabled={actionLoading}><X className="w-4 h-4 mr-2" /> Cancel</Button>
              <Button onClick={handleAddNode} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Connect Node
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Threshold Configuration Panel ── */}
      {editingThresholdZone && thresholdForm && (
        <Card className="border-2 border-green-600/30 bg-green-50/10 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-green-600" /> Configure Thresholds for {zones.find(z => z.id === editingThresholdZone)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <div className="space-y-3 bg-white p-4 rounded-lg border shadow-sm">
                <h4 className="font-bold flex items-center gap-2 text-orange-600"><Thermometer className="w-4 h-4" /> Temperature (°C)</h4>
                <div className="space-y-1.5"><Label>Minimum</Label><Input type="number" step="0.1" value={thresholdForm.tempMin} onChange={e => setThresholdForm({ ...thresholdForm, tempMin: parseFloat(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Target</Label><Input type="number" step="0.1" value={thresholdForm.tempTarget} onChange={e => setThresholdForm({ ...thresholdForm, tempTarget: parseFloat(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Maximum</Label><Input type="number" step="0.1" value={thresholdForm.tempMax} onChange={e => setThresholdForm({ ...thresholdForm, tempMax: parseFloat(e.target.value) })} /></div>
              </div>

              <div className="space-y-3 bg-white p-4 rounded-lg border shadow-sm">
                <h4 className="font-bold flex items-center gap-2 text-blue-600"><Wind className="w-4 h-4" /> Room Humidity (%)</h4>
                <div className="space-y-1.5"><Label>Minimum</Label><Input type="number" step="0.1" value={thresholdForm.humidityMin} onChange={e => setThresholdForm({ ...thresholdForm, humidityMin: parseFloat(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Target</Label><Input type="number" step="0.1" value={thresholdForm.humidityTarget} onChange={e => setThresholdForm({ ...thresholdForm, humidityTarget: parseFloat(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Maximum</Label><Input type="number" step="0.1" value={thresholdForm.humidityMax} onChange={e => setThresholdForm({ ...thresholdForm, humidityMax: parseFloat(e.target.value) })} /></div>
              </div>

              <div className="space-y-3 bg-white p-4 rounded-lg border shadow-sm">
                <h4 className="font-bold flex items-center gap-2 text-teal-600"><Droplets className="w-4 h-4" /> Cannabis Moisture (%)</h4>
                <div className="space-y-1.5"><Label>Minimum</Label><Input type="number" step="0.1" value={thresholdForm.moistureMin} onChange={e => setThresholdForm({ ...thresholdForm, moistureMin: parseFloat(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Target</Label><Input type="number" step="0.1" value={thresholdForm.moistureTarget} onChange={e => setThresholdForm({ ...thresholdForm, moistureTarget: parseFloat(e.target.value) })} /></div>
                <div className="space-y-1.5"><Label>Maximum</Label><Input type="number" step="0.1" value={thresholdForm.moistureMax} onChange={e => setThresholdForm({ ...thresholdForm, moistureMax: parseFloat(e.target.value) })} /></div>
              </div>

            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setEditingThresholdZone(null)} disabled={actionLoading}><X className="w-4 h-4 mr-2" /> Cancel</Button>
              <Button onClick={handleSaveThreshold} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Thresholds
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Main Dashboard Layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT COLUMN: Sensor Nodes & Charts */}
        <div className="xl:col-span-2 space-y-6">

          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Radio className="w-5 h-5" /> ESP32 Sensor Nodes</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {nodes.map((node) => {
              const zone = zones.find(z => z.id === node.zoneId);
              const nodeThreshold = thresholds[node.zoneId]; // Use room thresholds

              const isTempWarn = nodeThreshold ? (node.currentTemp > nodeThreshold.tempMax || node.currentTemp < nodeThreshold.tempMin) : false;
              const isHumWarn = nodeThreshold ? (node.currentHum > nodeThreshold.humidityMax || node.currentHum < nodeThreshold.humidityMin) : false;
              const isMoistWarn = nodeThreshold ? (node.currentMoist > nodeThreshold.moistureMax || node.currentMoist < nodeThreshold.moistureMin) : false;

              return (
                <Card key={node.id} className="border-t-4 border-t-green-500 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-3">
                    <button onClick={() => handleDeleteNode(node.id)} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Radio className="w-5 h-5 text-green-700" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 leading-tight">{node.name}</h3>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{node.deviceId} • {zone?.name}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                      <div className={`p-2 rounded-lg border ${isTempWarn ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-transparent'}`}>
                        <div className="flex justify-center mb-1"><Thermometer className={`w-4 h-4 ${isTempWarn ? 'text-orange-500' : 'text-gray-400'}`} /></div>
                        <p className={`font-bold ${isTempWarn ? 'text-orange-700' : 'text-gray-800'}`}>{node.currentTemp}°C</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Temp</p>
                      </div>
                      <div className={`p-2 rounded-lg border ${isHumWarn ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-transparent'}`}>
                        <div className="flex justify-center mb-1"><Wind className={`w-4 h-4 ${isHumWarn ? 'text-blue-500' : 'text-gray-400'}`} /></div>
                        <p className={`font-bold ${isHumWarn ? 'text-blue-700' : 'text-gray-800'}`}>{node.currentHum}%</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Humidity</p>
                      </div>
                      <div className={`p-2 rounded-lg border ${isMoistWarn ? 'bg-teal-50 border-teal-200' : 'bg-gray-50 border-transparent'}`}>
                        <div className="flex justify-center mb-1"><Droplets className={`w-4 h-4 ${isMoistWarn ? 'text-teal-500' : 'text-gray-400'}`} /></div>
                        <p className={`font-bold ${isMoistWarn ? 'text-teal-700' : 'text-gray-800'}`}>{node.currentMoist}%</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Moisture</p>
                      </div>
                    </div>

                    {nodeThreshold && (
                      <div className="text-[10px] text-gray-400 border-t pt-2 flex justify-between">
                        <span>Target: {nodeThreshold.tempTarget}°C | {nodeThreshold.humidityTarget}%</span>
                        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-green-500" /> ONLINE</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            {nodes.length === 0 && (
              <div className="col-span-full p-8 text-center border-2 border-dashed rounded-xl border-gray-200">
                <p className="text-gray-500">No ESP32 nodes connected yet.</p>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Environmental Analytics Chart */}
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><History className="w-5 h-5" /> Real-Time Analytics</h2>
          <Card>
            <CardContent className="p-4 lg:p-6 pb-2">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                    />
                    <Line yAxisId="left" type="monotone" dataKey="temp" name="Temperature (°C)" stroke="#f97316" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="humidity" name="Humidity (%)" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                    <Line yAxisId="right" type="monotone" dataKey="moisture" name="Moisture (%)" stroke="#14b8a6" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4 text-xs font-medium">
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Temperature</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Humidity</span>
                <span className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-teal-500"></div> Cannabis Moisture</span>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT COLUMN: Equipment & Live Feed */}
        <div className="space-y-6">

          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><Settings2 className="w-5 h-5" /> Equipment Control</h2>
          <Card>
            <CardContent className="p-0 divide-y">
              {zones.length > 0 ? zones.map(z => {
                const zFans = fans.filter(f => f.zoneId === z.id);
                const zCoolers = coolers.filter(c => c.zoneId === z.id);
                // If there's no equipment, don't show the room (or show a placeholder)
                if (zFans.length === 0 && zCoolers.length === 0) return null;
                return (
                  <div key={z.id} className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-gray-500 tracking-wide uppercase">{z.name}</p>
                      <button onClick={() => {
                        setEditingThresholdZone(z.id);
                        setThresholdForm(thresholds[z.id] || { zoneId: z.id, tempMin: 18, tempTarget: 21, tempMax: 24, humidityMin: 50, humidityTarget: 55, humidityMax: 65, moistureMin: 10, moistureTarget: 12, moistureMax: 14 } as DbEnvironmentalThreshold);
                      }} className="text-xs flex items-center gap-1 text-green-600 hover:underline">
                        <Settings2 className="w-3 h-3" /> Config Limits
                      </button>
                    </div>

                    {zFans.map(f => (
                      <div key={f.id} className="flex flex-col gap-2 p-3 bg-gray-50 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Fan className={`w-4 h-4 ${f.status === 'ON' ? 'text-blue-600 animate-spin' : 'text-gray-400'}`} />
                            <span className="font-medium text-gray-800 text-sm">{f.name}</span>
                          </div>
                          <Badge variant="outline" className={f.mode === 'AUTOMATIC' ? "text-green-600 border-green-200 bg-green-50" : "text-gray-500"}>
                            {f.mode}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <button onClick={() => handleToggleMode(f.id, 'fan', f.mode)} className="text-[10px] underline text-gray-500 hover:text-black">
                            Switch Mode
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{f.status}</span>
                            <Switch checked={f.status === 'ON'} onCheckedChange={() => handleToggleStatus(f.id, 'fan', f.status)} disabled={f.mode === 'AUTOMATIC'} />
                          </div>
                        </div>
                      </div>
                    ))}

                    {zCoolers.map(c => (
                      <div key={c.id} className="flex flex-col gap-2 p-3 bg-gray-50 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Snowflake className={`w-4 h-4 ${c.status === 'ON' ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className="font-medium text-gray-800 text-sm">{c.name}</span>
                          </div>
                          <Badge variant="outline" className={c.mode === 'AUTOMATIC' ? "text-green-600 border-green-200 bg-green-50" : "text-gray-500"}>
                            {c.mode}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <button onClick={() => handleToggleMode(c.id, 'cooler', c.mode)} className="text-[10px] underline text-gray-500 hover:text-black">
                            Switch Mode
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{c.status}</span>
                            <Switch checked={c.status === 'ON'} onCheckedChange={() => handleToggleStatus(c.id, 'cooler', c.status)} disabled={c.mode === 'AUTOMATIC'} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }) : (
                <div className="p-8 text-center text-gray-400 text-sm">No equipment mapped to rooms.</div>
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col h-96 overflow-hidden border-2 border-gray-100">
            <CardHeader className="bg-gray-50 pb-3 border-b border-gray-100">
              <CardTitle className="text-sm flex items-center justify-between text-gray-700">
                <span className="flex items-center gap-2 uppercase tracking-wide font-bold">
                  <Activity className="w-4 h-4" /> Live Event Feed
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto" ref={eventLogRef}>
              {events.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">Waiting for system events...</div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {events.map((evt) => {
                    const isEquipAction = evt.fanId || evt.coolerId;
                    return (
                      <div key={evt.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isEquipAction ? (evt.newState === 'ON' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-800') : 'bg-yellow-100 text-yellow-800'
                            }`}>
                            {evt.fanId ? 'FAN ' + evt.newState : evt.coolerId ? 'COOLER ' + evt.newState : 'ALERT'}
                          </span>
                          <span className="text-[10px] text-gray-400 tracking-wider">
                            {new Date(evt.timestamp).toLocaleTimeString([], { hour12: false })}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-gray-800">{evt.triggerReason}</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
