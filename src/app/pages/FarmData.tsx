import { useState, useEffect } from "react";
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
import { Search, Download, Calendar, Filter, Loader2, X } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { supabase, DbSensor, DbSensorReading } from "../../lib/supabase";
import { getOrCreateDefaultFarm } from "../../lib/farmUtils";

interface FarmDataEntry {
  id: string;
  date: string;
  time: string;
  timestamp: number;
  soilMoisture: number | null;
  temperature: number | null;
  humidity: number | null;
  status: "normal" | "warning" | "critical";
}

const PAGE_SIZE = 20;

export function FarmData() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [farmData, setFarmData] = useState<FarmDataEntry[]>([]);

  // Date Range state
  const [showDateRange, setShowDateRange] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Status Filter state
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [statusFilters, setStatusFilters] = useState<Record<string, boolean>>({
    normal: true,
    warning: true,
    critical: true,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);
      const data = await getOrCreateDefaultFarm(user!.id);
      if (!data) return;

      const { data: sensors } = await supabase
        .from("Sensor")
        .select("*")
        .eq("zoneId", data.zone.id);

      if (!sensors || sensors.length === 0) {
        setLoading(false);
        return;
      }

      const sensorIds = sensors.map(s => s.id);

      const { data: readings } = await supabase
        .from("SensorReading")
        .select("*")
        .in("sensorId", sensorIds)
        .order("timestamp", { ascending: false });

      if (readings) {
        processReadings(sensors as DbSensor[], readings as DbSensorReading[]);
      }

      setLoading(false);
    }
    loadData();
  }, [user]);

  function processReadings(allSensors: DbSensor[], allReadings: DbSensorReading[]) {
    const timeMap: Record<string, FarmDataEntry> = {};

    allReadings.forEach(reading => {
      const sensor = allSensors.find(s => s.id === reading.sensorId);
      if (!sensor) return;

      const d = new Date(reading.timestamp);
      d.setMinutes(0, 0, 0);
      const timeKey = d.getTime().toString();

      if (!timeMap[timeKey]) {
        timeMap[timeKey] = {
          id: timeKey,
          date: d.toLocaleDateString("en-US", { month: 'short', day: '2-digit', year: 'numeric' }),
          time: d.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }),
          timestamp: d.getTime(),
          soilMoisture: null,
          temperature: null,
          humidity: null,
          status: "normal"
        };
      }

      if (sensor.type === "SOIL_MOISTURE") timeMap[timeKey].soilMoisture = reading.value;
      if (sensor.type === "TEMPERATURE") timeMap[timeKey].temperature = reading.value;
      if (sensor.type === "HUMIDITY") timeMap[timeKey].humidity = reading.value;

      const isWarn = reading.value < sensor.minThreshold || reading.value > sensor.maxThreshold;
      if (isWarn) {
        const isExtreme = reading.value < (sensor.minThreshold - 5) || reading.value > (sensor.maxThreshold + 5);
        if (isExtreme) timeMap[timeKey].status = "critical";
        else if (timeMap[timeKey].status !== "critical") timeMap[timeKey].status = "warning";
      }
    });

    const rows = Object.values(timeMap).sort((a, b) => b.timestamp - a.timestamp);
    setFarmData(rows);
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "critical":
        return <Badge variant="destructive">Critical</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500 text-white hover:bg-yellow-600">Warning</Badge>;
      case "normal":
        return <Badge className="bg-green-500 text-white hover:bg-green-600">Normal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "critical":
        return "bg-red-50";
      case "warning":
        return "bg-yellow-50";
      default:
        return "";
    }
  };

  // Apply all filters
  const filteredData = farmData.filter((entry) => {
    // Text search
    const matchesSearch =
      entry.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.time.toLowerCase().includes(searchQuery.toLowerCase());

    // Date range filter
    let matchesDateRange = true;
    if (dateFrom) {
      const fromTs = new Date(dateFrom).getTime();
      matchesDateRange = entry.timestamp >= fromTs;
    }
    if (dateTo && matchesDateRange) {
      const toTs = new Date(dateTo).getTime() + 86400000; // end of day
      matchesDateRange = entry.timestamp <= toTs;
    }

    // Status filter
    const matchesStatus = statusFilters[entry.status];

    return matchesSearch && matchesDateRange && matchesStatus;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = filteredData.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFrom, dateTo, statusFilters]);

  function exportCSV() {
    const headers = ["Date", "Time", "Soil Moisture (%)", "Temperature (°C)", "Humidity (%)", "Status"];
    const csvRows = [headers.join(",")];

    filteredData.forEach(row => {
      csvRows.push([
        row.date,
        row.time,
        row.soilMoisture !== null ? row.soilMoisture : "",
        row.temperature !== null ? row.temperature : "",
        row.humidity !== null ? row.humidity : "",
        row.status
      ].join(","));
    });

    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("href", url);
    a.setAttribute("download", `farm_data_${new Date().toISOString().slice(0, 10)}.csv`);
    a.click();
  }

  // Calculate stats
  const totalMoisture = farmData.reduce((acc, r) => acc + (r.soilMoisture || 0), 0);
  const totalTemp = farmData.reduce((acc, r) => acc + (r.temperature || 0), 0);
  const totalHumidity = farmData.reduce((acc, r) => acc + (r.humidity || 0), 0);

  const moistureCount = farmData.filter(r => r.soilMoisture !== null).length;
  const tempCount = farmData.filter(r => r.temperature !== null).length;
  const humidityCount = farmData.filter(r => r.humidity !== null).length;

  const avgMoisture = moistureCount ? (totalMoisture / moistureCount).toFixed(1) : "--";
  const avgTemp = tempCount ? (totalTemp / tempCount).toFixed(1) : "--";
  const avgHumidity = humidityCount ? (totalHumidity / humidityCount).toFixed(1) : "--";

  function toggleStatusFilter(status: string) {
    setStatusFilters(prev => ({ ...prev, [status]: !prev[status] }));
  }

  function clearDateRange() {
    setDateFrom("");
    setDateTo("");
    setShowDateRange(false);
  }

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Farm Data</h1>
        <p className="text-gray-600 mt-1">Historical sensor readings and analytics</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total Records</p>
            <p className="text-2xl font-bold text-gray-900">{farmData.length}</p>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Avg Soil Moisture</p>
            <p className="text-2xl font-bold text-gray-900">{avgMoisture}%</p>
            <p className="text-xs text-gray-500 mt-1">From recorded data</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Avg Temperature</p>
            <p className="text-2xl font-bold text-gray-900">{avgTemp}°C</p>
            <p className="text-xs text-gray-500 mt-1">From recorded data</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Avg Humidity</p>
            <p className="text-2xl font-bold text-gray-900">{avgHumidity}%</p>
            <p className="text-xs text-gray-500 mt-1">From recorded data</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle>Sensor Readings History</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by date or time..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Date Range Button */}
              <Button
                variant={dateFrom || dateTo ? "default" : "outline"}
                size="default"
                onClick={() => { setShowDateRange(!showDateRange); setShowStatusFilter(false); }}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Date Range
                {(dateFrom || dateTo) && (
                  <span className="ml-1 w-2 h-2 bg-white rounded-full inline-block" />
                )}
              </Button>

              {/* Filter Button */}
              <Button
                variant={Object.values(statusFilters).some(v => !v) ? "default" : "outline"}
                size="default"
                onClick={() => { setShowStatusFilter(!showStatusFilter); setShowDateRange(false); }}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
                {Object.values(statusFilters).some(v => !v) && (
                  <span className="ml-1 w-2 h-2 bg-white rounded-full inline-block" />
                )}
              </Button>

              <Button variant="outline" size="default" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Date Range Panel */}
          {showDateRange && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border flex flex-wrap items-end gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-40 bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600">To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-40 bg-white"
                />
              </div>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={clearDateRange} className="text-red-600 hover:text-red-700">
                  <X className="w-4 h-4 mr-1" /> Clear
                </Button>
              )}
            </div>
          )}

          {/* Status Filter Panel */}
          {showStatusFilter && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <span className="text-xs font-medium text-gray-600">Show status:</span>
              {(["normal", "warning", "critical"] as const).map((status) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={statusFilters[status]}
                    onChange={() => toggleStatusFilter(status)}
                    className="rounded border-gray-300"
                  />
                  <span className={`text-sm capitalize ${status === "critical" ? "text-red-600" :
                      status === "warning" ? "text-yellow-600" : "text-green-600"
                    }`}>{status}</span>
                </label>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Soil Moisture</TableHead>
                  <TableHead>Temperature</TableHead>
                  <TableHead>Humidity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((entry) => (
                  <TableRow key={entry.id} className={getStatusColor(entry.status)}>
                    <TableCell className="font-medium">{entry.date}</TableCell>
                    <TableCell>{entry.time}</TableCell>
                    <TableCell>
                      <span className={(entry.soilMoisture && entry.soilMoisture < 35) ? "text-red-600 font-semibold" : ""}>
                        {entry.soilMoisture ? `${entry.soilMoisture}%` : "--"}
                      </span>
                    </TableCell>
                    <TableCell>{entry.temperature ? `${entry.temperature}°C` : "--"}</TableCell>
                    <TableCell>{entry.humidity ? `${entry.humidity}%` : "--"}</TableCell>
                    <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredData.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No records found matching your filters.
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Showing {paginatedData.length > 0 ? ((safeCurrentPage - 1) * PAGE_SIZE) + 1 : 0}–{Math.min(safeCurrentPage * PAGE_SIZE, filteredData.length)} of {filteredData.length} records
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 px-2">
                Page {safeCurrentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">
            Download your farm data in various formats for analysis and record-keeping.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export as CSV
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export as Excel
            </Button>
            <Button variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export as PDF
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
