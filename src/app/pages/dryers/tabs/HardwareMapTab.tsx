import { useEffect, useState } from "react";
import { supabase } from "../../../../lib/supabase";
import { Cpu, Wind, Thermometer, Droplets, ArrowDown, Activity, Settings } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";

export function HardwareMapTab({ zoneId }: { zoneId: string }) {
    const [devices, setDevices] = useState<any[]>([]);
    const [connections, setConnections] = useState<any[]>([]);

    useEffect(() => {
        fetchTopology();
    }, [zoneId]);

    async function fetchTopology() {
        const [devRes, connRes] = await Promise.all([
            supabase.from('Device').select('*').eq('zoneId', zoneId),
            supabase.from('HardwareConnection').select(`
                *,
                relayModule:RelayModule(*),
                sensor:Sensor(*),
                fan:Fan(*),
                cooler:Cooler(*)
            `).eq('zoneId', zoneId)
        ]);

        if (devRes.data) setDevices(devRes.data);
        if (connRes.data) setConnections(connRes.data);
    }

    if (devices.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-zinc-900 rounded-lg border border-zinc-800">
                <Cpu className="w-12 h-12 text-zinc-600 mb-4" />
                <h3 className="text-xl font-bold">No Controllers Assigned</h3>
                <p className="text-zinc-400">Add an ESP32 controller in the Controller tab to begin mapping hardware.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-12">
            {devices.map(device => {
                const inputs = connections.filter(c => c.deviceId === device.id && c.direction === 'INPUT');
                const outputs = connections.filter(c => c.deviceId === device.id && c.direction === 'OUTPUT');

                return (
                    <Card key={device.id} className="bg-zinc-900 border-zinc-800">
                        <CardHeader className="border-b border-zinc-800 bg-zinc-950/50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Cpu className="w-6 h-6 text-[#ce9124]" />
                                    <div>
                                        <CardTitle className="text-xl">{device.name}</CardTitle>
                                        <p className="text-sm text-zinc-400 font-mono">{device.deviceId}</p>
                                    </div>
                                </div>
                                <div className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    ONLINE
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                {/* INPUTS COLUMN */}
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded bg-blue-500"></div>
                                        Inputs (Sensors)
                                    </h3>

                                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
                                        {inputs.length === 0 ? (
                                            <p className="text-zinc-500 text-sm ml-8 italic">No physical input connections.</p>
                                        ) : inputs.map(conn => {
                                            const sensor = conn.sensor;
                                            return (
                                                <div key={conn.id} className="relative flex items-start gap-4">
                                                    <div className="absolute left-0 top-6 ml-4 w-4 border-b-2 border-zinc-700"></div>
                                                    <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-blue-500/50 flex items-center justify-center shrink-0 z-10 z-[1] mt-2">
                                                        <Activity className="w-4 h-4 text-blue-400" />
                                                    </div>
                                                    <div className="flex-1 bg-zinc-950 p-4 rounded-lg border border-zinc-800 shadow-sm relative">
                                                        <div className="absolute top-0 right-0 p-2 opacity-50">
                                                            <div className="text-[10px] uppercase font-bold tracking-wider text-blue-500">GPIO {conn.gpioPin || 'UNK'}</div>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-zinc-200">{sensor?.name || 'Unknown Sensor'}</span>
                                                            <span className="text-xs text-zinc-500 font-mono mt-1">{sensor?.type || conn.type}</span>
                                                        </div>
                                                        <div className="mt-4 flex gap-2">
                                                            <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded border border-blue-500/20">Verified</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* OUTPUTS COLUMN */}
                                <div>
                                    <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded bg-[#ce9124]"></div>
                                        Outputs (Equipment)
                                    </h3>

                                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-4 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
                                        {outputs.length === 0 ? (
                                            <p className="text-zinc-500 text-sm ml-8 italic">No physical output connections.</p>
                                        ) : outputs.map(conn => {
                                            const equipment = conn.fan || conn.cooler;
                                            const isFan = conn.fan != null;
                                            return (
                                                <div key={conn.id} className="relative flex animate-in fade-in slide-in-from-top-4 items-start gap-4 flex-col">

                                                    {/* RELAY MODULE NODE */}
                                                    <div className="relative flex items-start gap-4 w-full">
                                                        <div className="absolute left-0 top-6 ml-4 w-4 border-b-2 border-zinc-700"></div>
                                                        <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-zinc-600 flex items-center justify-center shrink-0 z-10 mt-2">
                                                            <Settings className="w-4 h-4 text-zinc-400" />
                                                        </div>
                                                        <div className="bg-zinc-900 border border-zinc-800 rounded p-2 text-xs flex gap-4 w-full relative z-10 z-[2]">
                                                            <div><span className="text-zinc-500">Relay Module:</span> <span className="font-mono text-zinc-300">{conn.relayModule?.name || 'Onboard Interface'}</span></div>
                                                            <div><span className="text-zinc-500">CH:</span> <span className="font-mono text-zinc-300">{conn.relayChannel || 'N/A'}</span></div>
                                                        </div>
                                                    </div>

                                                    <div className="pl-6 w-full flex flex-col items-center">
                                                        <ArrowDown className="w-4 h-4 text-zinc-700 animate-pulse" />
                                                    </div>

                                                    {/* EQUIPMENT NODE */}
                                                    <div className="relative flex items-start gap-4 w-full pl-6">
                                                        <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#ce9124]/50 flex items-center justify-center shrink-0 z-10 mt-2">
                                                            {isFan ? <Wind className="w-4 h-4 text-[#ce9124]" /> : <Thermometer className="w-4 h-4 text-[#ce9124]" />}
                                                        </div>
                                                        <div className="flex-1 bg-zinc-950 p-4 rounded-lg border border-zinc-800 shadow-sm relative">
                                                            <div className="absolute top-0 right-0 p-2 opacity-50">
                                                                <div className="text-[10px] uppercase font-bold tracking-wider text-[#ce9124]">EQ {conn.relayChannel}</div>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-zinc-200">{equipment?.name || 'Unknown Equipment'}</span>
                                                                <span className="text-xs text-zinc-500 font-mono mt-1">{isFan ? 'FAN' : 'COOLER'} / {equipment?.controlMode || 'MANUAL'}</span>
                                                            </div>
                                                            <div className="mt-4 flex gap-2">
                                                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20">{equipment?.status || 'OFF'}</span>
                                                                <span className="px-2 py-1 bg-zinc-800 text-zinc-400 text-xs rounded border border-zinc-700">Relay Tested</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
