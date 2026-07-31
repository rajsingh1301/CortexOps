// scripts/backfill_embeddings.js
//
// Run this once after `db/seed.sql` to fill in real embeddings for the
// sample rows (which were inserted with a NULL embedding, since hand-
// writing 1536-dim vectors in SQL isn't practical). This proves the
// vector index actually works with real Bedrock output before you build
// any agent logic on top of it — do this as your literal first "does
// this work" checkpoint in Week 1.
//
// Usage: npm run seed:embeddings

import "dotenv/config";
import pg from "pg";
import { embed } from "../src/bedrock.js";

const pool = new pg.Pool({ connectionString: process.env.COCKROACH_CONN_STRING });

async function main() {
  const { rows } = await pool.query(
    `SELECT id, reasoning_text FROM decisions WHERE embedding IS NULL`
  );

  console.log(`backfilling embeddings for ${rows.length} row(s)...`);

  for (const row of rows) {
    const vector = await embed(row.reasoning_text);
    const vectorStr = `[${vector.join(",")}]`;
    await pool.query(`UPDATE decisions SET embedding = $2 WHERE id = $1`, [
      row.id,
      vectorStr,
    ]);
    console.log(`  done: ${row.id}`);
    // Sleep to avoid AWS Bedrock ThrottlingException
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }


  console.log("backfill complete. Sanity check with:");
  console.log(`  SELECT action_type, reasoning_text FROM decisions
  ORDER BY embedding <-> (SELECT embedding FROM decisions LIMIT 1) LIMIT 3;`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
