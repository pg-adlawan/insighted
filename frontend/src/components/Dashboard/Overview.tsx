import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Users, Brain, Clock, TrendingUp } from "lucide-react";
import { StudentProfileModal } from "./StudentProfileModal";

interface TraitDistribution {
  trait: string;
  score: number;
}

interface StudentData {
  id: string;
  name: string;
  dominantTrait: string;
  score: number;
}

interface DashboardStats {
  total_students: number;
  distinct_traits: number;
  most_common_trait: string;
  last_upload: string;
}

export const Overview = ({
  selectedSubject,
}: {
  selectedSubject: string;
}) => {
  const [dominantTraitData, setDominantTraitData] = useState<
    { trait: string; count: number }[]
  >([]);
  const COLORS = ["#FF6B6B", "#4ECDC4", "#FFD93D", "#95D5B2", "#8B5CF6"];
  const [traitAverages, setTraitAverages] = useState<TraitDistribution[]>([]);
  const [, setLoadingAverages] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(
    null
  );
  const [stats, setStats] = useState<DashboardStats>({
    total_students: 0,
    distinct_traits: 0,
    most_common_trait: "N/A",
    last_upload: "N/A",
  });
  const [aiRec, setAiRec] = useState<{
    student: string;
    teacher: string;
  } | null>(null);
  const [loadingAI, setLoadingAI] = useState(true);

  // Fetch Trait Averages
  useEffect(() => {
    const fetchTraitAverages = async () => {
      setLoadingAverages(true);
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/assess/ocean-averages${
            selectedSubject && selectedSubject !== "All"
              ? `?subject=${encodeURIComponent(selectedSubject)}`
              : ""
          }`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await response.json();
        setTraitAverages(data);
      } catch (err) {
        console.error("Failed to fetch trait averages:", err);
      } finally {
        setLoadingAverages(false);
      }
    };

    fetchTraitAverages();
  }, [selectedSubject]);

  // Fetch Stats
  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(
      `${import.meta.env.VITE_API_URL}/dashboard/stats${
        selectedSubject && selectedSubject !== "All"
          ? `?subject=${encodeURIComponent(selectedSubject)}`
          : ""
      }`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then((res) => res.json())
      .then((data) => setStats(data))
      .catch((err) => console.error("Failed to fetch dashboard stats:", err));
  }, [selectedSubject]);

  // Fetch Dominant Trait Distribution
  useEffect(() => {
    const fetchDominantTraits = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/assess/dominant-distribution${
            selectedSubject && selectedSubject !== "All"
              ? `?subject=${encodeURIComponent(selectedSubject)}`
              : ""
          }`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await response.json();
        setDominantTraitData(data);
      } catch (err) {
        console.error("Failed to fetch dominant traits:", err);
      }
    };

    fetchDominantTraits();
  }, [selectedSubject]);

  // Fetch AI Recommendation
  useEffect(() => {
    if (!stats.most_common_trait || stats.most_common_trait === "N/A") return;

    setLoadingAI(true);

    fetch(`${import.meta.env.VITE_API_URL}/get-recommendation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dominant_trait: stats.most_common_trait.toLowerCase(),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setAiRec({
          student: data.student_recommendation,
          teacher: data.teacher_strategy,
        });
        setLoadingAI(false);
      })
      .catch((err) => {
        console.error("Failed to fetch AI recommendation:", err);
        setLoadingAI(false);
      });
  }, [stats.most_common_trait]);

  const chartData = dominantTraitData.map((d) => ({
    name: d.trait,
    value: d.count,
  }));

  const summaryStats = [
    {
      label: "Profiles Linked to You",
      value: stats.total_students,
      change: "+12 this week",
      icon: Users,
    },
    {
      label: "Total Trait Evaluations",
      value: Number(stats.total_students || 0) * 5,
      change: "5 per student",
      icon: Brain,
    },
    {
      label: "Most Common Trait (This Class)",
      value: stats.most_common_trait,
      change: "based on survey",
      icon: TrendingUp,
    },
    {
      label: "Most Recent Data Upload",
      value: stats.last_upload,
      change: "most recent",
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6 lg:space-y-8">
      {selectedStudent && (
        <StudentProfileModal
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      {/* Summary Cards */}
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity duration-300 ${
          stats ? "opacity-100" : "opacity-0"
        }`}
      >
        {summaryStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-gray-800/50 backdrop-blur-sm p-4 rounded-xl border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-400">{stat.label}</p>
              <stat.icon className="h-5 w-5 text-gray-500" />
            </div>
            <p className="mt-2 flex items-baseline">
              <span className="text-2xl font-semibold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
                {stat.value}
              </span>
              <span className="ml-2 text-xs text-gray-500">{stat.change}</span>
            </p>
          </div>
        ))}
      </div>

      {/* No Data Banner */}
      {stats.total_students === 0 && selectedSubject !== "All" && (
        <div className="mt-8 flex flex-col items-center justify-center text-center border border-gray-700 bg-gray-800 text-gray-400 rounded-lg p-6 shadow-sm transition-opacity animate-fade-in">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-sm">
            No student data available for{" "}
            <strong className="text-indigo-300">{selectedSubject}</strong>.
          </p>
          <p className="text-xs mt-1 text-gray-500">
            Upload a roster and ensure students have completed their assessment.
          </p>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8">
        {/* Trait Averages Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-4 lg:p-6 rounded-xl border border-gray-700">
          <h3 className="text-base lg:text-lg font-medium text-gray-100 mb-4">
            Trait Distribution
          </h3>
          <div className="h-60 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={traitAverages}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="trait" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" domain={[0, 5]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "0.5rem",
                    color: "#F3F4F6",
                  }}
                />
                <Bar dataKey="score">
                  {traitAverages.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dominant Traits Pie Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm p-4 lg:p-6 rounded-xl border border-gray-700">
          <h3 className="text-base lg:text-lg font-medium text-gray-100 mb-4">
            Dominant Traits Distribution
          </h3>
          <div className="h-60 lg:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    window.innerWidth > 768
                      ? `${name} ${(percent * 100).toFixed(0)}%`
                      : `${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={window.innerWidth > 768 ? 80 : 60}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    border: "1px solid #374151",
                    borderRadius: "0.5rem",
                    color: "#F3F4F6",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Recommendation Box */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-medium text-gray-100 flex items-center">
            <Brain className="h-5 w-5 mr-2 text-blue-400" />
            AI-Generated Recommendations
          </h3>
        </div>
        <div className="p-6">
          {loadingAI ? (
            <p className="text-sm text-gray-400">
              Loading AI recommendations...
            </p>
          ) : aiRec ? (
            <div className="bg-gray-700/30 backdrop-blur-sm rounded-lg p-4 border border-gray-600">
              <h4 className="text-md font-medium text-gray-100 mb-2">
                👩🏻‍🏫 Teaching Strategy
              </h4>
              <p className="text-sm text-gray-400">{aiRec.teacher}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              No recommendations available yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
