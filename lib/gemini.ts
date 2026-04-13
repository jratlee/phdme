import { GoogleGenAI, Type } from "@google/genai";
import { NarrativeSite } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const generateNarrative = async (text: string): Promise<Partial<NarrativeSite>> => {
  const prompt = `
    You are an expert science communicator. Your task is to transform a dense research paper into an elegant, interactive narrative site.
    
    Paper Text:
    ${text.substring(0, 30000)} // Limit text to avoid token limits
    
    Generate a structured JSON response with the following fields:
    - title: A compelling, accessible title for the site.
    - authors: List of authors.
    - paperAbstract: A brief, engaging summary of the core discovery.
    - sections: An array of 5-8 sections. Each section should have:
        - title: Section heading.
        - content: 2-3 paragraphs of accessible explanation.
        - type: One of "text", "diagram", "quote", "metric".
        - visualData: If type is "metric", provide an object with { label: string, value: number, unit: string }. If type is "diagram", provide a brief description of what to visualize.
    
    The narrative should flow like a high-end magazine feature (e.g., Nature, Wired, or National Geographic).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          authors: { type: Type.ARRAY, items: { type: Type.STRING } },
          paperAbstract: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                type: { type: Type.STRING, enum: ["text", "diagram", "quote", "metric"] },
                visualData: { type: Type.OBJECT }
              },
              required: ["title", "content", "type"]
            }
          }
        },
        required: ["title", "authors", "sections"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};
