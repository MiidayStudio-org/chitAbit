// Loads the project-root .env file. Import this FIRST in any entry point:
// ES module imports run before the importing file's own code, so calling
// dotenv.config() inside index.ts would be too late for modules like db/index.ts.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
