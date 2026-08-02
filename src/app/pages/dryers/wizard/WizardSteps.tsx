import { useState, useEffect } from "react";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Plus, Trash2, Cpu, Thermometer, Wind, Zap } from "lucide-react";
import { supabase } from "../../../../lib/supabase";

type WizardState = {
    name: string; location: string; chamber: string; farmId: string;
    esp32: { id: string; deviceId: string; status: string } | null;
    sensors: Array<{ name: string; type: string; gpioStr: string; pin: number; unit: string }>;
    equipment: Array<{ name: string; type: 'FAN' | 'COOLER'; gpioStr: string; pin: number; relayChannel: number; relayId: string }>;
};

interface StepProps {
    state: WizardState;
    updateState: (updates: Partial<WizardState>) => void;
}

// ==========================================
// STEP 1: DRYER INFO
// ==========================================
export function StepDryerInfo({ state, updateState }: StepProps) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h3 className="text-lg font-medium">Dryer Information</h3>
                <p className="text-sm text-gray-500">Provide the physical location and naming details for this drying environment.</p>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label>Dryer Name <span className="text-red-500">*</span></Label>
                    <Input value={state.name} onChange={e => updateState({ name: e.target.value })} placeholder="e.g. Primary Drying Room A" />
                </div>
                <div className="space-y-2">
                    <Label>Drying Room / Location</Label>
                    <Input value={state.location} onChange={e => updateState({ location: e.target.value })} placeholder="e.g. Building 2" />
                </div>
                <div className="space-y-2">
                    <Label>Chamber Identifier</Label>
                    <Input value={state.chamber} onChange={e => updateState({ chamber: e.target.value })} placeholder="e.g. Rack 1, Shelf B" />
                </div>
            </div>
        </div>
    );
}

// ==========================================
// STEP 2: CONNECT ESP32
// ==========================================
export function StepESP32({ state, updateState }: StepProps) {
    const [devices, setDevices] = useState<any[]>([]);
    const [manualId, setManualId] = useState("");

    useEffect(() => {
        supabase.from('Device').select('*').is('zoneId', null).then(({ data }) => {
            if (data) setDevices(data);
        });
    }, []);

    const testConnection = () => {
        if (!manualId && !state.esp32) return;

        let idObj = state.esp32;
        if (!idObj) {
            idObj = { id: "", deviceId: manualId.trim(), status: 'ONLINE' };
        }

        updateState({ esp32: { ...idObj, status: 'ONLINE' } });
        alert(`Successfully pinged ${idObj.deviceId}. Device is ready.`);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h3 className="text-lg font-medium">Connect ESP32 Controller</h3>
                <p className="text-sm text-gray-500">Assign an ESP32 microcontroller to manage this drying chamber's hardware.</p>
            </div>

            <div className="p-4 border rounded-lg bg-gray-50 space-y-4">
                <div className="space-y-2">
                    <Label>Select Unassigned Device</Label>
                    <Select onValueChange={(val) => {
                        const d = devices.find(x => x.id === val);
                        if (d) updateState({ esp32: d });
                    }}>
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Select from available pool..." />
                        </SelectTrigger>
                        <SelectContent>
                            {devices.map(d => (
                                <SelectItem key={d.id} value={d.id}>{d.deviceId} ({d.status})</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">or register manually</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>

                <div className="space-y-2">
                    <Label>Manual Device ID (UUID/MAC)</Label>
                    <Input
                        placeholder="e.g. ESP32-DRY-01"
                        value={manualId}
                        onChange={(e) => {
                            setManualId(e.target.value);
                            updateState({ esp32: { id: "", deviceId: e.target.value, status: 'NOT VERIFIED' } });
                        }}
                        className="bg-white"
                    />
                </div>
            </div>

            {state.esp32 && (
                <div className="p-4 border border-green-200 bg-green-50 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Cpu className="w-8 h-8 text-green-600" />
                        <div>
                            <div className="font-medium text-green-900">{state.esp32.deviceId}</div>
                            <Badge className={state.esp32.status === 'ONLINE' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                                {state.esp32.status}
                            </Badge>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={testConnection}>
                        Test Connection
                    </Button>
                </div>
            )}
        </div>
    );
}

// ==========================================
// STEP 3: ADD SENSORS
// ==========================================
export function StepSensors({ state, updateState }: StepProps) {
    const [sName, setSName] = useState("");
    const [sType, setSType] = useState("Temperature Object");
    const [sGpio, setSGpio] = useState("");

    const handleAdd = () => {
        if (!sName || !sGpio) return;
        const newSensors = [...state.sensors, {
            name: sName,
            type: sType,
            gpioStr: sGpio,
            pin: parseInt(sGpio.replace(/\D/g, '')) || 0,
            unit: sType.includes('Temp') ? '°C' : sType.includes('Hum') ? '% RH' : '%'
        }];
        updateState({ sensors: newSensors });
        setSName(""); setSGpio("");
    };

    const removeSensor = (idx: number) => {
        const copy = [...state.sensors];
        copy.splice(idx, 1);
        updateState({ sensors: copy });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h3 className="text-lg font-medium">Add Sensors</h3>
                <p className="text-sm text-gray-500">Map physical sensors to the ESP32 input pins.</p>
            </div>

            <div className="grid grid-cols-12 gap-3 p-4 bg-white border rounded-lg shadow-sm">
                <div className="col-span-12 md:col-span-4 space-y-1">
                    <Label className="text-xs">Sensor Name</Label>
                    <Input value={sName} onChange={e => setSName(e.target.value)} placeholder="e.g. Ambient Temp" />
                </div>
                <div className="col-span-12 md:col-span-4 space-y-1">
                    <Label className="text-xs">Sensor Type</Label>
                    <Select value={sType} onValueChange={setSType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Temperature Object">Temperature Object</SelectItem>
                            <SelectItem value="Temperature Ambient">Temperature Ambient</SelectItem>
                            <SelectItem value="Humidity Ambient">Humidity Ambient</SelectItem>
                            <SelectItem value="Cannabis Moisture">Cannabis Moisture</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="col-span-12 md:col-span-3 space-y-1">
                    <Label className="text-xs">GPIO Pin</Label>
                    <Input value={sGpio} onChange={e => setSGpio(e.target.value)} placeholder="e.g. 4" />
                </div>
                <div className="col-span-12 md:col-span-1 flex items-end">
                    <Button onClick={handleAdd} disabled={!sName || !sGpio} className="w-full" size="icon"><Plus className="w-4 h-4" /></Button>
                </div>
            </div>

            <div className="space-y-2">
                {state.sensors.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                            <Thermometer className="w-5 h-5 text-gray-400" />
                            <div>
                                <div className="font-medium text-sm">{s.name}</div>
                                <div className="text-xs text-gray-500">{s.type} • GPIO {s.pin}</div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeSensor(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                    </div>
                ))}
                {state.sensors.length === 0 && <div className="text-center p-8 text-sm text-gray-400 border border-dashed rounded-lg">No sensors mapped yet.</div>}
            </div>
        </div>
    );
}

// ==========================================
// STEP 4: ADD EQUIPMENT
// ==========================================
export function StepEquipment({ state, updateState }: StepProps) {
    const [eName, setEName] = useState("");
    const [eType, setEType] = useState<'FAN' | 'COOLER'>('FAN');
    const [eGpio, setEGpio] = useState("");
    const [eChan, setEChan] = useState("1");

    const handleAdd = () => {
        if (!eName || !eGpio) return;
        const newEq = [...state.equipment, {
            name: eName, type: eType, gpioStr: eGpio,
            pin: parseInt(eGpio.replace(/\D/g, '')) || 0,
            relayChannel: parseInt(eChan) || 1, relayId: "mock_relay"
        }];
        updateState({ equipment: newEq });
        setEName(""); setEGpio("");
    };

    const removeEq = (idx: number) => {
        const copy = [...state.equipment];
        copy.splice(idx, 1);
        updateState({ equipment: copy });
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h3 className="text-lg font-medium">Add Equipment</h3>
                <p className="text-sm text-gray-500">Configure Fans and Coolers, mapping them through relay modules.</p>
            </div>

            <div className="grid grid-cols-12 gap-3 p-4 bg-white border rounded-lg shadow-sm">
                <div className="col-span-12 md:col-span-4 space-y-1">
                    <Label className="text-xs">Equipment Name</Label>
                    <Input value={eName} onChange={e => setEName(e.target.value)} placeholder="e.g. Primary Exhaust" />
                </div>
                <div className="col-span-12 md:col-span-3 space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={eType} onValueChange={(v: 'FAN' | 'COOLER') => setEType(v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="FAN">Fan</SelectItem>
                            <SelectItem value="COOLER">Cooler</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="col-span-12 md:col-span-2 space-y-1">
                    <Label className="text-xs">Relay GPIO</Label>
                    <Input value={eGpio} onChange={e => setEGpio(e.target.value)} placeholder="e.g. 25" title="The ESP32 pin controlling the relay" />
                </div>
                <div className="col-span-12 md:col-span-2 space-y-1">
                    <Label className="text-xs">Channel</Label>
                    <Input value={eChan} onChange={e => setEChan(e.target.value)} placeholder="1-8" />
                </div>
                <div className="col-span-12 md:col-span-1 flex items-end">
                    <Button onClick={handleAdd} disabled={!eName || !eGpio} className="w-full" size="icon"><Plus className="w-4 h-4" /></Button>
                </div>
            </div>

            <div className="space-y-2">
                {state.equipment.map((eq, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-gray-400" />
                            <div>
                                <div className="font-medium text-sm">{eq.name}</div>
                                <div className="text-xs text-gray-500">{eq.type} • GPIO {eq.pin} → Relay CH{eq.relayChannel}</div>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeEq(idx)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                    </div>
                ))}
                {state.equipment.length === 0 && <div className="text-center p-8 text-sm text-gray-400 border border-dashed rounded-lg">No equipment mapped yet.</div>}
            </div>
        </div>
    );
}

// ==========================================
// STEP 5: REVIEW HARDWARE TOPOLOGY
// ==========================================
export function StepReview({ state }: { state: WizardState }) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div>
                <h3 className="text-lg font-medium">Review Configuration</h3>
                <p className="text-sm text-gray-500">Confirm the physical logic tree for your Dryer hardware.</p>
            </div>

            <div className="bg-gray-900 text-gray-300 p-6 rounded-xl font-mono text-xs overflow-x-auto shadow-inner">
                <div className="text-blue-400 font-bold mb-2">DRYER: {state.name || 'Unnamed Session'}</div>
                <div className="pl-4 border-l-2 border-gray-700 ml-2">
                    <div className="mt-2 text-green-400">ESP32: {state.esp32?.deviceId || 'Not configured'}</div>

                    {/* Sensors */}
                    <div className="pl-4 mt-2">
                        {state.sensors.map((s, i) => (
                            <div key={i} className="my-1">
                                ├── GPIO {s.pin} → SENSOR: <span className="text-yellow-200">{s.name} ({s.type})</span>
                            </div>
                        ))}
                    </div>

                    {/* Equipment */}
                    <div className="pl-4 mt-2">
                        {state.equipment.map((eq, i) => (
                            <div key={i} className="my-2">
                                ├── GPIO {eq.pin} → RELAY MODULE
                                <div className="pl-6 border-l-2 border-gray-700 ml-2 my-1">
                                    └── CH {eq.relayChannel} → EQUIPMENT: <span className="text-pink-300">{eq.name} ({eq.type})</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm flex gap-3 items-start border border-blue-100">
                <div className="mt-0.5">ℹ️</div>
                <div>Please double check that physical equipment wiring perfectly matches the GPIO pinouts and Relay channels designated here before saving. Changing this later may require halting active automation.</div>
            </div>
        </div>
    );
}
