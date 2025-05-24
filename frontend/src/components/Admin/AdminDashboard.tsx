import { useEffect, useState } from "react";
import { Brain } from "lucide-react";
import DashboardOverview from "./DashboardOverview";
import ProcessedFilesTable from "./ProcessedFilesTable";
import StudentProfilesTable from "./StudentProfilesTable";
import PsychometricUpload from "./PsychometricUpload";
import TeachersTable from "./TeachersTable";

interface ProcessedFile {
  id: number;
  file_name: string;
  date_processed: string;
  processed_by: string;
  user_email: string;
}

const AdminDashboard = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [tab, setTab] = useState<
    "dashboard" | "upload" | "profiles" | "files" | "users"
  >("dashboard");

  useEffect(() => {
    const token = localStorage.getItem("token");

    // Get processed files
    fetch(`${import.meta.env.VITE_API_URL}/admin/processed-files`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setFiles)
      .catch((err) => console.error(err));

    // Get users
    fetch(`${import.meta.env.VITE_API_URL}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then(setUsers)
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${import.meta.env.VITE_API_URL}/admin/processed-files`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to fetch");
        }
        return res.json();
      })
      .then((data) => {
        setFiles(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      {/* Main Dashboard */}
      <main className="flex-1 p-12">
        <div className="flex items-center space-x-3 mb-6 mt-12 lg:mt-0">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Brain className="h-6 w-6 lg:h-8 lg:w-8 text-white" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-400 to-blue-200 bg-clip-text text-transparent">
            InsightEd
          </h1>
        </div>
        <h1 className="text-3xl font-bold mb-2">Welcome, Prince Girk Adlawan</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white shadow p-4 rounded-xl border">
            <h2 className="text-sm text-gray-500">Total Users</h2>
            <p className="text-2xl font-bold text-indigo-600">{users.length}</p>
          </div>
          <div className="bg-white shadow p-4 rounded-xl border">
            <h2 className="text-sm text-gray-500">Documents Processed</h2>
            <p className="text-2xl font-bold text-indigo-600">{files.length}</p>
          </div>
          <div className="bg-white shadow p-4 rounded-xl border">
            <h2 className="text-sm text-gray-500">Last Login</h2>
            <p className="text-sm text-gray-400">Coming soon</p>
          </div>
        </div>

        {/* Switch Tab */}
        <div className="w-full mb-6">
          <div className="flex justify-start border-b border-gray-200 bg-white shadow-sm rounded-t-md overflow-x-auto">
            {[
              { key: "dashboard", label: "Dashboard Overview" },
              { key: "upload", label: "Psychometric Upload" },
              { key: "profiles", label: "Student Profiles" },
              { key: "files", label: "Processed Files" },
              { key: "users", label: "Registered Teachers" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-6 py-3 text-sm font-semibold transition-all duration-200 border-b-2
          ${
            tab === key
              ? "text-indigo-600 border-indigo-600 bg-indigo-50"
              : "text-gray-600 border-transparent hover:text-indigo-500"
          }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === "dashboard" && <DashboardOverview />}
        {tab === "upload" && <PsychometricUpload />}
        {tab === "profiles" && <StudentProfilesTable />}
        {tab === "files" && <ProcessedFilesTable />}
        {tab === "users" && <TeachersTable />}

        {loading && <p className="text-gray-500">Loading processed files...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
      </main>
    </div>
  );
};

export default AdminDashboard;
