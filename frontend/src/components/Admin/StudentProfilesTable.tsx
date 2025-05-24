import { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface StudentProfile {
  student_id: string;
  name: string;
  dominant_trait: string;
  academic_year: string;
  year_level: string;
  created_at: string;
}

const StudentProfilesTable = () => {
  const [profiles, setProfiles] = useState<StudentProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<StudentProfile | null>(
    null
  );
  const [editName, setEditName] = useState("");
  const [editYearLevel, setEditYearLevel] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/admin/student-profiles`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setProfiles(data))
      .catch((err) => console.error("Failed to fetch profiles", err));
  }, []);

  const filteredProfiles = profiles.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.student_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (profile: StudentProfile) => {
    setSelectedProfile(profile);
    setEditName(profile.name);
    setEditYearLevel(profile.year_level);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!selectedProfile) return;

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/student-profiles/${
        selectedProfile.student_id
      }`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name: editName, year_level: editYearLevel }),
      }
    );

    if (res.ok) {
      window.location.reload();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this student profile?"))
      return;

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/student-profiles/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    if (res.ok) {
      setProfiles(profiles.filter((p) => p.student_id !== id));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Total Profiles: {filteredProfiles.length}
      </h2>

      <div className="relative w-full max-w-amd mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name or student ID..."
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
        />
      </div>

      <div className="overflow-x-auto border rounded-lg bg-white shadow">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-2">Student ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Dominant Trait</th>
              <th className="px-4 py-2">Year Level</th>
              <th className="px-4 py-2">Academic Year</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((profile) => (
                <tr
                  key={profile.student_id}
                  className="border-t hover:bg-gray-50"
                >
                  <td className="px-4 py-2">{profile.student_id}</td>
                  <td className="px-4 py-2">{profile.name}</td>
                  <td className="px-4 py-2">{profile.dominant_trait}</td>
                  <td className="px-4 py-2">{profile.year_level}</td>
                  <td className="px-4 py-2">{profile.academic_year}</td>
                  <td className="px-4 py-2">
                    {new Date(profile.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(profile)}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(profile.student_id)}
                      className="text-red-500 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-gray-500 italic"
                >
                  No student profiles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {showModal && selectedProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Edit Student</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border px-4 py-2 rounded"
              placeholder="Name"
            />
            <input
              type="text"
              value={editYearLevel}
              onChange={(e) => setEditYearLevel(e.target.value)}
              className="w-full border px-4 py-2 rounded"
              placeholder="Year Level"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProfilesTable;
