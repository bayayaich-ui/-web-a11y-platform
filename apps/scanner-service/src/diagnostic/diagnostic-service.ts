import { GoogleGenerativeAI } from "@google/generative-ai";
import { DIAGNOSTIC_SYSTEM_PROMPT } from "./prompts/diagnostic-prompt";
import { ViolationBrute, DiagnosticResponse } from "./types";
import { DiagnosticResponseSchema } from "./schema";

export class DiagnosticParsingError extends Error {
  constructor(message: string, public rawResponse: string) {
    super(message);
    this.name = 'DiagnosticParsingError';
  }
}

export class DiagnosticService {
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

  async genererDiagnostic(violation: ViolationBrute): Promise<DiagnosticResponse> {
    if (!this.model) {
      throw new Error('Gemini API key is missing or invalid. Diagnostic IA unavailable.');
    }
    const prompt = `
${DIAGNOSTIC_SYSTEM_PROMPT}

Voici la violation axe-core à analyser :

${JSON.stringify(violation, null, 2)}
`;

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this.model.generateContent(prompt);
        const rawResponse = result.response.text();

        if (!rawResponse) {
          throw new DiagnosticParsingError("Réponse Gemini vide", "");
        }

        return this.parseAndValidate(rawResponse);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Tentative ${attempt + 1}/${this.maxRetries + 1} échouée:`, error);
        const status = (error as { status?: number }).status;
        if (status === 401 || status === 403 || status === 429) break;
      }
    }

    throw new Error(
      `Échec du diagnostic après ${this.maxRetries + 1} tentatives: ${lastError?.message}`
    );
  }

  private parseAndValidate(rawResponse: string): DiagnosticResponse {
    const cleaned = this.stripMarkdownFences(rawResponse);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new DiagnosticParsingError(
        `JSON invalide reçu du LLM: ${cleaned.slice(0, 200)}`,
        rawResponse
      );
    }

    const validation = DiagnosticResponseSchema.safeParse(parsed);

    if (!validation.success) {
      const issues = validation.error.issues
        .map(i => `${i.path.join('.')}: ${i.message}`)
        .join(', ');
      throw new DiagnosticParsingError(
        `Structure JSON invalide: ${issues}`,
        rawResponse
      );
    }

    return validation.data;
  }

  private stripMarkdownFences(response: string): string {
    return response
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");
  }
}