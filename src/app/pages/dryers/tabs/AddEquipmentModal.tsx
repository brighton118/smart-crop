import { useState, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Plus } from "lucide-react";

export function AddEquipmentModal({ zoneId, onAdd }: { zoneId: string, onAdd: () => void }) {
    const [open, setOpen] = useState(false);
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [name, setName] = useState("");
    const [type, setType] = useState("FAN");
    const [esp32Id, setEsp32Id] = useState("");
    const [relayChannel, setRelayChannel] = useState("1");
    const [deviceId, setDeviceId] = useState(`EQ-${Math.floor(Math.random() * 10000)}`);

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

        const equipmentId = crypto.randomUUID();
        const newEquipment = {
            id: equipmentId,
            name,
            zoneId,
            esp32Id: esp32Id && esp32Id !== 'none' ? esp32Id : null,
            relayChannel: parseInt(relayChannel, 10),
            deviceId,
            controlMode: 'AUTOMATIC',
            status: 'OFF'
        };

        const table = type === 'FAN' ? 'Fan' : 'Cooler';
        const { error } = await supabase.from(table).insert([newEquipment]);

        if (!error && esp32Id && esp32Id !== 'none') {
            await supabase.from('HardwareConnection').insert([{
                id: crypto.randomUUID(),
                zoneId,
                deviceId: esp32Id,
                type: 'EQUIPMENT',
                direction: 'OUTPUT',
                relayChannel: parseInt(relayChannel, 10),
                fanId: type === 'FAN' ? equipmentId : null,
                coolerId: type === 'COOLER' ? equipmentId : null,
                status: 'UNVERIFIED'
            }]);
        }

        setLoading(false);

        if (!error) {
            setOpen(false);
            onAdd();
        } else {
            console.error("Error adding equipment", error);
            alert("Error adding equipment: " + error.message);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2"><Plus className="w-4 h-4" /> Add Equipment</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Equipment</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label>Equipment Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Intake Fan A" required />
                    </div>

                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FAN">Fan</SelectItem>
                                <SelectItem value="COOLER">Cooler</SelectItem>
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
                    </div>

                    <div className="space-y-2">
                        <Label>Relay Channel</Label>
                        <Input type="number" min="1" max="16" value={relayChannel} onChange={e => setRelayChannel(e.target.value)} required />
                    </div>

                    <div className="space-y-2">
                        <Label>Device Identifier (Hardware Mapping)</Label>
                        <Input value={deviceId} onChange={e => setDeviceId(e.target.value)} required />
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Equipment'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
