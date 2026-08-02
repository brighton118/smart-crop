import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase, DbZone, DbSensor, DbFan, DbCooler, DbDevice, DbEnvironmentalThreshold } from '../supabase';

// Visual state extension
export interface SimulationSensor extends DbSensor {
    currentTemp: number;
    currentHum: number;
    currentMoist: number;
}

interface AutomationContextType {
    nodes: SimulationSensor[];
    chartData: { time: string; temp: number; humidity: number; moisture: number }[];
    isStreaming: boolean;
    setIsStreaming: (s: boolean) => void;
}

const AutomationContext = createContext<AutomationContextType | undefined>(undefined);

export function useAutomation() {
    const context = useContext(AutomationContext);
    if (!context) throw new Error("useAutomation must be used within AutomationProvider");
    return context;
}

function randomBetween(min: number, max: number) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(1));
}

export function AutomationProvider({ children }: { children: React.ReactNode }) {
    const [zones, setZones] = useState<DbZone[]>([]);
    const [fans, setFans] = useState<DbFan[]>([]);
    const [coolers, setCoolers] = useState<DbCooler[]>([]);
    const [thresholds, setThresholds] = useState<DbEnvironmentalThreshold[]>([]);
    const [connections, setConnections] = useState<any[]>([]);
    const [relayModules, setRelayModules] = useState<any[]>([]);

    const [nodes, setNodes] = useState<SimulationSensor[]>([]);
    const [chartData, setChartData] = useState<{ time: string; temp: number; humidity: number; moisture: number }[]>([]);

    const [isStreaming, setIsStreaming] = useState(true);
    const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Initial load
    useEffect(() => {
        loadBaseData();
    }, []);

    async function loadBaseData() {
        const [z, f, c, s, t, hc, rm] = await Promise.all([
            supabase.from('Zone').select('*'),
            supabase.from('Fan').select('*'),
            supabase.from('Cooler').select('*'),
            supabase.from('Sensor').select('*'),
            supabase.from('EnvironmentalThreshold').select('*'),
            supabase.from('HardwareConnection').select('*'),
            supabase.from('RelayModule').select('*')
        ]);

        if (z.data) setZones(z.data);
        if (f.data) setFans(f.data);
        if (c.data) setCoolers(c.data);
        if (t.data) setThresholds(t.data);
        if (hc.data) setConnections(hc.data);
        if (rm.data) setRelayModules(rm.data);
        if (s.data) {
            setNodes(s.data.map(snsr => ({
                ...snsr,
                currentTemp: randomBetween(20, 24),
                currentHum: randomBetween(54, 62),
                currentMoist: randomBetween(11, 14)
            })));
        }

        // Initialize mock chart
        const history = Array.from({ length: 20 }).map((_, i) => {
            const now = new Date();
            now.setMinutes(now.getMinutes() - (20 - i));
            return {
                time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                temp: randomBetween(20, 24),
                humidity: randomBetween(54, 62),
                moisture: randomBetween(11, 14)
            }
        });
        setChartData(history);
    }

    // Subscriptions to keep array synchronized with DB (important since we will push triggers)
    useEffect(() => {
        const sub = supabase.channel('auto_engine')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Fan' }, loadBaseData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Cooler' }, loadBaseData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Sensor' }, loadBaseData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Device' }, loadBaseData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'EnvironmentalThreshold' }, loadBaseData)
            .subscribe();

        return () => {
            supabase.removeChannel(sub);
        }
    }, []);

    // Main Engine Loop
    useEffect(() => {
        if (!isStreaming) {
            if (tickRef.current) clearInterval(tickRef.current);
            return;
        }

        tickRef.current = setInterval(() => {
            setNodes((prevNodes) => {
                let totalTemp = 0;
                let totalHum = 0;
                let totalMoist = 0;
                let activeSensors = 0;

                const nextNodes = prevNodes.map((n) => {
                    if (!n.enabled || n.status === "OFFLINE") return n;
                    // drift values
                    const temp = parseFloat(Math.min(30, Math.max(10, n.currentTemp + randomBetween(-0.5, 0.5))).toFixed(1));
                    const hum = parseFloat(Math.min(90, Math.max(30, n.currentHum + randomBetween(-1.5, 1.5))).toFixed(1));
                    const moist = parseFloat(Math.min(30, Math.max(5, n.currentMoist + randomBetween(-0.3, 0.3))).toFixed(1));

                    totalTemp += temp;
                    totalHum += hum;
                    totalMoist += moist;
                    activeSensors++;

                    return { ...n, currentTemp: temp, currentHum: hum, currentMoist: moist };
                });

                if (activeSensors > 0) {
                    const avgTemp = totalTemp / activeSensors;
                    const avgHum = totalHum / activeSensors;
                    const avgMoist = totalMoist / activeSensors;

                    // Expand Chart Data
                    setChartData((prev) => {
                        const next = [...prev, {
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            temp: parseFloat(avgTemp.toFixed(1)),
                            humidity: parseFloat(avgHum.toFixed(1)),
                            moisture: parseFloat(avgMoist.toFixed(1))
                        }];
                        return next.slice(-20);
                    });

                    // Evaluate rules for AUTOMATIC mode equipment
                    zones.forEach(z => {
                        const t = thresholds.find(thr => thr.zoneId === z.id);
                        if (!t) return;

                        // Identify relevant ESP32 devices for this zone
                        const zFans = fans.filter(f => f.zoneId === z.id && f.mode === 'AUTOMATIC');
                        zFans.forEach(f => {
                            if (avgHum > t.humidityMax && f.status === 'OFF') {
                                // Threshold breached, fan is OFF, turn it ON
                                processCommand(f, 'Fan', 'ON', 'Humidity exceeded maximum threshold.');
                            } else if (avgHum <= t.humidityTarget && f.status === 'ON') {
                                // Humidity restored, fan is ON, turn it OFF
                                processCommand(f, 'Fan', 'OFF', 'Humidity returned to target range.');
                            }
                        });

                        const zCoolers = coolers.filter(c => c.zoneId === z.id && c.mode === 'AUTOMATIC');
                        zCoolers.forEach(c => {
                            if (avgTemp > t.tempMax && c.status === 'OFF') {
                                processCommand(c, 'Cooler', 'ON', 'Temperature exceeded maximum threshold.');
                            } else if (avgTemp <= t.tempTarget && c.status === 'ON') {
                                processCommand(c, 'Cooler', 'OFF', 'Temperature reached optimal target.');
                            }
                        });
                    });
                }

                return nextNodes;
            });

        }, 4000); // Heartbeat every 4s

        return () => {
            if (tickRef.current) clearInterval(tickRef.current);
        }

    }, [isStreaming, zones, thresholds, fans, coolers]);

    const processCommand = async (equipment: any, type: 'Fan' | 'Cooler', commandState: 'ON' | 'OFF', reason: string) => {
        // Step 1: Resolve the Real Hardware Topology path (Command Validation)
        const eqKey = type === 'Fan' ? 'fanId' : 'coolerId';
        const connection = connections.find(c => c[eqKey] === equipment.id);

        if (!connection) {
            console.error(`[TOPOLOGY REJECTED] Cannot execute command: No Physical HardwareConnection mapping found for ${type} ${equipment.name}. Attach it via Hardware Map first.`);
            return;
        }

        const resolvedESP32 = connection.deviceId;
        const resolvedRelay = connection.relayModuleId;
        const resolvedRelayName = resolvedRelay ? relayModules.find(r => r.id === resolvedRelay)?.name : 'Onboard Relay';

        console.log(`[TOPOLOGY TRACE SUCCESS] Validated command path: DRYER (${equipment.zoneId}) -> ESP32 (${resolvedESP32}) -> RELAY (${resolvedRelayName} CH ${connection.relayChannel}) -> ${type.toUpperCase()} (${equipment.name})`);

        // Step 2: Simulate Command Send to ESP32 Mapping (Wait Random MS)
        setTimeout(async () => {
            // Step 3: Command Acknowledged, update DB
            if (type === 'Fan') {
                await supabase.from('Fan').update({ status: commandState }).eq('id', equipment.id);
            } else {
                await supabase.from('Cooler').update({ status: commandState }).eq('id', equipment.id);
            }

            // Step 4: Create Log Event
            await supabase.from('EquipmentEvent').insert({
                fanId: type === 'Fan' ? equipment.id : null,
                coolerId: type === 'Cooler' ? equipment.id : null,
                previousState: commandState === 'ON' ? 'OFF' : 'ON',
                newState: commandState,
                triggerReason: reason
            });

        }, 500); // 500ms network round-trip simulation
    };

    return (
        <AutomationContext.Provider value={{ nodes, chartData, isStreaming, setIsStreaming }}>
            {children}
        </AutomationContext.Provider>
    );
}
