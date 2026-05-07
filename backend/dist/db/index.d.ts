import postgres from "postgres";
import * as schema from "./schema.js";
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql<{}>;
};
export * from "./schema.js";
export declare function checkDatabaseConnection(): Promise<boolean>;
export declare function closeDatabaseConnection(): Promise<void>;
//# sourceMappingURL=index.d.ts.map