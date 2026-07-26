import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Badge } from "../../../components/ui/badge";
import { Thermometer, Droplets, Wind, Activity, Zap, Power } from "lucide-react";
import { useAutomation } from "../../../../lib/simulation/AutomationEngine";

export function OverviewTab({ dryer }: { dryer: any }) {
    const { nodes } = useAutomation();
    const dNodes = nodes.filter(n => n.zoneId === dryer.id);

    let avgTemp = 0, avgHum = 0, avgMoist = 0;
    if (dNodes.length > 0) {
        avgTemp = dNodes.reduce((a, b) => a + b.currentTemp, 0) / dNodes.length;
        avgHum = dNodes.reduce((a, b) => a + b.currentHum, 0) / dNodes.length;
        avgMoist = dNodes.reduce((a, b) => a + b.currentMoist, 0) / dNodes.length;
    }

    // Find assigned thresholds if any - typically EnvironmentalThresholds belong to zone or batch
    const threshold = dryer.envThreshold?.[0]; // assuming fetching relation returns array

    // Active Batch logic
    const activeBatch = dryer.cropBatches?.find((b: any) => b.status === 'ACTIVE');

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Environment Summary Cards */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Temperature</CardTitle>
                        <Thermometer className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dNodes.length ? avgTemp.toFixed(1) + " °C" : "--"}</div>
                        {threshold && <p className="text-xs text-muted-foreground">Target: {threshold.minTemp}°C - {threshold.maxTemp}°C</p>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Humidity</CardTitle>
                        <Droplets className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dNodes.length ? avgHum.toFixed(1) + " %" : "--"}</div>
                        {threshold && <p className="text-xs text-muted-foreground">Target: {threshold.minHum}% - {threshold.maxHum}%</p>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Wood Moisture</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dNodes.length ? avgMoist.toFixed(1) + " %" : "--"}</div>
                        {threshold && <p className="text-xs text-muted-foreground">Target: {threshold.minMoist}% - {threshold.maxMoist}%</p>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Batch</CardTitle>
                        <Activity className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeBatch ? 'Running' : 'Idle'}</div>
                        {activeBatch && <p className="text-xs text-muted-foreground">Batch: {activeBatch.batchName}</p>}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Active Equipment View */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Equipment Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {dryer.fans?.length === 0 && dryer.coolers?.length === 0 && (
                            <div className="text-sm text-gray-500">No equipment configured for this dryer.</div>
                        )}

                        {dryer.fans?.map((fan: any) => (
                            <div key={fan.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${fan.status === 'ON' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <Wind className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{fan.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">Channel {fan.relayChannel} - {fan.controlMode}</div>
                                    </div>
                                </div>
                                <Badge variant={fan.status === 'ON' ? 'default' : 'secondary'} className={fan.status === 'ON' ? 'bg-green-600' : ''}>
                                    {fan.status}
                                </Badge>
                            </div>
                        ))}

                        {dryer.coolers?.map((cooler: any) => (
                            <div key={cooler.id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${cooler.status === 'ON' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                                        <Power className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="font-medium">{cooler.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">Channel {cooler.relayChannel} - {cooler.controlMode}</div>
                                    </div>
                                </div>
                                <Badge variant={cooler.status === 'ON' ? 'default' : 'secondary'} className={cooler.status === 'ON' ? 'bg-blue-600' : ''}>
                                    {cooler.status}
                                </Badge>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
