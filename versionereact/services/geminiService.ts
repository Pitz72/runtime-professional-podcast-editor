import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { AudioPreset } from '../types';
import { AI_PRESET_NAME } from "../constants";

const ai = new GoogleGenAI({apiKey: process.env.API_KEY});

/**
 * Generates an audio enhancement preset using the Gemini API.
 * @param description A description of the audio to be enhanced (e.g., "A podcast voice with background noise").
 * @returns A promise that resolves to an AudioPreset object or null if an error occurs.
 */
export async function getAudioEnhancementPreset(description: string): Promise<AudioPreset | null> {
  const prompt = `
    You are a professional audio engineer. Your task is to provide optimal settings for a compressor and a multi-band equalizer to enhance a voice recording for a podcast.
    The recording is described as: "${description}".
    The goal is to make it sound clean, clear, and professional by reducing background noise and removing unpleasant room reverberation.
    
    The available equalizer filter types are: 'lowshelf', 'highshelf', 'peaking', 'lowpass', 'highpass'.

    Provide your response as a single, valid JSON object. Do not include any explanatory text or markdown formatting like \`\`\`json.
    The JSON object must have the following exact structure:
    {
      "name": "${AI_PRESET_NAME}",
      "compressor": {
        "threshold": <number between -100 and 0>,
        "knee": <number between 0 and 40>,
        "ratio": <number between 1 and 20>,
        "attack": <number between 0 and 1>,
        "release": <number between 0 and 1>
      },
      "equalizer": [
        { "type": "<filter_type>", "frequency": <number between 20 and 20000>, "Q": <number between 0.1 and 18>, "gain": <number between -24 and 24> },
        ...
      ]
    }
    The "gain" property is only applicable for 'lowshelf', 'highshelf', and 'peaking' filters. Do not include it for other types.
    The "Q" property is primarily for 'peaking', 'lowpass' and 'highpass'.
    A good starting point is a high-pass filter to cut low-end rumble, a gentle compressor, and some peaking filters to manage frequencies.
  `;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-04-17",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
    });

    const jsonStr = response.text.trim();
    // Although we request JSON, the model might still wrap it in markdown.
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    const finalJsonStr = match && match[2] ? match[2].trim() : jsonStr;

    const parsedData = JSON.parse(finalJsonStr) as AudioPreset;

    // Basic validation
    if (parsedData.name && parsedData.compressor && Array.isArray(parsedData.equalizer)) {
      return parsedData;
    }
    console.error("Parsed JSON does not match expected AudioPreset structure:", parsedData);
    return null;

  } catch (e) {
    console.error("Failed to get or parse AI audio enhancement preset:", e);
    return null;
  }
}
