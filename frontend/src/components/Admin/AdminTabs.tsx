export const AdminTabs = ({ activeTab, setActiveTab }: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) => {
  const tabs = ["Dashboard", "Teachers", "Student Profiles", "Upload Logs"];

  return (
    <div className="flex space-x-4 border-b mb-6">
      {tabs.map((tab) => (
        <button
          key={tab}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === tab
              ? "border-b-2 border-indigo-600 text-indigo-600"
              : "text-gray-500 hover:text-indigo-500"
          }`}
          onClick={() => setActiveTab(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};
