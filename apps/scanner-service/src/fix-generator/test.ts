import 'dotenv/config';
import { FixGenerator } from './fix-generator';
import { ViolationBrute } from './types';

const violation: ViolationBrute = {
  rule: "image-alt",
  impact: "critical",
  html: "<img src='logo.png'>",
  description: "Images must have alternative text",
};
console.log("Clé chargée :", process.env.GEMINI_API_KEY?.slice(0, 10) + "...");
const generator = new FixGenerator(process.env.GEMINI_API_KEY!);

generator.genererCorrectif(violation)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
  });
