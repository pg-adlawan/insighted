import { useEffect, useState } from "react";
import {
  X,
  ChevronDown,
  Smile, // Extraversion
  Heart, // Agreeableness
  Brain, // Openness
  ShieldCheck, // Conscientiousness
  AlertTriangle, // Neuroticism
} from "lucide-react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

const TRAIT_ORDER = [
  "Openness",
  "Conscientiousness",
  "Extraversion",
  "Agreeableness",
  "Neuroticism",
];

interface TraitScore {
  trait: string;
  score: number;
  level: string;
}

interface StudentProfileModalProps {
  studentId: string;
  studentName: string;
  onClose: () => void;
}

export const StudentProfileModal = ({
  studentId,
  studentName,
  onClose,
}: StudentProfileModalProps) => {
  const [traits, setTraits] = useState<TraitScore[]>([]);
  const [dominantTraits, setDominantTraits] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const traitIcons: Record<string, JSX.Element> = {
    Extraversion: <Smile className="h-4 w-4 text-blue-400" />,
    Agreeableness: <Heart className="h-4 w-4 text-blue-400" />,
    Openness: <Brain className="h-4 w-4 text-blue-400" />,
    Conscientiousness: <ShieldCheck className="h-4 w-4 text-blue-400" />,
    Neuroticism: <AlertTriangle className="h-4 w-4 text-blue-400" />,
  };

  const [traitInsights, setTraitInsights] = useState<{
    [key: string]: { interpretation: string; recommendation: string };
  }>({});
  const [, setLoadingInsights] = useState(false);
  const [expandedTraits, setExpandedTraits] = useState<{
    [key: string]: boolean;
  }>({});

  const toggleTrait = (traitName: string) => {
    setExpandedTraits((prev) => ({
      ...prev,
      [traitName]: !prev[traitName],
    }));
  };

  useEffect(() => {
    const fetchTraitInsights = async () => {
      if (!studentId) return;
      setLoadingInsights(true);
      try {
        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL
          }/a?student_id=${studentId}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        const data = await response.json();
        setTraitInsights(data);
      } catch (error) {
        console.error("Failed to fetch trait insights:", error);
      } finally {
        setLoadingInsights(false);
      }
    };

    fetchTraitInsights();
  }, [studentId]);

  useEffect(() => {
    setLoading(true);
    setError(false);
    if (!studentId) return;
    fetch(
      `${
        import.meta.env.VITE_API_URL
      }/assess/individual?student_id=${studentId}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.average_scores) {
          throw new Error("No trait data available");
        }
        setDominantTraits(data.dominant_trait || "N/A");

        const extractedTraits: TraitScore[] = Object.entries(
          data.average_scores
        ).map(([trait, value]) => {
          const score = typeof value === "number" ? value : parseFloat(value);

          let level = "Moderate";
          if (score <= 30) level = "Low";
          else if (score >= 41) level = "High";

          return {
            trait,
            score: parseFloat(score.toFixed(2)),
            level,
          };
        });

        setTraits(extractedTraits);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch or parse student analysis:", err);
        setError(true);
        setLoading(false);
      });
  }, [studentId]);

  const radarData = traits
    .map((trait) => ({
      trait: trait.trait,
      score: trait.score,
    }))
    .sort(
      (a, b) => TRAIT_ORDER.indexOf(a.trait) - TRAIT_ORDER.indexOf(b.trait)
    );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 lg:p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-5xl max-h-[95vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center">
          <h3 className="text-lg lg:text-xl font-semibold text-gray-100">
            Student Profile
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-gray-400 animate-pulse">
                Loading student profile...
              </p>
            </div>
          ) : error ? (
            <div className="flex justify-center items-center h-64">
              <p className="text-red-400">Student profile data unavailable.</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left Column: Student Info + Radar Chart */}
              <div className="w-full md:w-1/2 space-y-6">
                {/* Basic Info */}
                <div className="space-y-2">
                  <h4 className="text-lg font-medium text-gray-100">
                    Student: {studentName}
                  </h4>
                  <div className="text-gray-400">
                    <p>ID: {studentId}</p>
                    <p>Dominant Trait(s): {dominantTraits}</p>
                  </div>
                </div>

                {/* Radar Chart */}
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      data={radarData}
                    >
                      <PolarGrid stroke="#4B5563" />
                      <PolarAngleAxis
                        dataKey="trait"
                        stroke="#9CA3AF"
                        tick={{ fontSize: 12 }}
                      />
                      <PolarRadiusAxis
                        stroke="#4B5563"
                        domain={[0, 5]}
                        tickCount={6}
                      />
                      <Radar
                        name="Traits"
                        dataKey="score"
                        stroke="#60A5FA"
                        fill="#60A5FA"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right Column: Traits + Insights */}
              <div className="w-full md:w-1/2 space-y-4">
                <h4 className="text-lg font-medium text-gray-100">
                  Personality Traits:
                </h4>
                {traits.map((trait, index) => (
                  <div key={index} className="space-y-2">
                    <div
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-700/30 p-2 rounded"
                      onClick={() => toggleTrait(trait.trait)}
                      title="Click to view interpretation and teaching suggestions"
                    >
                      <div className="flex items-center space-x-2">
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            expandedTraits[trait.trait] ? "rotate-180" : ""
                          }`}
                        />
                        <span className="text-gray-200 font-medium flex items-center gap-1">
                          {trait.trait}
                          {dominantTraits.includes(trait.trait) && (
                            <span
                              className="text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm border border-blue-500 animate-pulse"
                              title="Most Dominant Trait"
                            >
                              🌟
                            </span>
                          )}
                        </span>
                      </div>

                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          trait.level === "High"
                            ? "bg-green-900/50 text-green-200"
                            : trait.level === "Moderate"
                            ? "bg-yellow-900/50 text-yellow-200"
                            : "bg-red-900/50 text-red-200"
                        }`}
                      >
                        {trait.level}
                      </span>
                    </div>

                    <p className="text-gray-400 text-sm">
                      Score: {trait.score}
                    </p>

                    <div
                      className={`overflow-hidden transition-all duration-300 ${
                        expandedTraits[trait.trait]
                          ? "max-h-40 opacity-100 mt-2"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <div className="ml-2 border-l-4 border-blue-500 pl-3 text-sm text-gray-300">
                        <p>
                          <strong className="text-blue-400">
                            Interpretation:
                          </strong>{" "}
                          {traitInsights[trait.trait]?.interpretation}
                        </p>
                        <p>
                          <strong className="text-blue-400">
                            Recommendation:
                          </strong>{" "}
                          {traitInsights[trait.trait]?.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
