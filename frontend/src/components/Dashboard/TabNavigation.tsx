type Tab = {
id: string;
label: string;
};
const tabs: Tab[] = [
{
id: "overview",
label: "Overview",
},
{
id: "cluster",
label: "Trait Clusters"
},
{
id: "students",
label: "Student List",
},
{
id: "report",
label: "Insights & Recommendations",
},
];
export const TabNavigation = ({
activeTab,
setActiveTab,
}: {
activeTab: string;
setActiveTab: (tab: string) => void;
}) => {
return (
<div className="border-b border-gray-700">
    <nav className="flex gap-x-8 pl-4">
        {tabs.map((tab) => (
        <button key={tab.id} onClick={()=> setActiveTab(tab.id)}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200
            ${
            activeTab === tab.id
            ? "border-blue-500 text-blue-400"
            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600"
            }`}
            >
            {tab.label}
        </button>
        ))}
    </nav>
</div>
);
};
