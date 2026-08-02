import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Plus } from "lucide-react";

export function AddSensorModal({ zoneId, onAdd }: { zoneId: string, onAdd: () => void }) {
    const [open, setOpen] = useState(false);
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState("");
    const [type, setType] = useState("TEMPERATURE");
    const [esp32Id, setEsp32Id] = useState("");
    const [gpioPin, setGpioPin] = useState("");
    const [deviceId, setDeviceId] = useState(`SENS-${Math.floor(Math.random() * 10000)}`);

    useEffect(() => {
        if (open) {
            fetchDevices();
        }
    }, [open]);

    async function fetchDevices() {
        const { data } = await supabase.from('Device').select('*').eq('zoneId', zoneId);
        if (data) setDevices(data);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);

        const sensorId = crypto.randomUUID();
        const newSensor = {
            id: sensorId,
            name,
            type,
            zoneId,
            esp32Id: esp32Id && esp32Id !== 'none' ? esp32Id : null,
            gpioPin: gpioPin || null,
            deviceId,
            minThreshold: 0,
            maxThreshold: 100,
            unit: type === 'TEMPERATURE' ? '°C' : type === 'HUMIDITY' ? '%' : 'V'
        };

        const { error } = await supabase.from('Sensor').insert([newSensor]);

        if (!error && esp32Id && esp32Id !== 'none') {
            await supabase.from('HardwareConnection').insert([{
                id: crypto.randomUUID(),
                zoneId,
                deviceId: esp32Id,
                type: 'SENSOR',
                direction: 'INPUT',
                gpioPin: gpioPin || null,
                sensorId: sensorId,
                status: 'UNVERIFIED'
            }]);
        }

        setLoading(false);

        if (!error) {
            setOpen(false);
            onAdd();
        } else {
            console.error("Error adding sensor", error);
            alert("Error adding sensor: " + error.message);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Sensor</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Sensor</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Sensor Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rack A Temp" required />
                    </div>

                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TEMPERATURE">Temperature</SelectItem>
                                <SelectItem value="HUMIDITY">Humidity</SelectItem>
                                <SelectItem value="SOIL_MOISTURE">Soil Moisture</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Hardware Controller (ESP32)</Label>
                        <Select value={esp32Id} onValueChange={setEsp32Id}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Device" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">None (Virtual)</SelectItem>
                                {devices.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name} ({d.deviceId})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-400">Must be assigned to the Dryer's ESP32 nodes.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>GPIO Pin</Label>
                        <Input value={gpioPin} onChange={e => setGpioPin(e.target.value)} placeholder="e.g. 4" />
                    </div>

                    <div className="space-y-2">
                        <Label>Device Identifier (Hardware Mapping)</Label>
                        <Input value={deviceId} onChange={e => setDeviceId(e.target.value)} required />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Sensor'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
