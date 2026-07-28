export interface ViolationBrute {
  rule: string;
  html: string;
  impact: string;
  description: string;
}

export interface Correctif {
  rule: string;
  code_original: string;
  code_corrige: string;
  explication: string;
  type_correctif: "automatique" | "manuel";
}
