import { GoogleGenerativeAI } from "@google/generative-ai";
import { FIX_SYSTEM_PROMPT } from "./prompts/fix-prompt";
import { ViolationBrute, Correctif } from "./types";
import { CorrectifResponseSchema } from "./schema";

export class FixParsingError extends Error {
  constructor(message: string, public rawResponse: string) {
    super(message);
    this.name = 'FixParsingError';
  }
}

export class FixGenerator {
  private model;
  private readonly maxRetries = 2;

  constructor(apiKey: string) {
    if (!apiKey || !apiKey.trim()) {
      this.model = null;
      return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
    });
  }

  async genererCorrectif(violation: ViolationBrute): Promise<Correctif> {
    if (!this.model) {
      throw new Error('Gemini API key is missing or invalid. Fix generation unavailable.');
    }
    const prompt = `
${FIX_SYSTEM_PROMPT}

Voici la violation axe-core à corriger :

${JSON.stringify(violation, null, 2)}
`;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const rawResponse = result.response.text();

        if (!rawResponse) {
          throw new FixParsingError("Réponse Gemini vide", "");
        }

        return this.parseAndValidate(rawResponse);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Tentative ${attempt + 1}/${this.maxRetries + 1} échouée:`, error);
      }
    }

    throw new Error(
      `Échec de la génération du correctif après ${this.maxRetries + 1} tentatives: ${lastError?.message}`
    );
  }

  private parseAndValidate(rawResponse: string): Correctif {
    const cleaned = rawResponse
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new FixParsingError(
        `Réponse Gemini non parsable en JSON : ${cleaned.slice(0, 200)}...`,
        cleaned
      );
    }

    const result = CorrectifResponseSchema.safeParse(parsed);
    if (!result.success) {
      throw new FixParsingError(
        `Réponse Gemini invalide : ${result.error.message}`,
        cleaned
      );
    }

    return result.data.correctif;
  }
}
