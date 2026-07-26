import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "../../../components/ui/card";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { Save, Settings2 } from "lucide-react";

export function AutomationTab({ dryer }: { dryer: any }) {
    const threshold = dryer.envThreshold?.[0];

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border">
                <div>
                    <h3 className="font-medium text-gray-900">Environmental Automation Rules</h3>
                    <p className="text-sm text-gray-500">Define the target climate parameters for this dryer. Fans and coolers running in AUTOMATIC mode will refer to these thresholds.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5 text-gray-500" />
                        Global Climate Targets
                    </CardTitle>
                    <CardDescription>
                        These values represent the acceptable operating bounds. If the environment strays outside, automated equipment will activate.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        <div className="space-y-4">
                            <h4 className="font-medium flex items-center gap-2 border-b pb-2"><Settings2 className="w-4 h-4 text-orange-500" /> Temperature (°C)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Minimum Temp</Label>
                                    <Input type="number" defaultValue={threshold?.minTemp || 18} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Maximum Temp</Label>
                                    <Input type="number" defaultValue={threshold?.maxTemp || 24} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-medium flex items-center gap-2 border-b pb-2"><Settings2 className="w-4 h-4 text-blue-500" /> Relative Humidity (%)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Minimum Humidity</Label>
                                    <Input type="number" defaultValue={threshold?.minHum || 45} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Maximum Humidity</Label>
                                    <Input type="number" defaultValue={threshold?.maxHum || 55} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="font-medium flex items-center gap-2 border-b pb-2"><Settings2 className="w-4 h-4 text-yellow-500" /> Wood Moisture (%)</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Target Moisture Limit</Label>
                                    <Input type="number" defaultValue={threshold?.maxMoist || 11} />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="bg-gray-50/50 border-t justify-end p-4">
                    <Button className="bg-primary hover:bg-primary-600">
                        <Save className="w-4 h-4 mr-2" />
                        Save Automation Rules
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
