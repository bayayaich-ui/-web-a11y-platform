import '../src/load-env';
import { FixGenerator } from '../src/fix-generator/fix-generator';

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY in env');
    process.exit(1);
  }

  const fg = new FixGenerator(apiKey);
  const sampleViolation = {
    rule: 'color-contrast',
    html: '<button style="color:#777;">Click me</button>',
    impact: 'moderate',
    description: 'Low contrast button',
  };

  try {
    const correctif = await fg.genererCorrectif(sampleViolation as any);
    console.log('Correctif generated:', JSON.stringify(correctif, null, 2));
  } catch (e) {
    console.error('Error generating correctif:', e);
    process.exit(2);
  }
}

run();
