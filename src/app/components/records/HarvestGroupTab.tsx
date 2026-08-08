import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { HarvestTab } from "./HarvestTab";
import { PostHarvestTab } from "./PostHarvestTab";

export function HarvestGroupTab() {
    return (
        <Tabs defaultValue="harvesting" className="w-full">
            <div className="flex items-center justify-between mb-4 mt-2">
                <TabsList className="bg-gray-100/80 p-1 border">
                    <TabsTrigger value="harvesting" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Harvesting</TabsTrigger>
                    <TabsTrigger value="postharvest" className="data-[state=active]:bg-white data-[state=active]:shadow-sm text-blue-600">Post-Harvest</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="harvesting" className="mt-0 outline-none">
                <HarvestTab />
            </TabsContent>

            <TabsContent value="postharvest" className="mt-0 outline-none">
                <PostHarvestTab />
            </TabsContent>
        </Tabs>
    );
}
