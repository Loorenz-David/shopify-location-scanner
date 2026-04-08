import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
const envCandidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "apps/backend/.env"),
];
for (const envPath of envCandidates) {
    if (!existsSync(envPath)) {
        continue;
    }
    loadDotenv({ path: envPath });
    break;
}
//# sourceMappingURL=load-env.js.map