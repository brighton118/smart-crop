import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { supabase } from "../../../lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { MapPin, Database, Activity, Cpu, ArrowLeft, Beaker } from "lucide-react";
import { Button } from "../../components/ui/button";

import { OverviewTab } from "./tabs/OverviewTab";
import { ControllerTab } from "./tabs/ControllerTab";
import { SensorsTab } from "./tabs/SensorsTab";
import { EquipmentTab } from "./tabs/EquipmentTab";
import { AutomationTab } from "./tabs/AutomationTab";
import { HistoryTab } from "./tabs/HistoryTab";
import { HardwareMapTab } from "./tabs/HardwareMapTab";
import { Settings, AlertCircle, Calendar } from "lucide-react";

export function DryerDetails() {
    const { dryerId } = useParams();
    const [dryer, setDryer] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDryer();

        // Subscribe to changes on this specific Zone's related equipment/devices
        const sub = supabase.channel(`dryer_details_${dryerId}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Zone', filter: `id=eq.${dryerId}` }, fetchDryer)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Device', filter: `zoneId=eq.${dryerId}` }, fetchDryer)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Fan', filter: `zoneId=eq.${dryerId}` }, fetchDryer)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Cooler', filter: `zoneId=eq.${dryerId}` }, fetchDryer)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'EquipmentEvent' }, fetchDryer) // Event doesn't easily filter by zoneId directly in realtime so we re-fetch if any happens
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, [dryerId]);

    async function fetchDryer() {
        const { data, error } = await supabase
            .from('Zone')
            .select('*, devices:Device(*), cropBatches:CropBatch(*), fans:Fan(*), coolers:Cooler(*), sensors:Sensor(*), envThreshold:EnvironmentalThreshold(*)')
            .eq('id', dryerId)
            .single();

        if (error) console.error("Error fetching dryer details:", error);
        if (data) setDryer(data);
        setLoading(false);
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Dryer...</div>;
    if (!dryer) return <div className="p-8 text-center text-red-500">Dryer not found</div>;

    const esp = dryer.devices?.[0];
    const isOnline = esp?.status === 'ONLINE';
    const activeBatch = dryer.cropBatches?.find((b: any) => b.status === 'ACTIVE');

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Region */}
            <div className="bg-white border-b py-6 px-6">
                <div className="mb-4">
                    <Button variant="ghost" className="text-gray-500 hover:text-gray-900 -ml-4" asChild>
                        <Link to="/app/dryers"><ArrowLeft className="w-4 h-4 mr-2" /> Back to Dryers</Link>
                    </Button>
                </div>

                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold text-gray-900">{dryer.name}</h1>
                            {isOnline ? (
                                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 px-3 uppercase text-xs">Online</Badge>
                            ) : (
                                <Badge variant="secondary" className="px-3 uppercase text-xs">Offline</Badge>
                            )}
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-3 uppercase text-xs flex items-center gap-1"><Beaker className="w-3 h-3" /> Simulated Hardware</Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-gray-600 font-medium">
                            <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-gray-400" /> {dryer.location || 'Unassigned Room'}</div>
                            <div className="flex items-center gap-1.5"><Database className="w-4 h-4 text-gray-400" /> {dryer.chamber || 'Unassigned Chamber'}</div>
                            <div className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-gray-400" /> {activeBatch ? activeBatch.batchName : 'No Active Batch'}</div>
                            <div className="flex items-center gap-1.5"><Cpu className="w-4 h-4 text-gray-400" /> ESP32: {esp ? esp.deviceId : 'Not Setup'}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Tabbed Content Area */}
            <div className="px-6 pb-12">
                <Tabs defaultValue="overview">
                    <TabsList className="w-full flex justify-start border-b rounded-none h-auto bg-transparent space-x-6 p-0 mb-6 overflow-x-auto">
                        <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 whitespace-nowrap">Overview</TabsTrigger>
                        <TabsTrigger value="hardware" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 whitespace-nowrap">Hardware</TabsTrigger>
                        <TabsTrigger value="esp32" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 whitespace-nowrap">ESP32</TabsTrigger>
                        <TabsTrigger value="sensors" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 whitespace-nowrap">Sensors</TabsTrigger>
                        <TabsTrigger value="equipment" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 whitespace-nowrap">Equipment</TabsTrigger>
                        <TabsTrigger value="automation" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 whitespace-nowrap">Automation</TabsTrigger>
                        <TabsTrigger value="batch" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 whitespace-nowrap">Batch</TabsTrigger>
                        <TabsTrigger value="livedata" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 whitespace-nowrap">Live Data</TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 whitespace-nowrap">History</TabsTrigger>
                        <TabsTrigger value="alerts" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 whitespace-nowrap">Alerts</TabsTrigger>
                        <TabsTrigger value="settings" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3 whitespace-nowrap">Settings</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <OverviewTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="hardware">
                        <HardwareMapTab zoneId={dryerId!} />
                    </TabsContent>

                    <TabsContent value="esp32">
                        <ControllerTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="sensors">
                        <SensorsTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="equipment">
                        <EquipmentTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="automation">
                        <AutomationTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="batch">
                        <div className="p-8 text-center text-gray-500 border rounded-lg bg-gray-50">
                            <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            Batch management coming soon.
                        </div>
                    </TabsContent>

                    <TabsContent value="livedata">
                        <div className="p-8 text-center text-gray-500 border rounded-lg bg-gray-50">
                            <Activity className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            Live Data visualization coming soon.
                        </div>
                    </TabsContent>

                    <TabsContent value="history">
                        <HistoryTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="alerts">
                        <div className="p-8 text-center text-gray-500 border rounded-lg bg-gray-50">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            Alerts Engine coming soon.
                        </div>
                    </TabsContent>

                    <TabsContent value="settings">
                        <div className="p-8 text-center text-gray-500 border rounded-lg bg-gray-50">
                            <Settings className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            Settings coming soon.
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
