import { GoogleGenAI, Type } from '@google/genai';

let aiClient;

function getAiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  return aiClient;
}

export async function analyzeIssueImage(base64Image, mimeType) {
  try {
    // Gemini receives the uploaded image inline so no public image URL is needed.
    const response = await getAiClient().models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: [
        {
          inlineData: { data: base64Image, mimeType }
        },
        {
          text: 'Analyze this image of a civic issue. Look carefully for road potholes, road cracks, broken pavement, garbage piles, overflowing drains, water leaks, broken streetlights, fallen electrical wires, damaged public infrastructure, or sanitation issues. Return a short specific title such as "Large pothole on road" or "Cracked road surface", the best category (Road Maintenance, Water & Sanitation, Electrical & Streetlights, Garbage & Waste, Public Infrastructure), and a priority level based on visible severity (LOW, MEDIUM, HIGH, URGENT).'
        }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            category: { type: Type.STRING },
            priority: { type: Type.STRING }
          },
          required: ['title', 'category', 'priority']
        }
      }
    });

    return JSON.parse(response.text);
  } catch (err) {
    // Reporting must still work when AI quota, credentials, or networking fail.
    console.warn('AI Analysis gracefully failed. Returning fallback data.')
    return {
      title: 'Reported Issue (Could not auto-analyze)',
      category: 'Public Infrastructure',
      priority: 'MEDIUM'
    }
  }
}
