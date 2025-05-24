import { useEffect, useState } from "react";
import { RefreshCw, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import toast from "react-hot-toast";

interface CustomPDF extends jsPDF {
  lastAutoTable?: {
    finalY?: number;
  };
}

export const InsightsTab = ({
  user,
  activeSubject,
}: {
  user: any;
  activeSubject: string;
}) => {
  const [keyFindings, setKeyFindings] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [regeneratingFindings, setRegeneratingFindings] = useState(false);

  // Initial fetch on tab load
  useEffect(() => {
    if (user?.id) {
      getInsightsFromDB();
    }

    if (user?.id && activeSubject) {
      fetchAndGenerateFindings();
    }
  }, [user, activeSubject]);

  // Fetch insights from database
  const getInsightsFromDB = async () => {
    try {
      const subjectParam = `&subject=${encodeURIComponent(
        activeSubject && activeSubject !== "All" ? activeSubject : "General"
      )}`;

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/get-insights?teacher_id=${
          user.id
        }${subjectParam}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      const data = await res.json();
      setKeyFindings(data.key_findings || []);
      setRecommendations(data.recommendations || []);
      setLastUpdated(data.last_updated || null);
    } catch (err) {
      console.error("Failed to fetch insights:", err);
    }
  };

  // Regenerate AI findings
  const fetchAndGenerateFindings = async () => {
    setRegeneratingFindings(true);
    try {
      const subjectValue =
        activeSubject && activeSubject !== "All" ? activeSubject : "General";
      const statsRes = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/class-profile-summary?subject=${encodeURIComponent(subjectValue)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const statsData = await statsRes.json();
      console.log("📊 Class Profile Stats:", statsData);
      const classProfile = {
        average_scores: statsData.average_scores,
        most_common_dominant_trait: statsData.most_common_trait,
        highest_trait: statsData.highest_trait,
        lowest_trait: statsData.lowest_trait,
      };
      console.log("📤 Sending classProfile:", classProfile);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/generate-key-findings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            class_profile: classProfile,
            teacher_id: user?.id || "", // <- fallback to empty string
            subject:
              activeSubject && activeSubject !== "All"
                ? activeSubject
                : "General", // <- never undefined
          }),
        }
      );

      const data = await res.json();
      setKeyFindings(data.key_findings || []);
      setRecommendations(data.recommendations || []);
      setLastUpdated(new Date().toLocaleString());

      toast.success("AI findings updated successfully!");
    } catch (err) {
      console.error("AI generation failed:", err);
    } finally {
      setRegeneratingFindings(false);
    }
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF() as CustomPDF;
    doc.setFontSize(14);
    doc.text("AI-Generated Class Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

    autoTable(doc, {
      startY: 40,
      head: [["Key Findings"]],
      body: keyFindings.map((item) => [item]),
      didDrawPage: (data) => {
        doc.lastAutoTable = data.doc;

      },
    });

    const nextY = doc.lastAutoTable?.finalY || 60;

    autoTable(doc, {
      startY: nextY + 10,
      head: [["Recommendations"]],
      body: recommendations.map((item) => [item]),
    });

    doc.save("class-report.pdf");
  };

  return (
    <div className="space-y-8">
      {/* Key Findings */}
      <section>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🧩 Key Findings
        </h3>
        <ul className="mt-2 list-disc list-inside text-sm text-gray-300 animate-fade-in">
          {keyFindings.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        {lastUpdated && (
          <p className="text-xs text-gray-400 italic mt-2">
            Last updated: {lastUpdated}
          </p>
        )}
      </section>

      {/* Teaching Recommendations */}
      <section>
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          📚 Teaching Recommendations
        </h3>
        <ul className="mt-2 list-disc list-inside text-sm text-gray-300 animate-fade-in">
          {recommendations.map((rec, i) => (
            <li key={i}>{rec}</li>
          ))}
        </ul>
      </section>

      {/* Regenerate + Download */}
      <section className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={fetchAndGenerateFindings}
          disabled={regeneratingFindings}
          className={`px-4 py-2 rounded-md flex items-center gap-2 ${
            regeneratingFindings
              ? "bg-gray-500"
              : "bg-yellow-500 hover:bg-yellow-600"
          } text-white transition`}
        >
          <RefreshCw
            className={`h-5 w-5 ${regeneratingFindings ? "animate-spin" : ""}`}
          />
          {regeneratingFindings
            ? "Regenerating..."
            : "Regenerate Findings & Recommendations"}
        </button>

        <button
          onClick={handleDownloadPDF}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-md flex items-center gap-2"
        >
          <Download className="h-5 w-5" />
          Download Class Report
        </button>
      </section>
    </div>
  );
};
