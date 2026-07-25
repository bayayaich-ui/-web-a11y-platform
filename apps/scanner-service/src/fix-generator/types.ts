export interface ViolationBrute {
    rule: string;
    html: string;
    impact: string;
    description: string;
}

export type Correctif = z.infer<typeof CorrectifSchema>;
// ou si tu préfères une interface manuelle :
export interface Correctif {
  rule: string;
  code_original: string;
  code_corrige: string;
  explication: string;
  type_correctif: "automatique" | "manuel";
}
