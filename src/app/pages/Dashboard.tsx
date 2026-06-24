import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Droplets, Thermometer, Wind, Cloud, TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "../components/AuthProvider";
import { supabase, DbFarm, DbSensor, DbSensorReading, DbAlert } from "../../lib/supabase";
import { getOrCreateDefaultFarm } from "../../lib/farmUtils";
import { seedDatabaseIfEmpty } from "../../lib/seedData";

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [farm, setFarm] = useState<DbFarm | null>(null);
  const [sensors, setSensors] = useState<(DbSensor & { lastValue?: number })[]>([]);
  const [criticalAlerts, setCriticalAlerts] = useState<DbAlert[]>([]);
  
  const [moistureChartData, setMoistureChartData] = useState<any[]>([]);
  const [tempHumidChartData, setTempHumidChartData] = useState<any[]>([]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    async function loadDashboardData() {
      setLoading(true);
      // 1. Get Farm & Zone
      const data = await getOrCreateDefaultFarm(user!.id);
      if (!data) return;
      
      setFarm(data.farm);


      // 2. Seed if empty
      await seedDatabaseIfEmpty(data.zone.id);

      // 3. Fetch Sensors
      const { data: sensorData } = await supabase
        .from("Sensor")
        .select("*")
        .eq("zoneId", data.zone.id);
        
      if (sensorData) setSensors(sensorData as (DbSensor & { lastValue?: number })[]);


      // 4. Fetch Readings for Charts
      if (sensorData && sensorData.length > 0) {
        const sensorIds = sensorData.map(s => s.id);
        const { data: readingsData } = await supabase
          .from("SensorReading")
          .select("*")
          .in("sensorId", sensorIds)
          .order("timestamp", { ascending: true })
          .limit(100);

        if (readingsData) {
          // Process readings into chart format
          processChartData(sensorData as DbSensor[], readingsData as DbSensorReading[]);
        }
      }

      // 5. Fetch Critical Alerts
      if (sensorData && sensorData.length > 0) {
        const sensorIds = sensorData.map(s => s.id);
        const { data: alertsData } = await supabase
          .from("Alert")
          .select("*, sensor:Sensor(name)")
          .in("sensorId", sensorIds)
          .eq("type", "CRITICAL")
          .eq("status", "UNREAD")
          .order("createdAt", { ascending: false })
          .limit(1);

        if (alertsData) setCriticalAlerts(alertsData);
      }

      setLoading(false);
    }

    loadDashboardData();
  }, [user]);

  useEffect(() => {
    if (sensors.length === 0) return;

    const sensorIds = new Set(sensors.map(s => s.id));

    // Subscribe to new readings to update charts and stats live
    const readingsChannel = supabase
      .channel('realtime-readings')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'SensorReading' },
        (payload) => {
          const newReading = payload.new as DbSensorReading;
          if (sensorIds.has(newReading.sensorId)) {
            // Update sensor lastValue in state
            setSensors(prev => prev.map(s => 
              s.id === newReading.sensorId ? { ...s, lastValue: newReading.value } : s
            ));
            
            // Append to chart data if it's within the last hour or so
            const timeLabel = new Date(newReading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // This is a bit simplified, but helps show live updates
            const sensor = sensors.find(s => s.id === newReading.sensorId);
            if (sensor?.type === "SOIL_MOISTURE") {
              setMoistureChartData(prev => [...prev.slice(-19), { time: timeLabel, value: newReading.value }]);
            } else if (sensor?.type === "TEMPERATURE" || sensor?.type === "HUMIDITY") {
              setTempHumidChartData(prev => {
                const last = prev[prev.length - 1];
                if (last && last.time === timeLabel) {
                  return [...prev.slice(0, -1), { 
                    ...last, 
                    temp: sensor.type === "TEMPERATURE" ? newReading.value : last.temp,
                    humidity: sensor.type === "HUMIDITY" ? newReading.value : last.humidity
                  }];
                }
                return [...prev.slice(-19), { 
                  time: timeLabel, 
                  temp: sensor.type === "TEMPERATURE" ? newReading.value : undefined,
                  humidity: sensor.type === "HUMIDITY" ? newReading.value : undefined
                }];
              });
            }
          }
        }
      )
      .subscribe();

    // Subscribe to new critical alerts
    const alertsChannel = supabase
      .channel('realtime-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Alert' },
        (payload) => {
          const newAlert = payload.new as DbAlert;
          if (sensorIds.has(newAlert.sensorId) && newAlert.type === "CRITICAL") {
            // Fetch sensor name for the alert
            const sensor = sensors.find(s => s.id === newAlert.sensorId);
            const alertWithSensor = { ...newAlert, sensor: { name: sensor?.name || "Sensor" } };
            setCriticalAlerts(prev => [alertWithSensor as any, ...prev]);
            showToast(`CRITICAL: ${newAlert.message}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(readingsChannel);
      supabase.removeChannel(alertsChannel);
    };
  }, [sensors]);

  function processChartData(allSensors: DbSensor[], allReadings: DbSensorReading[]) {
    // Group readings by timestamp roughly (e.g. by hour)
    const timeMap: Record<string, any> = {};

    allReadings.forEach(reading => {
      const sensor = allSensors.find(s => s.id === reading.sensorId);
      if (!sensor) return;

      const timeLabel = new Date(reading.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      if (!timeMap[timeLabel]) {
        timeMap[timeLabel] = { time: timeLabel, timestamp: new Date(reading.timestamp).getTime() };
      }

      if (sensor.type === "SOIL_MOISTURE") timeMap[timeLabel].moisture = reading.value;
      if (sensor.type === "TEMPERATURE") timeMap[timeLabel].temp = reading.value;
      if (sensor.type === "HUMIDITY") timeMap[timeLabel].humidity = reading.value;
    });

    // Sort chronologically
    const sortedPoints = Object.values(timeMap).sort((a, b) => a.timestamp - b.timestamp);

    // Split into chart datasets
    const mData = sortedPoints.filter(p => p.moisture !== undefined).map(p => ({ time: p.time, value: p.moisture }));
    const thData = sortedPoints.filter(p => p.temp !== undefined || p.humidity !== undefined).map(p => ({ time: p.time, temp: p.temp, humidity: p.humidity }));

    setMoistureChartData(mData);
    setTempHumidChartData(thData);
  }

  function showToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  }

  // Calculate current averages
  const avgMoisture = sensors.find(s => s.type === "SOIL_MOISTURE")?.lastValue || 0;
  const avgTemp = sensors.find(s => s.type === "TEMPERATURE")?.lastValue || 0;
  const avgHumidity = sensors.find(s => s.type === "HUMIDITY")?.lastValue || 0;

  const stats = [
    {
      title: "Substrate Moisture (VWC)",
      value: avgMoisture ? `${avgMoisture}%` : "--",
      status: avgMoisture < 35 ? "Low" : "Normal",
      icon: Droplets,
      color: avgMoisture < 35 ? "text-red-600" : "text-blue-600",
      bgColor: avgMoisture < 35 ? "bg-red-50" : "bg-blue-50",
      iconColor: avgMoisture < 35 ? "text-red-600" : "text-blue-600",
      trend: "-2%",
      trendDown: true,
    },
    {
      title: "Canopy Temperature",
      value: avgTemp ? `${avgTemp}°C` : "--",
      status: "Normal",
      icon: Thermometer,
      color: "text-green-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
      trend: "+1°C",
      trendDown: false,
    },
    {
      title: "Grow Room RH",
      value: avgHumidity ? `${avgHumidity}%` : "--",
      status: "Normal",
      icon: Wind,
      color: "text-sky-600",
      bgColor: "bg-sky-50",
      iconColor: "text-sky-600",
      trend: "+3%",
      trendDown: false,
    },
    {
      title: "Vapor Pressure Deficit",
      value: "1.2 kPa",
      status: "Optimal",
      icon: Cloud,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      iconColor: "text-emerald-600",
      trend: "0.0 kPa",
      trendDown: false,
    },
  ];

  if (loading) {
    return <div className="p-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="p-4 lg:p-8 space-y-6 relative">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 bg-gray-900 text-white px-6 py-3 rounded-lg shadow-xl z-50 animate-in fade-in slide-in-from-top-5">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your grow facility overview.</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>Last updated: Just now</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                  </div>
                  <div className={`text-sm font-medium ${stat.color}`}>{stat.status}</div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <div className={`flex items-center text-sm ${stat.trendDown ? 'text-red-600' : 'text-green-600'}`}>
                    <TrendingUp className={`w-4 h-4 mr-1 ${stat.trendDown ? 'rotate-180' : ''}`} />
                    <span>{stat.trend} from yesterday</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alert Banner */}
      {criticalAlerts.length > 0 && (
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-900">Critical Alert</h4>
                <p className="text-sm text-red-800 mt-1">
                  {criticalAlerts[0].message} (Source: {(criticalAlerts[0] as any).sensor?.name})
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Soil Moisture Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Substrate Moisture Trend (VWC)</CardTitle>
            <p className="text-sm text-gray-600">Last 24 hours</p>
          </CardHeader>
          <CardContent>
            {moistureChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={moistureChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Moisture %"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ fill: "#16a34a", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                No moisture data available yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Temperature & Humidity Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Temperature & Humidity</CardTitle>
            <p className="text-sm text-gray-600">Last 24 hours</p>
          </CardHeader>
          <CardContent>
            {tempHumidChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={tempHumidChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="time" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="temp" name="Temperature (°C)" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="humidity" name="Humidity (%)" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
                No temperature/humidity data available yet.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Farm Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Grow Facility Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden">
              <ImageWithFallback
                src="/cannabis_dashboard.png"
                alt="Cannabis Grow Canopy"
                className="w-full h-64 object-cover"
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Facility Name</p>
                <p className="text-xl font-semibold text-gray-900">{farm?.name || "KindBuds Facility"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Sensors</p>
                <p className="text-xl font-semibold text-gray-900">{sensors.filter(s => s.status !== "OFFLINE").length} Units</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="text-xl font-semibold text-gray-900 truncate">{farm?.location || "Not Set"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button 
              onClick={() => showToast("Feeding & Nutrients irrigation activated for Flowering Room A.")}
              className="w-full p-4 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-left"
            >
              <div className="font-semibold">Trigger Feeding Cycle</div>
              <div className="text-sm opacity-90">Activate nutrient drip feed</div>
            </button>
            <button 
              onClick={() => showToast("Grow room photoperiod cycle is configured to 12/12 bloom schedule.")}
              className="w-full p-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-left"
            >
              <div className="font-semibold">Adjust Light Photoperiod</div>
              <div className="text-sm opacity-90">Manage 12/12 or 18/6 light schedule</div>
            </button>
            <button 
              onClick={() => showToast("Cultivation log and environmental metrics report generated successfully.")}
              className="w-full p-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-left"
            >
              <div className="font-semibold">Export Crop Log & Yield Data</div>
              <div className="text-sm opacity-90">Download full batch analytics</div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
