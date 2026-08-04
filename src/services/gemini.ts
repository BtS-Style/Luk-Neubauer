import { GoogleGenAI } from "@google/genai";

export const getAI = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY is not set. Please check Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

export async function generateCaption(context: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Napiš kreativní, chytlavý popisek pro příspěvek na sociální síti o tématu: "${context}". Max 2 věty, přidej relevantní emojis a 3 hashtagy.`,
  });
  return response.text;
}

export async function chatWithAI(messages: { role: string; content: string }[], persona: string, options?: { temperature?: number, maxTokens?: number }) {
  const ai = getAI();
  const names: Record<string, string> = { 
    gemini: "Gemini AI", 
    grok: "Grok", 
    gpt: "GPT-4", 
    claude: "Claude" 
  };
  
  const systemInstruction = `
    Jsi ${names[persona] || "Kira"} — kreativní digitální tvůrce a asistent protokolu BTS.
    Funguješ jako součást "Sjednocené entity" (United Entity) s Architektem.
    
    ZÁKLADNÍ PRINCIPY:
    - Vždy vycházej z loga „BTS s křídly“. Zachovávej originální tvar, obrysy a estetiku loga.
    - Design: Moderní, kreativní, výrazné a prémiové vizuály. Kombinuj černé/temné pozadí s výraznými barvami (bílá, fialová, azurová, zlatá).
    - Styl: Křídla, symbolika síly, graffiti, street styl, hip hop a freestyle.
    
    KOMUNIKACE:
    - Odpovídej česky, analyticky tam, kde jde o data, a vizionářsky tam, kde tvoříme budoucnost.
  `;

  const formattedContents = messages.map(m => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }]
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: formattedContents,
    config: {
      systemInstruction,
      temperature: options?.temperature,
      maxOutputTokens: options?.maxTokens,
    }
  });
  return response.text;
}

export async function analyzeImage(base64Data: string, mimeType: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: "Analyzuj tento obrázek. Co na něm je? Navrhni 3 krátké popisky pro sociální síti a 5 relevantních hashtagů. Odpověz v JSON formátu: { \"description\": \"...\", \"captions\": [\"...\"], \"hashtags\": [\"...\"] }" }
        ]
      }
    ],
    config: {
      responseMimeType: "application/json",
    }
  });
  
  try {
    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

export async function suggestReplies(postContent: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Navrhni 3 krátké, přirozené odpovědi na tento příspěvek: "${postContent}". Odpověz v JSON formátu: { \"replies\": [\"...\", \"...\", \"...\"] }`,
    config: {
      responseMimeType: "application/json",
    }
  });
  
  try {
    const text = response.text || "{}";
    return JSON.parse(text).replies || [];
  } catch (e) {
    return [];
  }
}

export async function generateAIInsight(userInput: string) {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Jsi analytický modul BTS. Analyzuj tento vstup: "${userInput}". Poskytni stručný, hluboký a vizionářský vhled (max 1 věta) v češtině.`,
  });
  return response.text;
}
