// src/bedrock.js
//
// Two Bedrock calls, kept deliberately separate:
//   1. reason()  — Claude decides what action (if any) to take, given
//      MCP context + relevant Agent Skill guidance.
//   2. embed()   — Titan embeddings for a piece of text, used both when
//      writing a new decision's reasoning_text AND when embedding a
//      user's "why did you..." question for similarity search.
//
// Keeping these separate (rather than one do-everything function) makes
// each easy to test and easy to swap models independently later.

import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import crypto from "crypto";

const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || "us-east-1" });

const REASONING_MODEL_ID = process.env.BEDROCK_MODEL_ID; // e.g. an Anthropic Claude model id available in your account
const EMBEDDING_MODEL_ID = process.env.BEDROCK_EMBEDDING_MODEL_ID; // e.g. amazon.titan-embed-text-v2:0

/**
 * Ask the model to decide on an action given the current situation.
 * Returns a structured object: { actionType, reasoningText, confidence, ccloudCommand|null }
 *
 * @param {object} params
 * @param {object} params.mcpContext - cluster snapshot from the Go MCP client
 * @param {object[]} params.relevantSkills - [{ name, body }] from the Go skill loader
 * @param {object[]} params.similarPastDecisions - top-k similar decisions, for continuity
 */
export async function reason({ mcpContext, relevantSkills, similarPastDecisions }) {
  if (process.env.USE_MOCK_BEDROCK === "true") {
    console.log("Using Mock Bedrock for reasoning");
    const cpu = mcpContext?.cpu_percent || 0;
    if (cpu > 70) {
      return {
        actionType: "scale_up",
        reasoningText: `Mock reasoning: CPU usage is high at ${cpu}%. Recommending scaling up cluster per performance-and-scaling skill guidance.`,
        confidence: 0.9,
        ccloudCommand: "ccloud cluster scale --nodes +1 --cluster infra-historian-demo"
      };
    }
    return {
      actionType: "no_action",
      reasoningText: "Mock reasoning: Routine health check shows normal CPU and active query levels. No scaling or maintenance actions required.",
      confidence: 0.95,
      ccloudCommand: null
    };
  }

  const skillsText = relevantSkills
    .map((s) => `### Skill: ${s.name}\n${s.body}`)
    .join("\n\n");

  const historyText = similarPastDecisions
    .map((d) => `- [${d.actionType}] ${d.reasoningText} (outcome: ${d.outcome || "n/a"})`)
    .join("\n");

  const prompt = `You are an infrastructure agent responsible for a CockroachDB cluster.
You must decide whether an action is needed, and explain your reasoning clearly enough
that a future version of yourself (or a human) can understand the decision months later.

Current cluster state (from the Managed MCP Server, read-only):
${JSON.stringify(mcpContext, null, 2)}

Relevant CockroachDB Agent Skills guidance:
${skillsText || "(none matched this situation)"}

Similar past decisions you have made:
${historyText || "(no similar precedent found)"}

Respond ONLY with a JSON object, no other text, in this exact shape:
{
  "actionType": "backup" | "scale_up" | "no_action" | "schema_review",
  "reasoningText": "clear explanation of why, referencing the skill guidance and any precedent used",
  "confidence": 0.0-1.0,
  "ccloudCommand": "the exact ccloud command if actionType requires one, otherwise null"
}`;

  const command = new InvokeModelCommand({
    modelId: REASONING_MODEL_ID,
    contentType: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const response = await client.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  const text = body.content?.[0]?.text ?? "{}";

  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Bedrock did not return valid JSON: ${text}`);
  }
}

/**
 * Compute an embedding for a piece of text (Titan Embeddings v2, 1536 dims
 * to match the VECTOR(1536) column in db/schema.sql — confirm dimension
 * matches whatever embedding model id you actually use).
 */
export async function embed(text) {
  if (process.env.USE_MOCK_BEDROCK === "true") {
    const isCohere = EMBEDDING_MODEL_ID?.startsWith("cohere");
    const dimension = isCohere ? 1024 : 1536;
    
    // Deterministic LCG based on SHA-256 hash of text
    const hash = crypto.createHash("sha256").update(text).digest();
    let seed = hash.readUInt32LE(0) || 1;
    const lcg = () => {
      seed = (1103515245 * seed + 12345) % 2147483648;
      return seed / 2147483648;
    };
    
    const vector = [];
    for (let i = 0; i < dimension; i++) {
      vector.push(lcg() * 2 - 1);
    }
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }

  const isCohere = EMBEDDING_MODEL_ID.startsWith("cohere");
  const bodyPayload = isCohere
    ? { texts: [text], input_type: "search_document" }
    : { inputText: text };

  const command = new InvokeModelCommand({
    modelId: EMBEDDING_MODEL_ID,
    contentType: "application/json",
    body: JSON.stringify(bodyPayload),
  });

  let retries = 5;
  let delay = 2000;
  while (retries > 0) {
    try {
      const response = await client.send(command);
      const body = JSON.parse(new TextDecoder().decode(response.body));
      return isCohere ? body.embeddings[0] : body.embedding; // number[]
    } catch (err) {
      if (err.name === 'ThrottlingException' || err.$metadata?.httpStatusCode === 429) {
        console.warn(`Bedrock rate limit hit, retrying in ${delay}ms... (${retries} retries left)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        retries--;
        delay *= 2; // exponential backoff
      } else {
        throw err;
      }
    }
  }
  throw new Error("Failed to get embedding from Bedrock after multiple retries due to throttling.");
}
