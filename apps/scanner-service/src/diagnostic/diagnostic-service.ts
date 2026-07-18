import { GoogleGenerativeAI } from "@google/generative-ai";
import { DIAGNOSTIC_SYSTEM_PROMPT } from "./prompts/diagnostic-prompt";
import { ViolationBrute, DiagnosticResponse } from "./types";

export class DiagnosticService {
  private model;

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);

    this.model = genAI.getGenerativeModel({
      model: "gemini-2.5-pro",
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
      throw new Error(
        "Réponse Gemini vide"
      );
    }


    return JSON.parse(response) as DiagnosticResponse;
  }
}
