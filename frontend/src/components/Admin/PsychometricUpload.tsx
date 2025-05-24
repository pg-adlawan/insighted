import { useState } from "react";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

const PsychometricUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [academicYear, setAcademicYear] = useState("");
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [skippedStudents, setSkippedStudents] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);

  const handleSubmit = async () => {
    if (!file || !academicYear) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("academic_year", academicYear);

    setUploading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/admin/upload-psychometric`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("Psychometric file uploaded successfully!");

        // Show modal with skipped students (if any)
        if (data.skipped_students?.length > 0) {
          setSkippedStudents(data.skipped_students);
          setShowModal(true);
        }
        setSummary(data.message || null);
        setFile(null);
        setAcademicYear("");
      } else {
        toast.error(data.error || "Upload failed.");
      }
    } catch (err) {
      toast.error("Something went wrong.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md max-w-2xl">
      <h2 className="text-lg font-semibold mb-4">Upload Psychometric CSV</h2>

      <div className="space-y-4">
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-600">
            Academic Year
          </label>
          <select
            className="w-full border border-gray-300 rounded-md p-2 text-sm"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          >
            <option value="">Select Year</option>
            <option value="2023-2024">2023–2024</option>
            <option value="2024-2025">2024–2025</option>
            <option value="2025-2026">2025–2026</option>
          </select>
        </div>
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-600">
            CSV File
          </label>
          <input
            type="file"
            accept=".csv"
            className="w-full text-sm"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>

        <button
          disabled={!file || !academicYear || uploading}
          onClick={handleSubmit}
          className="bg-indigo-600 text-white text-sm px-6 py-2 rounded-md hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            "Upload File"
          )}
        </button>

        {summary && (
          <div className="bg-green-50 text-green-800 text-sm border border-green-200 rounded-md p-3 mt-4">
            {summary}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-full max-w-lg border border-gray-700 space-y-4">
            <h3 className="text-xl font-semibold text-white">
              Skipped Students
            </h3>
            <p className="text-sm text-gray-300">
              The following Student IDs were skipped because they already exist
              in the system:
            </p>
            <div className="max-h-60 overflow-y-auto bg-gray-800 p-3 rounded text-sm text-gray-200 border border-gray-600">
              <ul className="list-disc list-inside">
                {skippedStudents.map((id, i) => (
                  <li key={i}>{id}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PsychometricUpload;
