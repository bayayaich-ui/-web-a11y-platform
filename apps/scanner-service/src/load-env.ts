import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

function loadEnvironmentVariables() {
  let currentDir = process.cwd();
  const rootDir = path.parse(currentDir).root;
  const envFiles: string[] = [];

  while (true) {
    const envPath = path.join(currentDir, '.env');
    if (fs.existsSync(envPath)) {
      envFiles.unshift(envPath);
    }

    if (currentDir === rootDir) {
      break;
    }

    currentDir = path.dirname(currentDir);
  }

  if (envFiles.length === 0) {
    console.warn('load-env: Aucun fichier .env trouvé en recherchant depuis', process.cwd());
    return;
  }

  for (const envPath of envFiles) {
    const result = config({ path: envPath });
    if (result.error) {
      console.warn('load-env: impossible de charger', envPath, result.error);
    }
  }
}

loadEnvironmentVariables();
