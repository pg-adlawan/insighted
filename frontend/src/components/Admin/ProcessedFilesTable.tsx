// components/Admin/ProcessedFilesTable.tsx
import { useEffect, useState } from "react";

interface ProcessedFile {
  file_name: string;
  academic_year: string;
  year_level: string;
  date_uploaded: string;
  teacher_name: string;
}

const ProcessedFilesTable = () => {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [yearFilter, setYearFilter] = useState<string>("");
  const [teacherFilter, setTeacherFilter] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch(`${import.meta.env.VITE_API_URL}/admin/a`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => res.json())
      .then((data) => setFiles(data))
      .catch((err) => console.error("Failed to fetch processed files:", err));
  }, []);

  const filteredFiles = files.filter(
    (file) =>
      (yearFilter === "" || file.academic_year === yearFilter) &&
      (teacherFilter === "" ||
        file.teacher_name.toLowerCase().includes(teacherFilter.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <select
          className="border rounded-md px-3 py-1 text-sm"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          <option value="">All Academic Years</option>
          {[...new Set(files.map((f) => f.academic_year))].map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        <input
          type="text"
          className="border rounded-md px-3 py-1 text-sm"
          placeholder="Filter by teacher name"
          value={teacherFilter}
          onChange={(e) => setTeacherFilter(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto border rounded-lg bg-white shadow">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-100 font-semibold text-gray-700">
            <tr>
              <th className="px-4 py-2">File Name</th>
              <th className="px-4 py-2">Teacher</th>
              <th className="px-4 py-2">Academic Year</th>
              <th className="px-4 py-2">Year Level</th>
              <th className="px-4 py-2">Uploaded At</th>
              <th className="px-4 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file, index) => (
                <tr key={index} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{file.file_name}</td>
                  <td className="px-4 py-2">{file.teacher_name}</td>
                  <td className="px-4 py-2">{file.academic_year}</td>
                  <td className="px-4 py-2">{file.year_level}</td>
                  <td className="px-4 py-2">
                    {new Date(file.date_uploaded).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() =>
                        alert(`View details for ${file.file_name}`)
                      }
                      className="text-indigo-600 hover:underline text-sm"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-6 text-center text-gray-500 italic"
                >
                  No processed files found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProcessedFilesTable;
