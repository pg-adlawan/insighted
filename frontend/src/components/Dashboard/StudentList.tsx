import { useEffect, useMemo, useState } from "react";
import { ChevronUp, ChevronDown, Eye, Trash2, PencilLine } from "lucide-react";
import { StudentProfileModal } from "./StudentProfileModal";

const TRAIT_COLORS = {
  Openness: "#FF6B6B",
  Conscientiousness: "#4ECDC4",
  Extraversion: "#FFD93D",
  Agreeableness: "#95D5B2",
  Neuroticism: "#8B5CF6",
};

interface StudentData {
  id: string;
  name: string;
  email?: string;
  dominantTrait: string;
  score: number;
}

type SortDirection = "asc" | "desc";

export const StudentList = ({
  selectedSubject,
}: {
  selectedSubject: string;
}) => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [traitFilter, setTraitFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 10;
  const [editStudent, setEditStudent] = useState<StudentData | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, traitFilter]);

  const [sortConfig, setSortConfig] = useState<{
    key: keyof StudentData;
    direction: SortDirection;
  }>({
    key: "id",
    direction: "asc",
  });

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const subjectParam =
          selectedSubject && selectedSubject !== "All"
            ? `?subject=${encodeURIComponent(selectedSubject)}`
            : "";
        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/students${subjectParam}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await res.json();

        const detailedStudents = await Promise.all(
          data.map(async (item: any) => {
            const response = await fetch(
              `${import.meta.env.VITE_API_URL}/assess/individual?student_id=${
                item.student_id
              }`,
              {
                headers: {
                  Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
              }
            );

            const result = await response.json();

            return {
              id: item.student_id,
              name: item.name,
              email: item.email,
              dominantTrait: result.dominant_trait || "N/A",
              score: (result.dominant_trait || "")
                .split(" & ")
                .map((trait: string) => result.average_scores?.[trait] || 0)
                .reduce((a: number, b: number) => Math.max(a, b), 0),
            };
          })
        );

        setStudents(detailedStudents);
      } catch (err) {
        console.error("Failed to fetch students:", err);
      }
    };

    fetchStudents();

    const refreshHandler = () => fetchStudents();
    window.addEventListener("refreshStudentList", refreshHandler);

    return () => {
      window.removeEventListener("refreshStudentList", refreshHandler);
    };
  }, [selectedSubject]);

  const handleDelete = async (studentId: string) => {
    if (!selectedSubject || selectedSubject === "All") {
      alert("Please select a specific subject.");
      return;
    }

    const res = await fetch(
      `${
        import.meta.env.VITE_API_URL
      }/teacher/student/${studentId}/delete?subject_code=${selectedSubject}&academic_year=2023-2024`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    const data = await res.json();
    alert(data.message);
    window.dispatchEvent(new Event("refreshStudentList"));
  };

  const handleSaveEdit = async () => {
    if (!editStudent) return;

    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/teacher/student/${
        editStudent.id
      }/update`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          subject_code: selectedSubject,
          academic_year: "2023-2024",
          name: editName,
          email: editEmail,
        }),
      }
    );

    const data = await res.json();
    alert(data.message);
    setEditStudent(null);
    window.dispatchEvent(new Event("refreshStudentList"));
  };

  const sortedAndFilteredStudents = useMemo(() => {
    let filtered = [...students];

    if (traitFilter) {
      filtered = filtered.filter(
        (student) => student.dominantTrait === traitFilter
      );
    }

    if (searchTerm.trim() !== "") {
      const lowerTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (student) =>
          student.name.toLowerCase().includes(lowerTerm) ||
          student.id.toLowerCase().includes(lowerTerm)
      );
    }

    return filtered.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? "";
      const bVal = b[sortConfig.key] ?? "";

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [students, sortConfig, traitFilter, searchTerm]);

  const requestSort = (key: keyof StudentData) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const totalPages = Math.ceil(
    sortedAndFilteredStudents.length / studentsPerPage
  );

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * studentsPerPage;
    return sortedAndFilteredStudents.slice(start, start + studentsPerPage);
  }, [sortedAndFilteredStudents, currentPage]);

  return (
    <div className="space-y-6">
      {selectedStudent && (
        <StudentProfileModal
          studentId={selectedStudent.id}
          studentName={selectedStudent.name}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      <div className="flex justify-between items-center flex-wrap gap-3">
        <h2 className="text-xl font-semibold text-gray-100">
          Student List Table
        </h2>

        <div className="flex flex-wrap gap-3 items-center">
          {/* 🔍 Name Search */}
          <input
            type="text"
            placeholder="Search by name or ID"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-gray-700 text-gray-200 border border-gray-600 rounded-md px-3 py-2 text-sm"
          />

          {/* 🎯 Trait Filter */}
          <select
            value={traitFilter}
            onChange={(e) => setTraitFilter(e.target.value)}
            className="bg-gray-700 text-gray-200 rounded-md px-3 py-2 text-sm border border-gray-600"
          >
            <option value="">All Traits</option>
            {Object.keys(TRAIT_COLORS).map((trait) => (
              <option key={trait} value={trait}>
                {trait}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 📊 Student Table */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              {["ID", "Name", "Dominant Trait", "Score"].map((header) => (
                <th
                  key={header}
                  className="px-6 py-4 text-left text-sm font-medium text-gray-300"
                >
                  <button
                    onClick={() =>
                      requestSort(
                        header
                          .toLowerCase()
                          .replace(" ", "") as keyof StudentData
                      )
                    }
                    className="flex items-center space-x-1"
                  >
                    <span>{header}</span>
                    <span className="flex flex-col">
                      <ChevronUp
                        className={`h-3 w-3 ${
                          sortConfig.key ===
                            header.toLowerCase().replace(" ", "") &&
                          sortConfig.direction === "asc"
                            ? "text-blue-400"
                            : "text-gray-600"
                        }`}
                      />
                      <ChevronDown
                        className={`h-3 w-3 ${
                          sortConfig.key ===
                            header.toLowerCase().replace(" ", "") &&
                          sortConfig.direction === "desc"
                            ? "text-blue-400"
                            : "text-gray-600"
                        }`}
                      />
                    </span>
                  </button>
                </th>
              ))}
              <th className="px-6 py-4 text-left text-sm font-medium text-gray-300">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-700">
            {paginatedStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-sm text-gray-400 py-6 italic"
                >
                  No students found for the selected criteria.
                </td>
              </tr>
            ) : (
              paginatedStudents.map((student) => (
                <tr
                  key={student.id}
                  className="hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {student.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {student.name}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {student.dominantTrait
                        .split(" & ")
                        .map((trait, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: `${
                                TRAIT_COLORS[
                                  trait.trim() as keyof typeof TRAIT_COLORS
                                ] || "#6B7280"
                              }20`,
                              color:
                                TRAIT_COLORS[
                                  trait.trim() as keyof typeof TRAIT_COLORS
                                ] || "#9CA3AF",
                            }}
                          >
                            {trait.trim()}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    {student.score}
                  </td>
                  <td className="px-4 py-2 text-center space-x-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setSelectedStudent(student)}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-500"
                      >
                        <Eye className="h-4 w-4 mr-2" /> View
                      </button>
                      <button
                        onClick={() => {
                          setEditStudent(student);
                          setEditName(student.name);
                          setEditEmail(student.email || "");
                        }}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-yellow-200 bg-yellow-600 hover:bg-yellow-500"
                      >
                        <PencilLine className="h-4 w-4 mr-2" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="inline-flex items-center px-3 py-1 rounded-md text-sm font-medium text-red-200 bg-red-600 hover:bg-red-500"
                      >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {editStudent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md space-y-4 border border-gray-700">
              <h3 className="text-xl text-white font-semibold">Edit Student</h3>
              <input
                type="text"
                placeholder="Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-600 text-white"
              />
              <input
                type="email"
                placeholder="Email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full px-4 py-2 rounded-md bg-gray-800 border border-gray-600 text-white"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setEditStudent(null)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        <nav className="flex justify-end mt-6" aria-label="Pagination">
          <ul className="inline-flex items-center -space-x-px text-sm">
            <li>
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center px-3 h-8 leading-tight rounded-s-lg border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-50"
              >
                Previous
              </button>
            </li>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <li key={page}>
                <button
                  onClick={() => setCurrentPage(page)}
                  className={`flex items-center justify-center px-3 h-8 leading-tight border border-gray-700 hover:bg-gray-700 hover:text-white ${
                    page === currentPage
                      ? "bg-gray-700 text-white z-10"
                      : "text-gray-400"
                  }`}
                >
                  {page}
                </button>
              </li>
            ))}

            <li>
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    prev < totalPages ? prev + 1 : prev
                  )
                }
                disabled={currentPage === totalPages}
                className="flex items-center justify-center px-3 h-8 leading-tight rounded-e-lg border border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white disabled:opacity-50"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
};
