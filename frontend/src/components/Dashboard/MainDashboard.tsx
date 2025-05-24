import { useState, useEffect } from "react";
import { TabNavigation } from "./TabNavigation";
import { Download, Printer, Brain } from "lucide-react";
import { Overview } from "./Overview";
import { StudentList } from "./StudentList";
import TraitCluster from "./TraitCluster";
import { InsightsTab } from "./InsightsTab";

export const MainDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [userName, setUserName] = useState("");
  const [activeSubject] = useState("All");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setUserName(data.name);
          setUser(data);
        }
      } catch (err) {
        console.error("Failed to fetch user:", err);
      }
    };

    fetchUser();
  }, []);

  // Subject Filter
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [subjects, setSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/teacher/subjects`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSubjects(["All", ...data]);
        }
      });
  }, []);

  return (
    <main
      className="flex-1 min-h-screen relative w-full"
      style={{
        background:
          "linear-gradient(135deg, rgba(17, 24, 39, 1) 0%, rgba(29, 35, 64, 1) 100%)",
      }}
    >
      <div
        className="absolute inset-0 z-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234A5568' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative z-10 p-4 lg:p-8">
        <div className="mb-8 lg:mb-12">
          <div className="flex items-center space-x-3 mb-6 mt-12 lg:mt-0">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Brain className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
              InsightEd
            </h1>
          </div>
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start space-y-4 lg:space-y-0">
            <div>
              <h1 className="text-xl font-semibold text-white mb-4">
                Welcome, {userName || "Loading..."} 👋
              </h1>

              <h2 className="text-lg lg:text-xl text-gray-100">
                Student Personality Insights
              </h2>
              <div className="mt-2 text-sm text-gray-400">
                <p>Empowering educators with personality-based insights to personalize teaching strategies. This platform analyzes student assessment data using the Big Five Personality Model, identifies dominant traits, and provides AI-generated recommendations to support effective and empathetic classroom management.</p>
              </div>
            </div>
            <div className="flex flex-col lg:items-end space-y-3 w-full lg:w-auto">
              {/* Row 1: Buttons */}
              <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-3 sm:space-y-0 w-full sm:w-auto">
                <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-200 bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </button>
                <button className="inline-flex items-center justify-center px-4 py-2 border border-gray-600 rounded-md text-sm font-medium text-gray-200 bg-gray-800/50 hover:bg-gray-700/50 transition-colors">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Summary
                </button>
              </div>

              {/*Subject Dropdown */}
              <div className="w-full flex justify-end">
                <select
                  id="subject"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full sm:w-48 h-[40px] px-4 text-sm rounded-md bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {subjects.map((subj, i) => (
                    <option key={i} value={subj}>
                      {subj}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
s
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
          <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
          <div className="p-6">
            {activeTab === "overview" && (
              <Overview selectedSubject={selectedSubject} />
            )}
            {activeTab === "students" && (
              <StudentList selectedSubject={selectedSubject} />
            )}
            {activeTab === "report" && user && (
              <InsightsTab user={user} activeSubject={activeSubject} />
            )}
            {activeTab === "cluster" && (
              <TraitCluster selectedSubject={selectedSubject} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
