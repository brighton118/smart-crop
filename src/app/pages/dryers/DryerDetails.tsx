import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { supabase } from "../../../lib/supabase";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { MapPin, Database, Activity, Cpu, ArrowLeft } from "lucide-react";
import { Button } from "../../components/ui/button";

import { OverviewTab } from "./tabs/OverviewTab";
import { ControllerTab } from "./tabs/ControllerTab";
import { SensorsTab } from "./tabs/SensorsTab";
import { EquipmentTab } from "./tabs/EquipmentTab";
import { AutomationTab } from "./tabs/AutomationTab";
import { HistoryTab } from "./tabs/HistoryTab";

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
        const { data } = await supabase
            .from('Zone')
            .select('*, devices(*), cropBatches(*), fans(*), coolers(*), sensors(*), envThreshold(*)')
            .eq('id', dryerId)
            .single();

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
                        <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3">Overview</TabsTrigger>
                        <TabsTrigger value="controller" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3">Controller</TabsTrigger>
                        <TabsTrigger value="sensors" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3">Sensors</TabsTrigger>
                        <TabsTrigger value="equipment" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3">Equipment</TabsTrigger>
                        <TabsTrigger value="hardware" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3">Hardware Map</TabsTrigger>
                        <TabsTrigger value="automation" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3">Automation</TabsTrigger>
                        <TabsTrigger value="history" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3">History</TabsTrigger>
                        <TabsTrigger value="alerts" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-1 py-3">Alerts</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview">
                        <OverviewTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="controller">
                        <ControllerTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="sensors">
                        <SensorsTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="equipment">
                        <EquipmentTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="hardware">
                        Hardware map coming soon
                    </TabsContent>

                    <TabsContent value="automation">
                        <AutomationTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="history">
                        <HistoryTab dryer={dryer} />
                    </TabsContent>

                    <TabsContent value="alerts">
                        Alerts content coming soon
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
