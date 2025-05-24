import { useState } from "react";
import {
  Upload,
  HelpCircle,
  History,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";

export const FileUploadSidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [unmatchedStudents, setUnmatchedStudents] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [academicYear, setAcademicYear] = useState("");

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setMessage(null);
      setUnmatchedStudents([]);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setUploading(true);
    setMessage(null);
    setUnmatchedStudents([]);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("subject_code", subjectCode);
    formData.append("subject_name", subjectName);
    formData.append("academic_year", academicYear);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/teacher/upload-masterlist`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (response.status === 409) {
        toast.error(result.error || "Subject already uploaded.");
        return;
      }

      if (response.ok) {
        setMessage(
          `✅ Masterlist uploaded. ${result.matched} students matched, ${result.unmatched} not found.`
        );
        setUnmatchedStudents(result.unmatched_students || []);
        toast.success("Masterlist uploaded successfully!");
        window.dispatchEvent(new Event("refreshStudentList"));
      } else {
        setMessage(`❌ Upload failed: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      toast.error("Upload failed. Please try again.");
      setMessage("❌ Error uploading CSV.");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
    },
  });

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-md text-gray-200"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
      <aside
        className={`
      fixed lg:static inset-y-0 left-0 z-40 w-80 min-h-screen bg-gray-50 p-6 border-r border-gray-200
      transform transition-transform duration-200 ease-in-out
      ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
    `}
      >
        <div className="space-y-6 mt-12 lg:mt-0">
          <h2 className="text-md font-semibold text-gray-800 mb-2">
            📋 Roster Upload
          </h2>
          <div className="text-sm text-gray-600 mb-3">
            Upload your student roster for this subject and semester. Matched
            students will be linked to your dashboard automatically.
          </div>

          <div className="space-y-2">
            <input
              type="text"
              placeholder="Subject Code (e.g. IT101)"
              value={subjectCode}
              onChange={(e) => setSubjectCode(e.target.value)}
              className="w-full px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-800"
            />
            <input
              type="text"
              placeholder="Subject Name (e.g. Intro to IT)"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-800"
            />
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-800"
            >
              <option value="">Select School Year</option>
              <option value="2023-2024">2023–2024</option>
              <option value="2024-2025">2024–2025</option>
            </select>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-4 lg:p-6 text-center cursor-pointer transition-colors
            ${
              isDragActive
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-blue-400"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-8 lg:h-12 w-8 lg:w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">
              {uploading
                ? "Uploading..."
                : "Drop your CSV file here, or click to browse"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Accepted format: .csv</p>
          </div>

          {file && (
            <p className="text-sm text-gray-500 mt-2 text-center">
              📎 <strong>{file.name}</strong> selected and ready to process
            </p>
          )}

          {message && (
            <div
              className={`p-3 rounded-md text-sm flex items-center ${
                message.startsWith("✅")
                  ? "bg-green-50 text-green-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              <div
                className={`h-2 w-2 ${
                  message.startsWith("✅") ? "bg-green-500" : "bg-red-500"
                } rounded-full mr-2`}
              />
              {message}
            </div>
          )}

          {unmatchedStudents.length > 0 && (
            <button
              onClick={() => setShowModal(true)}
              className="text-sm text-red-600 mt-2 underline hover:text-red-800"
            >
              ⚠️ {unmatchedStudents.length} students not found — View Details
            </button>
          )}

          {!message && !uploading && (
            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm flex items-center">
              <div className="h-2 w-2 bg-green-500 rounded-full mr-2" />
              Ready to process data
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              {uploading ? "Processing..." : "Process Data"}
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full bg-white text-gray-700 py-2 px-4 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Data
            </button>
          
          </div>

          <div className="flex justify-between">
            <button className="inline-flex items-center text-gray-600 hover:text-gray-900">
              <HelpCircle className="h-5 w-5 mr-1" />
              Help
            </button>
            <button className="inline-flex items-center text-gray-600 hover:text-gray-900">
              <History className="h-5 w-5 mr-1" />
              History
            </button>
          </div>

          <div className="mt-6 space-y-2 border-t border-gray-300 pt-4">
            <button
              onClick={() => {
                localStorage.removeItem("token");
                window.location.href = "/";
              }}
              className="w-full py-2 mt-2 border-2 border-red-500 text-red-500 font-semibold rounded-md hover:bg-red-500 hover:text-white transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg relative">
            <h3 className="text-lg font-semibold mb-4 text-red-600">
              Unmatched Students
            </h3>
            <ul className="text-sm text-gray-700 space-y-1 max-h-60 overflow-y-auto">
              {unmatchedStudents.map((id, i) => (
                <li key={i}>• {id}</li>
              ))}
            </ul>
            <button
              onClick={() => setShowModal(false)}
              className="mt-4 bg-indigo-600 text-white text-sm px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
