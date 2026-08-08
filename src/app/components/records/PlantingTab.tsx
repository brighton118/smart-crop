import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { CloningRecords } from "./CloningRecords";
import { TransplantingRecords } from "./TransplantingRecords";
import { Trees, Sprout } from "lucide-react";

export function PlantingTab() {
    return (
        <Tabs defaultValue="cloning" className="w-full">
            <div className="flex items-center justify-start mb-6">
                <TabsList className="bg-white/95 backdrop-blur-md p-1.5 border border-gray-100 shadow-sm rounded-xl h-auto flex gap-1">
                    <TabsTrigger
                        value="cloning"
                        className="data-[state=active]:border-b-[3px] data-[state=active]:border-[#0fa968] data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:text-slate-800 bg-transparent text-[#0fa968] px-5 py-2.5 font-bold flex items-center gap-2 hover:bg-gray-50/50 transition-colors"
                    >
                        <Sprout className="w-4 h-4" />
                        Cloning
                    </TabsTrigger>
                    <TabsTrigger
                        value="planting-records"
                        className="data-[state=active]:border-b-[3px] data-[state=active]:border-[#0fa968] data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:text-slate-800 bg-transparent text-[#0fa968] px-5 py-2.5 font-bold flex items-center gap-2 hover:bg-gray-50/50 transition-colors"
                    >
                        <Trees className="w-4 h-4" />
                        Transplanting
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="cloning" className="mt-0 outline-none">
                <CloningRecords />
            </TabsContent>

            <TabsContent value="planting-records" className="mt-0 outline-none">
                <TransplantingRecords />
            </TabsContent>
        </Tabs>
    );
}
