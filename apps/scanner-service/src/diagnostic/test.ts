import 'dotenv/config';
import { DiagnosticService } from './diagnostic-service';


const violation = {
  rule: "image-alt",
  impact: "critical",
  element: "<img src='logo.png'>",
  message: "Images must have alternative text",
  wcag: ["1.1.1"],
  help: "Images must have alt attribute"
};


const service = new DiagnosticService(
  process.env.GEMINI_API_KEY!
);


service.genererDiagnostic(violation)
  .then((result) => {
    console.log(
      JSON.stringify(result, null, 2)
    );
  })
  .catch((error) => {
    console.error(error);
  });
