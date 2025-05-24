import { useEffect, useState } from "react";
import { Search } from "lucide-react";

interface Teacher {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
  upload_count?: number;
}

const TeachersTable = () => {
  const [users, setUsers] = useState<Teacher[]>([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/admin/users`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setUsers(data))
      .catch((err) => console.error("Failed to load users", err));
  }, []);

  const filteredTeachers = users
    .filter((u) => u.role === "teacher")
    .filter(
      (u) =>
        u.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(teacherSearch.toLowerCase())
    );

  const handleEdit = (teacher: Teacher) => {
  setSelectedTeacher(teacher);
  setEditName(teacher.name);
  setEditEmail(teacher.email);
  setShowModal(true);
};


  const handleSave = async () => {
    if (!selectedTeacher) return;

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/admin/user/${selectedTeacher.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ name: editName, email: editEmail }),
      }
    );

    if (res.ok) {
      window.location.reload();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this teacher?")) return;

    const res = await fetch(`${import.meta.env.VITE_API_URL}/admin/user/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (res.ok) {
      setUsers(users.filter((u) => u.id !== id));
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Total Teachers: {filteredTeachers.length}
      </h2>

      <div className="relative w-full max-w-amd mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={teacherSearch}
          onChange={(e) => setTeacherSearch(e.target.value)}
          placeholder="Search teacher name or email..."
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
        />
      </div>

      <div className="overflow-x-auto border rounded-lg bg-white shadow">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Registered</th>
              <th className="px-4 py-2">Files Uploaded</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.map((user) => (
              <tr key={user.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{user.name}</td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2 capitalize">{user.role}</td>
                <td className="px-4 py-2">
                  {new Date(user.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-center">
                  {user.upload_count || 0}
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow w-full max-w-md space-y-4">
            <h3 className="text-lg font-bold text-gray-800">Edit Teacher</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full border px-4 py-2 rounded"
              placeholder="Name"
            />
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full border px-4 py-2 rounded"
              placeholder="Email"
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

export default TeachersTable;
