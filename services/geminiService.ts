import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult, Category, Sentiment } from "../types";

const apiKey = process.env.GOOGLE_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeFeedbackWithGemini = async (feedbackText: string): Promise<AnalysisResult> => {
  if (!apiKey) {
    // Fallback for demo if no key is present, though typically we'd throw error or handle UI
    console.warn("No API Key found. Returning mock analysis.");
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          sentiment: Sentiment.NEUTRAL,
          category: Category.OTHER,
          tags: ['Mock', 'Analysis', 'Demo'],
          summary: 'Analysis requires a valid API key. This is a mock response.'
        });
      }, 1500);
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following user feedback for a mobile application to provide structured insights.

      Tasks:
      1. **Sentiment Analysis**: Determine if the feedback is Positive, Negative, or Neutral.
      2. **Tagging**: Suggest 3-5 relevant, specific tags based on the content (e.g., specific features, bug types, or UI elements mentioned).
      3. **Categorization**: Classify the feedback into the most appropriate category.
      4. **Summarization**: Write a concise one-sentence summary.
      
      Feedback: "${feedbackText}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sentiment: {
              type: Type.STRING,
              enum: [Sentiment.POSITIVE, Sentiment.NEGATIVE, Sentiment.NEUTRAL],
              description: "The overall sentiment of the feedback."
            },
            category: {
              type: Type.STRING,
              enum: [Category.BUG, Category.FEATURE, Category.UX_UI, Category.PERFORMANCE, Category.OTHER],
              description: "The main category of the feedback."
            },
            tags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of 3-5 relevant tags extracted from the feedback content."
            },
            summary: {
              type: Type.STRING,
              description: "A concise summary of the feedback."
            },
          },
          required: ["sentiment", "category", "tags", "summary"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const result = JSON.parse(text) as AnalysisResult;
    return result;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};