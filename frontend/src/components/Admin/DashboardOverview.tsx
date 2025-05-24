import { useEffect, useState } from "react";
import {
  Users,
  Brain,
  FileText,
  UserCheck,
  Clock
} from "lucide-react";
import ApexCharts from "react-apexcharts";

interface TraitDistribution {
  trait: string;
  count: number;
}

const DashboardOverview = () => {
  const [stats, setStats] = useState({
    total_students: 0,
    profiles_completed: 0,
    files_uploaded: 0,
    active_teachers: 0,
    last_upload: "—"
  });

  const [distribution, setDistribution] = useState<TraitDistribution[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${import.meta.env.VITE_API_URL}/admin/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then(setStats)
      .catch((err) => console.error("Failed to fetch stats", err));

    fetch(`${import.meta.env.VITE_API_URL}/admin/trait-distribution`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setDistribution(data))
      .catch((err) =>
        console.error("Failed to fetch trait distribution:", err)
      );
  }, []);

  const chartOptions = {
    chart: {
      type: "bar" as const,
    },
    xaxis: {
      categories: distribution.map((d) => d.trait),
    },
    colors: ["#6366F1"],
  };

  const chartSeries = [
    {
      name: "Students",
      data: distribution.map((d) => d.count),
    },
  ];

  const cards = [
    {
      label: "Total Registered Students",
      value: stats.total_students,
      icon: <Users className="w-6 h-6" />,
      color: "text-indigo-600"
    },
    {
      label: "Profiles Completed This Term",
      value: stats.profiles_completed,
      icon: <Brain className="w-6 h-6" />,
      color: "text-green-600"
    },
    {
      label: "Survey Files Uploaded",
      value: stats.files_uploaded,
      icon: <FileText className="w-6 h-6" />,
      color: "text-blue-600"
    },
    {
      label: "Active Teachers",
      value: stats.active_teachers,
      icon: <UserCheck className="w-6 h-6" />,
      color: "text-violet-600"
    },
    {
      label: "Last Upload Activity",
      value: stats.last_upload,
      icon: <Clock className="w-6 h-6" />,
      color: "text-gray-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white shadow rounded-xl p-5 flex items-center justify-between hover:shadow-md transition"
          >
            <div>
              <p className="text-xs uppercase text-gray-500 font-medium mb-1">
                {card.label}
              </p>
              <h2 className={`text-xl font-bold ${card.color}`}>{card.value}</h2>
            </div>
            <div className={`${card.color}`}>{card.icon}</div>
          </div>
        ))}
      </div>

      {/* Trait Distribution + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Trait Distribution</h2>
          <ApexCharts
            options={chartOptions}
            series={chartSeries}
            type="bar"
            height={300}
          />
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Summary</h2>
          <ul className="text-sm text-gray-700 space-y-1">
            {distribution.map((d) => (
              <li key={d.trait} className="flex justify-between">
                <span>{d.trait}</span>
                <span className="font-semibold text-indigo-600">
                  {d.count}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DashboardOverview;
