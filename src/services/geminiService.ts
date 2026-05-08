import { GoogleGenAI, Type } from "@google/genai";

// Initialize the API client. In the browser, Vite handles replacing process.env.GEMINI_API_KEY
// using the proxy key for AI Studio Free Tier.
const aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const analyzeIssueImage = async (base64Image: string, mimeType: string) => {
    try {
        const base64Data = base64Image.split(',')[1] || base64Image;

        const response = await aiClient.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [
                {
                    inlineData: {
                        data: base64Data,
                        mimeType: mimeType,
                    }
                },
                { text: "Analyze this image of a civic issue (e.g. pothole, garbage, streetlight out, water leak). Provide a short descriptive title, the appropriate category (Road Maintenance, Water & Sanitation, Electrical & Streetlights, Garbage & Waste, Public Infrastructure), and a priority level based on severity (LOW, MEDIUM, HIGH, URGENT)." }
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: {
                            type: Type.STRING,
                            description: "A short, descriptive title for the issue (e.g., 'Large pothole on main road')."
                        },
                        category: {
                            type: Type.STRING,
                            description: "One of: 'Road Maintenance', 'Water & Sanitation', 'Electrical & Streetlights', 'Garbage & Waste', 'Public Infrastructure'."
                        },
                        priority: {
                            type: Type.STRING,
                            description: "The priority of the issue based on its severity: 'LOW', 'MEDIUM', 'HIGH', or 'URGENT'."
                        }
                    },
                    required: ["title", "category", "priority"]
                }
            }
        });

        const text = response.text;
        if (!text) {
            throw new Error("No response from AI");
        }

        return JSON.parse(text) as { title: string, category: string, priority: string };
    } catch (error) {
        console.error("Error analyzing image directly:", error);
        throw error;
    }
};
