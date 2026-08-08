import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Download, Loader2, Thermometer, Wind, Droplets,
  BarChart3
} from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import {
  supabase,
  DbSensor,
  DbSensorReading,
  DbZone,
  DbCropBatch,
  DbEnvironmentalThreshold
} from "../../lib/supabase";
import { getOrCreateDefaultFarm } from "../../lib/farmUtils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine
} from "recharts";

export function DataAnalytics() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  // Data lists
  const [zones, setZones] = useState<DbZone[]>([]);
  const [batches, setBatches] = useState<DbCropBatch[]>([]);
  const [sensors, setSensors] = useState<DbSensor[]>([]);
  const [thresholds, setThresholds] = useState<DbEnvironmentalThreshold[]>([]);
  const [readings, setReadings] = useState<DbSensorReading[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // Filter state
  const [selectedZone, setSelectedZone] = useState<string>("ALL");
  const [selectedBatch, setSelectedBatch] = useState<string>("ALL");
  const [selectedSensor, setSelectedSensor] = useState<string>("ALL");
  const [dateRangeMode, setDateRangeMode] = useState<"24h" | "7d" | "30d" | "custom">("24h");
  const [customSince, setCustomSince] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [paginationPage, setPaginationPage] = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (!user) return;
    loadBaseData();
  }, [user]);

  useEffect(() => {
    if (zones.length > 0) {
      loadAnalyticsData();
    }
  }, [zones, dateRangeMode, customSince, customTo]);

  async function loadBaseData() {
    setLoading(true);
    const farm = await getOrCreateDefaultFarm(user!.uid);
    if (!farm) return;

    const [
      { data: z },
      { data: cb },
      { data: sens },
      { data: thr }
    ] = await Promise.all([
      supabase.from("Zone").select("*") as any,
      supabase.from("CropBatch").select("*") as any,
      supabase.from("Sensor").select("*") as any,
      supabase.from("EnvironmentalThreshold").select("*") as any
    ]);

    if (z) setZones(z);
    if (cb) setBatches(cb);
    if (sens) setSensors(sens);
    if (thr) setThresholds(thr);
  }

  async function loadAnalyticsData() {
    setLoading(true);

    // Calculate time window
    let since = new Date();
    let to = new Date();
    if (dateRangeMode === "24h") since.setHours(since.getHours() - 24);
    if (dateRangeMode === "7d") since.setDate(since.getDate() - 7);
    if (dateRangeMode === "30d") since.setDate(since.getDate() - 30);
    if (dateRangeMode === "custom") {
      if (customSince) since = new Date(customSince);
      if (customTo) to = new Date(customTo);
    }

    // Fetch Readings
    const { data: reads } = await supabase
      .from("SensorReading")
      .select("*")
      .gte("timestamp", since.getTime())
      .lte("timestamp", to.getTime())
      .order("timestamp", { ascending: false });

    // Fetch Equipment Events
    const { data: evts } = await supabase
      .from("EquipmentEvent")
      .select(`*, Fan(id, name, zoneId), Cooler(id, name, zoneId)`)
      .gte("timestamp", since.toISOString())
      .lte("timestamp", to.toISOString())
      .order("timestamp", { ascending: false });

    if (reads) setReadings(reads);
    if (evts) setEvents(evts);

    setLoading(false);
  }

  // Memoized Filtering
  const filteredReadings = useMemo(() => {
    return readings.filter(r => {
      const s = sensors.find(sen => sen.id === r.sensorId);
      if (!s) return false;
      if (selectedZone !== "ALL" && s.zoneId !== selectedZone) return false;
      if (selectedSensor !== "ALL" && s.id !== selectedSensor) return false;
      // In a full implementation, batch would map to zone/time period. For now, we mock filtering for batches.
      return true;
    });
  }, [readings, sensors, selectedZone, selectedSensor, selectedBatch]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const equipSpace = e.Fan?.zoneId || e.Cooler?.zoneId;
      if (selectedZone !== "ALL" && equipSpace !== selectedZone) return false;
      if (searchQuery) {
        if (!e.triggerReason.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [events, selectedZone, searchQuery]);

  // Derived Stats
  const totalReadings = filteredReadings.length;
  const avgTemp = (filteredReadings.reduce((sum, r) => sum + (r.temperature || 0), 0) / (totalReadings || 1)).toFixed(1);
  const avgHum = (filteredReadings.reduce((sum, r) => sum + (r.humidity || 0), 0) / (totalReadings || 1)).toFixed(1);
  const avgMoisture = (filteredReadings.reduce((sum, r) => sum + (r.moisture || 0), 0) / (totalReadings || 1)).toFixed(1);
  const activeBatchesCount = batches.filter(b => b.status === "ACTIVE").length;

  // Chart Data Preparation (Aggregation logic simplified to hourly or raw limits for performance)
  const chartData = useMemo(() => {
    let arr = [...filteredReadings].reverse(); // Chronological
    if (arr.length > 500) { // Simple subsampling
      const step = Math.ceil(arr.length / 500);
      arr = arr.filter((_, i) => i % step === 0);
    }
    return arr.map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date(r.timestamp).toLocaleDateString(),
      fullTime: new Date(r.timestamp).toLocaleString(),
      Temp: r.temperature,
      Hum: r.humidity,
      Moisture: r.moisture
    }));
  }, [filteredReadings]);

  // Active Batch Widget
  const activeBatch = batches.find(b => b.status === "ACTIVE" && (selectedBatch === "ALL" || b.id === selectedBatch));

  // Pagination for readings table
  const totalPages = Math.max(1, Math.ceil(filteredReadings.length / PAGE_SIZE));
  const paginatedReadings = filteredReadings.slice((paginationPage - 1) * PAGE_SIZE, paginationPage * PAGE_SIZE);

  function handleExport() {
    const csvRows = ["Timestamp,Sensor,Drying Room,Temperature,Humidity,Cannabis Moisture"];
    filteredReadings.forEach(r => {
      const s = sensors.find(sen => sen.id === r.sensorId);
      const z = zones.find(zn => zn.id === s?.zoneId);
      csvRows.push(`${new Date(r.timestamp).toISOString()},${s?.name || 'Unknown'},${z?.name || 'Unknown'},${r.temperature},${r.humidity},${r.moisture}`);
    });
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `drying_analytics_${new Date().getTime()}.csv`;
    a.click();
  }

  if (loading && zones.length === 0) {
    return <div className="p-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-green-600" /></div>;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-green-600" /> Data & Analytics
        </h1>
        <p className="text-gray-600 mt-1">Historical environmental readings, drying performance, and equipment analytics</p>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Total Readings</p>
            <p className="text-2xl font-bold text-gray-900">{totalReadings.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{dateRangeMode.toUpperCase()} period</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider flex items-center gap-1"><Thermometer className="w-3 h-3" /> Avg Temperature</p>
            <p className="text-2xl font-bold text-gray-900">{totalReadings > 0 ? avgTemp : '--'}°C</p>
            <p className="text-xs text-gray-400 mt-1">Across filtered sensors</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-cyan-500">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider flex items-center gap-1"><Wind className="w-3 h-3" /> Avg Humidity</p>
            <p className="text-2xl font-bold text-gray-900">{totalReadings > 0 ? avgHum : '--'}% RH</p>
            <p className="text-xs text-gray-400 mt-1">Across filtered sensors</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-teal-600">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider flex items-center gap-1"><Droplets className="w-3 h-3" /> Avg Cannabis Moisture</p>
            <p className="text-2xl font-bold text-gray-900">{totalReadings > 0 ? avgMoisture : '--'}%</p>
            <p className="text-xs text-teal-600 font-medium mt-1">Current batch average</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-indigo-500 flex flex-col justify-center">
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Active Batches</p>
            <p className="text-2xl font-bold text-gray-900">{activeBatchesCount}</p>
            <p className="text-xs text-gray-400 mt-1">Currently drying</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="bg-gray-50/50 border shadow-sm">
        <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Drying Room</label>
              <select value={selectedZone} onChange={e => setSelectedZone(e.target.value)} className="w-full text-sm border p-2 rounded-md bg-white">
                <option value="ALL">All Rooms</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Drying Batch</label>
              <select value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)} className="w-full text-sm border p-2 rounded-md bg-white">
                <option value="ALL">All Batches</option>
                {batches.map(b => <option key={b.id} value={b.id}>{b.batchName} - {new Date(b.createdAt).toLocaleDateString()}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Sensor Node</label>
              <select value={selectedSensor} onChange={e => setSelectedSensor(e.target.value)} className="w-full text-sm border p-2 rounded-md bg-white">
                <option value="ALL">All Sensors</option>
                {sensors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-600 uppercase">Date Range</label>
              <select value={dateRangeMode} onChange={e => setDateRangeMode(e.target.value as any)} className="w-full text-sm border p-2 rounded-md bg-white">
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>
          <Button variant="outline" onClick={handleExport} className="self-end" disabled={totalReadings === 0}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
        </CardContent>
      </Card>

      {/* DRYING BATCH PERFORMANCE WIDGET */}
      {activeBatch && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">DRYING BATCH PERFORMANCE</h2>
          <Card className="overflow-hidden">
            <CardContent className="p-6 bg-gradient-to-r from-gray-50 to-white flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 space-y-2">
                <h3 className="font-bold text-xl text-green-700">{activeBatch.batchName}</h3>
                <div className="text-sm text-gray-600 gap-4 grid grid-cols-2">
                  <p><strong>Started:</strong> {new Date(activeBatch.createdAt).toLocaleDateString()}</p>
                  <p><strong>Duration:</strong> {Math.floor((new Date().getTime() - new Date(activeBatch.createdAt).getTime()) / (1000 * 60 * 60 * 24))} days</p>
                  <p><strong>Start Moisture:</strong> ~25%</p>
                  <p><strong>Target Moisture:</strong> 12%</p>
                </div>
                <Badge className="bg-blue-500 hover:bg-blue-600">Status: Monitoring</Badge>
              </div>
              <div className="flex-1 w-full bg-white border p-4 rounded-xl shadow-sm">
                <p className="text-sm font-semibold mb-2">Moisture Reduction Progress</p>
                <div className="relative w-full h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div className="absolute top-0 left-0 h-full bg-teal-500 transition-all" style={{ width: '60%' }}></div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500 font-medium">
                  <span>Start (25%)</span>
                  <span className="text-teal-600 font-bold ml-10">Current: {avgMoisture}%</span>
                  <span>Target (12%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DRYING ENVIRONMENT OVERVIEW */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">DRYING ENVIRONMENT OVERVIEW</h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="py-3 px-4 border-b bg-gray-50"><CardTitle className="text-sm flex items-center gap-2"><Thermometer className="w-4 h-4 text-orange-500" /> Temperature History (°C)</CardTitle></CardHeader>
            <CardContent className="p-4 h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={30} />
                    <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} />
                    <RechartsTooltip labelFormatter={(label, payload) => payload[0]?.payload?.fullTime} />
                    <ReferenceLine y={21} stroke="green" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Target', fill: 'green', fontSize: 12 }} />
                    <Line type="monotone" dataKey="Temp" stroke="#f97316" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No data for selected period</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="py-3 px-4 border-b bg-gray-50"><CardTitle className="text-sm flex items-center gap-2"><Wind className="w-4 h-4 text-cyan-500" /> Humidity History (% RH)</CardTitle></CardHeader>
            <CardContent className="p-4 h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={30} />
                    <YAxis domain={[40, 80]} tick={{ fontSize: 12 }} />
                    <RechartsTooltip labelFormatter={(label, payload) => payload[0]?.payload?.fullTime} />
                    <ReferenceLine y={55} stroke="green" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="Hum" stroke="#06b6d4" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No data</div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="py-3 px-4 border-b bg-gray-50"><CardTitle className="text-sm flex items-center gap-2"><Droplets className="w-4 h-4 text-teal-600" /> Cannabis Moisture Reduction (%)</CardTitle></CardHeader>
            <CardContent className="p-4 h-[300px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} minTickGap={50} />
                    <YAxis domain={[10, 30]} tick={{ fontSize: 12 }} />
                    <RechartsTooltip labelFormatter={(label, payload) => payload[0]?.payload?.fullTime} />
                    <ReferenceLine y={12} stroke="green" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'Target Moisture (12%)', fill: 'green' }} />
                    <Line type="monotone" dataKey="Moisture" stroke="#0d9488" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">No data</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* EVENT HISTORY & TABLES */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Equipment Events Table */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">EQUIPMENT EVENT HISTORY</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Equipment</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Trigger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-gray-500 py-6">No equipment events recorded</TableCell></TableRow>
                  ) : filteredEvents.slice(0, 10).map((evt: any) => (
                    <TableRow key={evt.id}>
                      <TableCell className="whitespace-nowrap text-xs text-gray-600">{new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</TableCell>
                      <TableCell className="font-semibold text-xs">{evt.Fan?.name || evt.Cooler?.name || "System"}</TableCell>
                      <TableCell>
                        <Badge className={evt.newState === 'ON' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} variant="outline">
                          {evt.previousState} &rarr; {evt.newState}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-600 max-w-[150px] truncate">{evt.triggerReason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Raw Readings Table */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 border-b pb-2 mb-4">SENSOR READINGS HISTORY</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Sensor</TableHead>
                    <TableHead>Temp</TableHead>
                    <TableHead>Humidity</TableHead>
                    <TableHead>Moisture</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedReadings.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-gray-500 py-6">No sensor readings found</TableCell></TableRow>
                  ) : paginatedReadings.map((r) => {
                    const sr = sensors.find(s => s.id === r.sensorId);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="whitespace-nowrap text-xs text-gray-600">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                        <TableCell className="font-semibold text-xs">{sr?.name || 'Unknown'}</TableCell>
                        <TableCell className="text-xs text-orange-600 font-medium">{r.temperature}°C</TableCell>
                        <TableCell className="text-xs text-cyan-600 font-medium">{r.humidity}%</TableCell>
                        <TableCell className="text-xs text-teal-600 font-bold">{r.moisture}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Basic pagination for readings table */}
              {filteredReadings.length > PAGE_SIZE && (
                <div className="flex items-center justify-between p-3 border-t bg-gray-50 text-sm overflow-hidden">
                  <span className="text-gray-500 truncate mr-2">Showing {((paginationPage - 1) * PAGE_SIZE) + 1} - {Math.min(paginationPage * PAGE_SIZE, filteredReadings.length)} of {filteredReadings.length}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPaginationPage(p => Math.max(1, p - 1))} disabled={paginationPage === 1}>Prev</Button>
                    <Button variant="outline" size="sm" onClick={() => setPaginationPage(p => Math.min(totalPages, p + 1))} disabled={paginationPage === totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
