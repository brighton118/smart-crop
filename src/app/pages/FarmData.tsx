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
import { Search, Download, Calendar, Filter, Loader2 } from "lucide-react";
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

export function FarmData() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [farmData, setFarmData] = useState<FarmDataEntry[]>([]);

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
    // Group readings by hour to mimic the table structure
    const timeMap: Record<string, FarmDataEntry> = {};

    allReadings.forEach(reading => {
      const sensor = allSensors.find(s => s.id === reading.sensorId);
      if (!sensor) return;

      const d = new Date(reading.timestamp);
      // Group by nearest hour roughly (just truncating to hour)
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

      // Determine status roughly based on thresholds
      const isWarn = reading.value < sensor.minThreshold || reading.value > sensor.maxThreshold;
      if (isWarn) {
        // Simple logic: if any reading is out of bounds, mark the hour as warning (or critical if extreme)
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

  const filteredData = farmData.filter(
    (entry) =>
      entry.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.time.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
    a.setAttribute("download", `farm_data_${new Date().toISOString().slice(0,10)}.csv`);
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

              {/* Filter Buttons */}
              <Button variant="outline" size="default">
                <Calendar className="w-4 h-4 mr-2" />
                Date Range
              </Button>
              <Button variant="outline" size="default">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="default" onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
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
                {filteredData.map((entry) => (
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
              No records found matching your search.
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Showing {filteredData.length} of {farmData.length} records
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
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
