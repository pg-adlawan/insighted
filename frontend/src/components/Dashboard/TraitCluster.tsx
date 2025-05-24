import { useEffect, useState } from "react";

const TRAIT_DESCRIPTIONS: { [trait: string]: string } = {
  Openness:
    "Openness (also referred to as openness to experience) emphasizes imagination and insight the most out of all five personality traits. People who are high in openness tend to have a broad range of interests. They are curious about the world and other people and are eager to learn new things and enjoy new experiences.\nPeople who are high in this personality trait also tend to be more adventurous and creative. Conversely, people low in this personality trait are often much more traditional and may struggle with abstract thinking. (Source: Verywell Mind)",
  Conscientiousness:
    "Conscientiousness is defined by high levels of thoughtfulness, good impulse control, and goal-directed behaviors. Highly conscientious people tend to be organized and mindful of details. They plan ahead, consider how their behavior affects others, and are conscious of deadlines.\nIf a person scores low on this personality trait, it might mean they are less structured and organized. They may procrastinate when it comes to getting things done, sometimes missing deadlines completely. (Source: Verywell Mind)",
  Extraversion:
    "Extraversion (or extroversion) is a personality trait characterized by excitability, sociability, talkativeness, assertiveness, and high amounts of emotional expressivenessa. People high in extraversion are outgoing and tend to gain energy in social situations. Being around others helps them feel energized and excited.\nPeople who are low in this personality trait (or introverted) tend to be more reserved. They have less energy in social settings, and social events can feel draining. Introverts often require a period of solitude and quiet to \"recharge.\" (Source: Verywell Mind)",
  Agreeableness:
    "This personality trait includes attributes such as trust, altruism, kindness, affection, and other prosocial behaviors. People who are high in agreeableness tend to be more cooperative while those low in this personality trait tend to be more competitive and sometimes even manipulative. (Source: Verywell Mind)",
  Neuroticism:
    "Neuroticism is a personality trait characterized by sadness, moodiness, and emotional instability.1 This trait is generally defined as a negative personality trait that can have detrimental effects on a person's life and well-being. Individuals who are high in neuroticism tend to experience mood swings, anxiety, irritability, and sadness.People who are low in this personality trait tend to be more stable and emotionally resilient.(Source: Verywell Mind)",
};

const TraitCluster = ({ selectedSubject }: { selectedSubject: string }) => {
  const [clusters, setClusters] = useState<{
    [trait: string]: { id: string; name: string }[];
  }>({});
  const [loading, setLoading] = useState(true);
  const [interventions, setInterventions] = useState<{
    [trait: string]: string;
  }>({});
  const [loadingTraits, setLoadingTraits] = useState<string[]>([]);

  useEffect(() => {
    setLoading(true);
    fetch(
      `${import.meta.env.VITE_API_URL}/teacher/clustered-students${
        selectedSubject !== "All" ? `?subject=${selectedSubject}` : ""
      }`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    )
      .then((res) => res.json())
      .then((data) => {
        console.log("✅ Clustered students data received:", data);
        setClusters(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch clusters", err);
        setLoading(false);
      });
  }, [selectedSubject]);

  useEffect(() => {
    const traits = Object.keys(clusters);

    if (traits.length === 0) return;

    const fetchAllInterventions = async () => {
      const resultMap: { [trait: string]: string } = {};
      setLoadingTraits(traits); // Show loading UI while fetching

      for (const trait of traits) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_URL}/teacher/trait-intervention?trait=${trait}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          const data = await response.json();
          resultMap[trait] = data.recommendation || "No intervention found.";
        } catch (err) {
          resultMap[trait] = "Error fetching intervention.";
        }
      }

      setInterventions(resultMap);
      setLoadingTraits([]); // Done loading
    };

    fetchAllInterventions();
  }, [clusters]);

  if (loading) {
    return <p className="text-sm text-gray-300">Loading trait clusters...</p>;
  }

  if (Object.keys(clusters).length === 0) {
    return (
      <p className="text-sm text-gray-400 italic mt-6">
        No clustered students found for this subject.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(clusters).map(([trait, students], index) => (
        <div
          key={index}
          className="border border-gray-600 rounded-lg p-6 bg-gray-800 text-white shadow-sm"
        >
          <h2 className="text-xl font-semibold text-blue-300 mb-2">{trait}</h2>

          <p className="text-sm text-gray-300 mb-3 italic">
            {TRAIT_DESCRIPTIONS[trait] || "No description available."}
          </p>

          <h3 className="text-sm font-semibold text-gray-400 mb-1">
            AI-Generated Teaching Intervention:
          </h3>
          <p className="text-sm text-blue-100 bg-gray-700 p-3 rounded mb-4 whitespace-pre-line">
            {loadingTraits.includes(trait)
              ? "Generating suggestion..."
              : interventions[trait] || "No suggestion available."}
          </p>

          <h4 className="text-sm font-semibold text-gray-400 mb-1">
            Students with this dominant trait:
          </h4>
          <ul className="list-disc pl-6 text-sm text-white">
            {(students as any[]).map((student, i) => (
              <li key={i}>
                {student.name} ({student.id})
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default TraitCluster;
