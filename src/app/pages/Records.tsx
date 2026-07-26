import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { PlantingTab } from "../components/records/PlantingTab";
import { CultivationTab } from "../components/records/CultivationTab";
import { HarvestTab } from "../components/records/HarvestTab";
import { PostHarvestTab } from "../components/records/PostHarvestTab";
import { ClipboardList, Sprout, Scissors, PackageCheck } from "lucide-react";

export function Records() {
  const [activeTab, setActiveTab] = useState("planting");

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Crop Lifecycle Records</h1>
          <p className="text-gray-500 max-w-2xl text-lg">
            Manage your cultivation batches through every stage of their lifecycle.
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto gap-2 bg-transparent p-0 mb-6">
            <TabsTrigger
              value="planting"
              className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white hover:bg-gray-50 py-3 flex items-center justify-center gap-2 rounded-lg transition-all"
            >
              <Sprout className="w-4 h-4" />
              Planting & Batches
            </TabsTrigger>
            <TabsTrigger
              value="cultivation"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white hover:bg-gray-50 py-3 flex items-center justify-center gap-2 rounded-lg transition-all"
            >
              <ClipboardList className="w-4 h-4" />
              Cultivation Logs
            </TabsTrigger>
            <TabsTrigger
              value="harvest"
              className="data-[state=active]:bg-orange-600 data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white hover:bg-gray-50 py-3 flex items-center justify-center gap-2 rounded-lg transition-all"
            >
              <Scissors className="w-4 h-4" />
              Harvesting
            </TabsTrigger>
            <TabsTrigger
              value="postharvest"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md border border-gray-200 bg-white hover:bg-gray-50 py-3 flex items-center justify-center gap-2 rounded-lg transition-all"
            >
              <PackageCheck className="w-4 h-4" />
              Post-Harvest
            </TabsTrigger>
          </TabsList>

          <TabsContent value="planting" className="mt-0 outline-none">
            <PlantingTab />
          </TabsContent>
          <TabsContent value="cultivation" className="mt-0 outline-none">
            <CultivationTab />
          </TabsContent>
          <TabsContent value="harvest" className="mt-0 outline-none">
            <HarvestTab />
          </TabsContent>
          <TabsContent value="postharvest" className="mt-0 outline-none">
            <PostHarvestTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
