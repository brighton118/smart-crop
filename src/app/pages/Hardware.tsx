import { useState, useEffect } from "react";

import { supabase, DbDevice, DbZone } from "../../lib/supabase";
import { Cpu, Plus, Wifi, WifiOff, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function Hardware() {

    const [devices, setDevices] = useState<DbDevice[]>([]);
    const [zones, setZones] = useState<DbZone[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form State
    const [newName, setNewName] = useState("");
    const [newDeviceId, setNewDeviceId] = useState("");
    const [newMacAddress, setNewMacAddress] = useState("");
    const [newFirmware] = useState("v1.0.0");
    const [newZoneId, setNewZoneId] = useState("");

    const fetchData = async () => {
        try {
            const [devicesData, zonesData] = await Promise.all([
                supabase.from("Device").select("*").order("createdAt", { ascending: false }),
                supabase.from("Zone").select("*").order("name")
            ]);

            if (devicesData.data) setDevices(devicesData.data);
            if (zonesData.data) setZones(zonesData.data);
        } catch (err) {
            console.error("Error fetching hardware:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Subscribe to realtime changes
        const sub = supabase.channel('devices')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Device' }, fetchData)
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        };
    }, []);

    const handleAddDevice = async () => {
        if (!newName || !newDeviceId || !newZoneId) {
            toast.error("Please fill out Name, Hardware ID, and Room.");
            return;
        }

        try {
            const { error } = await supabase.from("Device").insert({
                name: newName,
                id: newDeviceId,
                macAddress: newMacAddress,
                firmwareVersion: newFirmware,
                zoneId: newZoneId,
                status: "ONLINE", // Assume online for now
                updatedAt: new Date().toISOString()
            });

            if (error) {
                toast.error("Failed to add Device: " + error.message);
                return;
            }
            toast.success("ESP32 Device registered successfully.");
            setNewName("");
            setNewDeviceId("");
            setNewMacAddress("");
            setIsAddOpen(false);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("An unexpected error occurred.");
        }
    };

    const deleteDevice = async (id: string) => {
        if (!confirm("Are you sure you want to delete this device? This will unlink sensors and equipment.")) return;
        try {
            await supabase.from("Device").delete().eq("id", id);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    }

    // Summary Metrics
    const onlineCount = devices.filter(d => d.status === "ONLINE").length;
    const offlineCount = devices.filter(d => d.status === "OFFLINE").length;

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading ESP32 Registry...</div>;
    }

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Cpu className="w-8 h-8 text-indigo-600" />
                        ESP32 Device Registry
                    </h1>
                    <p className="mt-2 text-gray-600 max-w-2xl">
                        Register and monitor ESP32 microcontrollers. These devices are the physical brain of your drying rooms, reading sensors and automatically controlling Fan and Cooler relays according to configured thresholds.
                    </p>
                </div>

                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="font-semibold shadow-sm bg-indigo-600 hover:bg-indigo-700">
                            <Plus className="w-5 h-5 mr-2" />
                            Register ESP32
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Register ESP32 Controller</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="name">Device Name (e.g., Room 1 Controller)</Label>
                                <Input id="name" value={newName} onChange={e => setNewName(e.target.value)} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="deviceId">Hardware Device ID / Serial</Label>
                                <Input id="deviceId" placeholder="ESP32-001" value={newDeviceId} onChange={e => setNewDeviceId(e.target.value)} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="mac">MAC Address (Optional)</Label>
                                <Input id="mac" placeholder="AA:BB:CC:DD:EE:FF" value={newMacAddress} onChange={e => setNewMacAddress(e.target.value)} />
                            </div>

                            <div className="grid gap-2">
                                <Label>Drying Room / Zone</Label>
                                <Select value={newZoneId} onValueChange={setNewZoneId}>
                                    <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                                    <SelectContent>
                                        {zones.map(z => (
                                            <SelectItem key={z.id} value={z.id}>{z.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                        </div>
                        <div className="flex justify-end gap-3 mt-4">
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button onClick={handleAddDevice} className="bg-indigo-600">Register Device</Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border p-6 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Cpu className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Devices</p>
                        <p className="text-2xl font-bold text-gray-900">{devices.length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-6 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Wifi className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Online</p>
                        <p className="text-2xl font-bold text-gray-900">{onlineCount}</p>
                    </div>
                </div>
                <div className="bg-white rounded-xl border p-6 shadow-sm flex items-center space-x-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-lg"><WifiOff className="w-6 h-6" /></div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Offline</p>
                        <p className="text-2xl font-bold text-gray-900">{offlineCount}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {devices.length === 0 ? (
                    <div className="col-span-full py-12 text-center bg-white rounded-xl border border-dashed text-gray-500">
                        No ESP32 devices registered yet. Click "Register ESP32" to add one.
                    </div>
                ) : (
                    devices.map((device) => {
                        const isOnline = device.status === 'ONLINE';
                        const roomName = zones.find(z => z.id === device.zoneId)?.name || 'Unknown Room';

                        return (
                            <div key={device.id} className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
                                <div className="p-5 border-b bg-gray-50/50 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-semibold text-gray-900">{device.name}</h3>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isOnline ? 'bg-emerald-100 text-emerald-800' : device.status === 'WARNING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                                {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                                                {device.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-500 font-mono">{device.deviceId}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => deleteDevice(device.id)} className="text-red-500 hover:bg-red-50">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className="p-5 flex-1 grid grid-cols-2 gap-y-4 gap-x-2 text-sm">
                                    <div>
                                        <span className="block text-gray-500 mb-1">Assigned Room</span>
                                        <span className="font-medium text-gray-900">{roomName}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 mb-1">Last Seen</span>
                                        <span className="font-medium text-gray-900">
                                            {device.lastSeen ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true }) : "Never"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 mb-1">MAC Address</span>
                                        <span className="font-mono text-gray-700">{device.macAddress || "N/A"}</span>
                                    </div>
                                    <div>
                                        <span className="block text-gray-500 mb-1">Firmware</span>
                                        <span className="font-medium text-gray-700">{device.firmware || "Unknown"}</span>
                                    </div>
                                </div>

                                <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between">
                                    <span className="text-xs text-indigo-600 font-medium">Ready for Hardware Mappings</span>
                                    <span className="text-xs text-gray-500">Go to Sensors or Equipment to assign pins.</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

        </div>
    );
}
