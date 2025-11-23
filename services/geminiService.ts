import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize the client once
// API Key is strictly from process.env.API_KEY as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image'; 

/**
 * Generates text response, optionally with an image attachment (Vision).
 */
export const generateText = async (
  prompt: string,
  base64Image?: string,
  mimeType: string = 'image/jpeg'
): Promise<string> => {
  try {
    let contents: any;

    if (base64Image) {
      // Multimodal request
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: prompt,
          },
        ],
      };
    } else {
      // Text-only request
      contents = prompt;
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: contents,
    });

    return response.text || "No response text generated.";
  } catch (error) {
    console.error("Error generating text:", error);
    throw error;
  }
};

/**
 * Generates an image based on a prompt.
 * Uses gemini-2.5-flash-image which returns the image in the response parts.
 */
export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: {
        parts: [
          {
             text: prompt
          }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          // imageSize not supported on flash-image, only pro-image-preview
        }
      }
    });

    // Iterate to find the image part
    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data found in response.");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const getAIClient = () => ai;
