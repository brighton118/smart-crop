import { useState, useEffect } from "react";
import { Link } from "react-router";
import { supabase } from "../../../lib/supabase";
import { useAutomation } from "../../../lib/simulation/AutomationEngine";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Wind, Activity, Search, MapPin, Database, Cpu, Settings2, Power } from "lucide-react";
import { AddDryerWizard } from "./wizard/AddDryerWizard";

export function DryersList() {
    const [dryers, setDryers] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const { nodes } = useAutomation();

    useEffect(() => {
        fetchDryers();

        const sub = supabase.channel('dryers_list')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Zone' }, fetchDryers)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Device' }, fetchDryers)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Fan' }, fetchDryers)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Cooler' }, fetchDryers)
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, []);

    async function fetchDryers() {
        const { data, error } = await supabase
            .from('Zone')
            .select('*, devices:Device(*), cropBatches:CropBatch(*), fans:Fan(*), coolers:Cooler(*)');
        if (error) console.error("Error fetching dryers list:", error);
        if (data) setDryers(data);
    }

    const filteredDryers = dryers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

    const totalDryers = dryers.length;
    const onlineDryers = dryers.filter(d => d.devices?.[0]?.status === 'ONLINE').length;
    const activeBatches = dryers.reduce((acc, d) => acc + (d.cropBatches?.filter((b: any) => b.status === 'ACTIVE').length || 0), 0);
    const offlineDryers = totalDryers - onlineDryers;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dryers</h1>
                    <p className="text-gray-500">Manage drying environments, controllers, sensors, equipment, and drying batches.</p>
                </div>
                <AddDryerWizard onAdd={() => { window.location.reload() }} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                        <span className="text-sm font-medium text-gray-500">Total Dryers</span>
                        <span className="text-2xl font-bold">{totalDryers}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                        <span className="text-sm font-medium text-gray-500">Online Dryers</span>
                        <span className="text-2xl font-bold text-green-600">{onlineDryers}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                        <span className="text-sm font-medium text-gray-500">Active Dryers</span>
                        <span className="text-2xl font-bold text-blue-600">{activeBatches}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                        <span className="text-sm font-medium text-gray-500">Offline Dryers</span>
                        <span className="text-2xl font-bold text-gray-500">{offlineDryers}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                        <span className="text-sm font-medium text-gray-500">Active Batches</span>
                        <span className="text-2xl font-bold text-indigo-600">{activeBatches}</span>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                        <span className="text-sm font-medium text-gray-500">Alerts</span>
                        <span className="text-2xl font-bold text-red-600">0</span>
                    </CardContent>
                </Card>
            </div>

            <div className="flex bg-white p-3 rounded-lg border items-center shadow-sm">
                <Search className="w-5 h-5 text-gray-400 ml-2" />
                <Input
                    placeholder="Search Dryer..."
                    className="border-0 shadow-none focus-visible:ring-0"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div className="flex gap-2">
                    <Button variant="outline" size="sm"><Settings2 className="w-4 h-4 mr-2" /> Filter</Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredDryers.length === 0 ? (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-center border border-dashed rounded-xl bg-gray-50/50">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border mb-4">
                            <Wind className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">No Dryers Yet</h3>
                        <p className="text-gray-500 max-w-sm mb-6">Create a Dryer definition, assemble its physical hardware, and map it into the system to begin automation.</p>
                        <AddDryerWizard onAdd={() => { window.location.reload() }} />
                    </div>
                ) : (
                    filteredDryers.map(dryer => {
                        const esp = dryer.devices?.[0];
                        const isOnline = esp?.status === 'ONLINE';
                        const activeBatch = dryer.cropBatches?.find((b: any) => b.status === 'ACTIVE');
                        const dNodes = nodes.filter(n => n.zoneId === dryer.id);

                        let avgTemp = 0, avgHum = 0, avgMoist = 0;
                        if (dNodes.length > 0) {
                            avgTemp = dNodes.reduce((a, b) => a + b.currentTemp, 0) / dNodes.length;
                            avgHum = dNodes.reduce((a, b) => a + b.currentHum, 0) / dNodes.length;
                            avgMoist = dNodes.reduce((a, b) => a + b.currentMoist, 0) / dNodes.length;
                        }

                        return (
                            <Card key={dryer.id} className="flex flex-col">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between border-b bg-gray-50/50">
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {dryer.name}
                                            {isOnline ? (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 uppercase text-[10px]">Online</Badge>
                                            ) : (
                                                <Badge variant="secondary" className="uppercase text-[10px]">Offline</Badge>
                                            )}
                                        </CardTitle>
                                        <div className="text-xs text-gray-500 font-mono mt-1">ID: DRYER-{dryer.id.split('-')[0].toUpperCase()}</div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-4 flex-1 space-y-4">
                                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">{dryer.location || 'No Location'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Database className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">{dryer.chamber || 'No Chamber'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 col-span-2">
                                            <Activity className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">Batch: {activeBatch ? activeBatch.batchName : 'None'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 col-span-2">
                                            <Cpu className="w-4 h-4 text-gray-400" />
                                            <span className="truncate font-mono">Controller: {esp ? esp.deviceId : 'Not Assigned'}</span>
                                        </div>
                                    </div>

                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                                            Environment
                                        </div>
                                        <div className="grid grid-cols-3 divide-x divide-gray-100 p-2 text-center text-sm">
                                            <div>
                                                <div className="text-gray-500 mb-1">Temp</div>
                                                <div className="font-semibold">{dNodes.length ? avgTemp.toFixed(1) + '°C' : '--'}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 mb-1">Humidity</div>
                                                <div className="font-semibold">{dNodes.length ? avgHum.toFixed(1) + '% RH' : '--'}</div>
                                            </div>
                                            <div>
                                                <div className="text-gray-500 mb-1">Moist</div>
                                                <div className="font-semibold">{dNodes.length ? avgMoist.toFixed(1) + '%' : '--'}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b">
                                            Equipment
                                        </div>
                                        <div className="p-3 grid grid-cols-2 gap-2 max-h-24 overflow-y-auto">
                                            {dryer.fans?.map((f: any) => (
                                                <div key={f.id} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded">
                                                    <span className="truncate">{f.name}</span>
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <Wind className={`w-3 h-3 ${f.status === 'ON' ? 'text-green-500' : 'text-gray-400'}`} />
                                                        {f.status}
                                                    </span>
                                                </div>
                                            ))}
                                            {dryer.coolers?.map((c: any) => (
                                                <div key={c.id} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 rounded">
                                                    <span className="truncate">{c.name}</span>
                                                    <span className="flex items-center gap-1 font-medium">
                                                        <Power className={`w-3 h-3 ${c.status === 'ON' ? 'text-green-500' : 'text-gray-400'}`} />
                                                        {c.status}
                                                    </span>
                                                </div>
                                            ))}
                                            {(!dryer.fans?.length && !dryer.coolers?.length) && (
                                                <div className="col-span-2 text-xs text-center text-gray-500">No equipment configured.</div>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="bg-gray-50/50 border-t p-3">
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700" asChild>
                                        <Link to={`/app/dryers/${dryer.id}`}>Open Dryer</Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
