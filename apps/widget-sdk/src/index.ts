import { applyAccessibilityFixes } from "./fixes";

window.addEventListener("DOMContentLoaded", () => {
  console.log("Widget SDK chargé.");

  applyAccessibilityFixes();
});
