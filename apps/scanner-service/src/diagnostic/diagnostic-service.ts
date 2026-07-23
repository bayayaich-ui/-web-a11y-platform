import { GoogleGenerativeAI } from "@google/generative-ai";
import { DIAGNOSTIC_SYSTEM_PROMPT } from "./prompts/diagnostic-prompt";
import { ViolationBrute, DiagnosticResponse } from "./types";

export class DiagnosticService {
  private model;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);

    this.model = genAI.getGenerativeModel({
      model: "gemini-3.1-flash-lite",
    });
  }

  async genererDiagnostic(
    violation: ViolationBrute
  ): Promise<DiagnosticResponse> {

    const prompt = `
${DIAGNOSTIC_SYSTEM_PROMPT}

Voici la violation axe-core à analyser :

${JSON.stringify(violation, null, 2)}

Retourne uniquement un JSON valide.
`;

    const result = await this.model.generateContent(prompt);
    const response = result.response.text();

    if (!response) {
      throw new Error("Réponse Gemini vide");
    }

    return this.parseJsonResponse(response);
  }

  private parseJsonResponse(response: string): DiagnosticResponse {
    // Gemini entoure parfois sa réponse de balises markdown (```json ... ```)
    // malgré la consigne — on les retire avant de parser, sinon JSON.parse plante
    const cleaned = response
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "");

    try {
      return JSON.parse(cleaned) as DiagnosticResponse;
    } catch (error) {
      throw new Error(
        `Réponse Gemini non parsable en JSON : ${cleaned.slice(0, 200)}...`
      );
    }
  }
}