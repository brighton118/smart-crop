import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { SeedRecords } from "./SeedRecords";
import { CloningRecords } from "./CloningRecords";
import { TransplantingRecords } from "./TransplantingRecords";
import { Trees, Sprout, Flower2 } from "lucide-react";

export function PlantingTab() {
    return (
        <div className="space-y-10">
            <Tabs defaultValue="seeds" className="w-full">
                <div className="flex items-center justify-start mb-6">
                    <TabsList className="bg-white/95 backdrop-blur-md p-1.5 border border-gray-100 shadow-sm rounded-xl h-auto flex flex-wrap gap-1">
                        <TabsTrigger
                            value="seeds"
                            className="data-[state=active]:border-b-[3px] data-[state=active]:border-[#0fa968] data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:text-slate-800 bg-transparent text-[#0fa968] px-5 py-2.5 font-bold flex items-center gap-2 hover:bg-gray-50/50 transition-colors"
                        >
                            <Flower2 className="w-4 h-4" />
                            1. Seeds
                        </TabsTrigger>
                        <TabsTrigger
                            value="clones"
                            className="data-[state=active]:border-b-[3px] data-[state=active]:border-[#0fa968] data-[state=active]:rounded-none data-[state=active]:shadow-none data-[state=active]:text-slate-800 bg-transparent text-[#0fa968] px-5 py-2.5 font-bold flex items-center gap-2 hover:bg-gray-50/50 transition-colors"
                        >
                            <Sprout className="w-4 h-4" />
                            2. Clones
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="seeds" className="mt-0 outline-none space-y-10">
                    <SeedRecords />
                </TabsContent>

                <TabsContent value="clones" className="mt-0 outline-none space-y-10">
                    <CloningRecords />
                </TabsContent>
            </Tabs>

            {/* Transplanting section directly under Seeds and Clones */}
            <div className="pt-6 border-t border-gray-200/80 space-y-4">
                <div className="flex items-center gap-2">
                    <Trees className="w-5 h-5 text-[#0fa968]" />
                    <h2 className="text-xl font-bold text-slate-800">Transplanting</h2>
                </div>
                <TransplantingRecords />
            </div>
        </div>
    );
}
