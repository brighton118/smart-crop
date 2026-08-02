import { useState } from "react";
import { Plus, Check, ChevronRight, X, Sprout } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../../components/ui/dialog";
import { Button } from "../../../components/ui/button";
import {
    StepDryerInfo,
    StepESP32,
    StepSensors,
    StepEquipment,
    StepReview
} from "./WizardSteps";
import { supabase } from "../../../../lib/supabase";

export type WizardState = {
    name: string;
    location: string;
    chamber: string;
    farmId: string;
    esp32: { id: string; deviceId: string; status: string } | null;
    sensors: Array<{ name: string; type: string; gpioStr: string; pin: number; unit: string }>;
    equipment: Array<{ name: string; type: 'FAN' | 'COOLER'; gpioStr: string; pin: number; relayChannel: number; relayId: string }>;
};

const INITIAL_STATE: WizardState = {
    name: "",
    location: "",
    chamber: "",
    farmId: "1", // Default Mock Farm ID for simplification
    esp32: null,
    sensors: [],
    equipment: []
};

const STEPS = [
    "Dryer Info",
    "Connect ESP32",
    "Add Sensors",
    "Add Equipment",
    "Review & Save"
];

export function AddDryerWizard({ onAdd }: { onAdd: () => void }) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [state, setState] = useState<WizardState>(INITIAL_STATE);

    const updateState = (updates: Partial<WizardState>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    const reset = () => {
        setState(INITIAL_STATE);
        setStep(0);
        setLoading(false);
    };

    const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
    const handleBack = () => setStep(s => Math.max(s - 1, 0));

    const handleFinish = async () => {
        setLoading(true);
        try {
            // 1. Resolve Farm ID
            let resolvedFarmId = state.farmId;
            if (resolvedFarmId === "1") {
                const { data: farms, error: farmErr } = await supabase.from('Farm').select('id').limit(1);
                if (farmErr) throw farmErr;
                if (farms && farms.length > 0) {
                    resolvedFarmId = farms[0].id;
                } else {
                    // Create a default farm if none exists (for dev environments)
                    resolvedFarmId = crypto.randomUUID();
                    const { data: user } = await supabase.auth.getUser();
                    const { error: newFarmErr } = await supabase.from('Farm').insert([{
                        id: resolvedFarmId,
                        name: "Default Farm",
                        userId: user?.user?.id || (await supabase.from('User').select('id').limit(1)).data?.[0]?.id
                    }]);
                    if (newFarmErr) throw newFarmErr;
                }
            }

            // 2. Create Zone (Dryer)
            const zoneId = crypto.randomUUID();
            const { error: zErr } = await supabase.from('Zone').insert([{
                id: zoneId,
                name: state.name,
                location: state.location,
                chamber: state.chamber,
                farmId: resolvedFarmId
            }]);
            if (zErr) throw zErr;

            // 2. Register / Assign ESP32
            let actualDeviceId = state.esp32?.id;
            if (state.esp32 && !state.esp32.id) {
                // It's a new device we are simulating registering right now
                actualDeviceId = crypto.randomUUID();
                await supabase.from('Device').insert([{
                    id: actualDeviceId,
                    deviceId: state.esp32.deviceId,
                    zoneId: zoneId,
                    status: 'ONLINE'
                }]);
            } else if (state.esp32?.id) {
                // Assign existing
                await supabase.from('Device').update({ zoneId }).eq('id', state.esp32.id);
            }

            // 3. Connect Sensors
            if (actualDeviceId && state.sensors.length > 0) {
                for (const s of state.sensors) {
                    const sid = crypto.randomUUID();
                    await supabase.from('Sensor').insert([{
                        id: sid,
                        name: s.name,
                        type: s.type,
                        unit: s.unit,
                        deviceId: actualDeviceId,
                        status: 'ONLINE'
                    }]);

                    await supabase.from('HardwareConnection').insert([{
                        id: crypto.randomUUID(),
                        type: 'INPUT_SENSOR',
                        targetId: sid,
                        targetModel: 'Sensor',
                        deviceId: actualDeviceId,
                        gpioPin: s.pin,
                        config: {},
                        status: 'ACTIVE'
                    }]);
                }
            }

            // 4. Connect Equipment (w/ Relays)
            if (actualDeviceId && state.equipment.length > 0) {
                // Group by relay
                for (const eq of state.equipment) {
                    let eqId = crypto.randomUUID();
                    if (eq.type === 'FAN') {
                        await supabase.from('Fan').insert([{
                            id: eqId, name: eq.name, zoneId, deviceId: actualDeviceId, status: 'OFF', controlMode: 'AUTOMATIC'
                        }]);
                    } else {
                        await supabase.from('Cooler').insert([{
                            id: eqId, name: eq.name, zoneId, deviceId: actualDeviceId, status: 'OFF', controlMode: 'AUTOMATIC'
                        }]);
                    }

                    // check if relay exists in local cache, this is simplified for setup
                    const rId = crypto.randomUUID();
                    await supabase.from('RelayModule').insert([{
                        id: rId,
                        name: `Relay on GPIO ${eq.pin}`,
                        deviceId: actualDeviceId,
                        gpioPin: eq.pin,
                        totalChannels: 4
                    }]);

                    await supabase.from('HardwareConnection').insert([{
                        id: crypto.randomUUID(),
                        type: 'OUTPUT_RELAY',
                        targetId: eqId,
                        targetModel: eq.type === 'FAN' ? 'Fan' : 'Cooler',
                        deviceId: actualDeviceId,
                        relayModuleId: rId,
                        relayChannel: eq.relayChannel,
                        status: 'ACTIVE'
                    }]);
                }
            }

            // Complete
            setOpen(false);
            reset();
            onAdd();
        } catch (err: any) {
            console.error("Hardware Setup Failed:", err);
            alert("Failed to build Dryer: " + err.message);
        }
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) reset();
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                <Button className="bg-primary hover:bg-primary-600 gap-2">
                    <Plus className="w-4 h-4" /> Add Dryer
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-gray-50 flex flex-col max-h-[90vh]">
                <DialogHeader className="px-6 py-4 bg-white border-b sticky top-0 z-10 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <Sprout className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl">Dryer Setup Wizard</DialogTitle>
                            <p className="text-xs text-gray-500 mt-1">Configure complete hardware topology</p>
                        </div>
                    </div>
                </DialogHeader>

                {/* Stepper Header */}
                <div className="px-6 py-4 bg-white border-b flex justify-between items-center overflow-x-auto gap-4">
                    {STEPS.map((label, i) => (
                        <div key={label} className={`flex items-center gap-2 whitespace-nowrap ${i === step ? "text-primary font-medium" : i < step ? "text-green-600" : "text-gray-400"}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${i === step ? "bg-primary text-white border-primary"
                                : i < step ? "bg-green-100 text-green-600 border-green-200"
                                    : "bg-gray-100 text-gray-400 border-gray-200"
                                }`}>
                                {i < step ? <Check className="w-3 h-3" /> : (i + 1)}
                            </div>
                            <span className="text-sm">{label}</span>
                            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 ml-2" />}
                        </div>
                    ))}
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto px-6 py-6 bg-gray-50">
                    {step === 0 && <StepDryerInfo state={state} updateState={updateState} />}
                    {step === 1 && <StepESP32 state={state} updateState={updateState} />}
                    {step === 2 && <StepSensors state={state} updateState={updateState} />}
                    {step === 3 && <StepEquipment state={state} updateState={updateState} />}
                    {step === 4 && <StepReview state={state} />}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t sticky bottom-0 z-10 flex justify-between items-center">
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
                    <div className="flex gap-2">
                        {step > 0 && <Button variant="outline" onClick={handleBack} disabled={loading}>Back</Button>}
                        {step < STEPS.length - 1 ? (
                            <Button onClick={handleNext} className="bg-primary hover:bg-primary-600">
                                Next Step <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        ) : (
                            <Button onClick={handleFinish} disabled={loading} className="bg-green-600 hover:bg-green-700">
                                {loading ? "Building Topology..." : "Finish Dryer Setup"}
                                {!loading && <Check className="w-4 h-4 ml-1" />}
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
