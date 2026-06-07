import { describe, expect, it } from "vitest";
import { createAiService } from "@/lib/server/ai-service";
import { planAgentTools } from "@/lib/server/agent-planner";
import { writeAgentReportDraft } from "@/lib/server/report-writer";
import type { WorkspaceRunContext, XApiTrace } from "@/lib/types";

const context: WorkspaceRunContext = {
  topic: "$ETH",
  mode: "Risk Scan",
  advancedFilters: {
    evidenceWindow: "24h",
    minimumConfidence: "0.65",
    xapiClasses: "Twitter + Web + News + Crypto"
  },
  createdAt: "12:00:00"
};

describe("AI service", () => {
  it("returns disabled fallback when AI_API_KEY is missing", async () => {
    const service = createAiService({
      env: {
        AI_ENABLED: "true",
        AI_MODEL: "gpt-4.1-mini",
        AI_BASE_URL: "https://example.invalid/v1"
      }
    });

    const result = await service.generate({ system: "system", user: "user" });

    expect(result.ok).toBe(false);
    expect(result.mode).toBe("disabled");
    expect(result.error?.code).toBe("AI_API_KEY_MISSING");
    expect(result.trace.promptHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("uses a custom OpenAI-compatible base URL and parses JSON output", async () => {
    let requestedUrl = "";
    const service = createAiService({
      env: {
        AI_ENABLED: "true",
        AI_API_KEY: "unit-test-secret",
        AI_MODEL: "custom-model",
        AI_BASE_URL: "https://llm.example.test/v1"
      },
      fetcher: async (url) => {
        requestedUrl = String(url);
        return Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({ ok: true })
              }
            }
          ]
        });
      }
    });

    const result = await service.generate<{ ok: boolean }>({ system: "system", user: "user" });

    expect(requestedUrl).toBe("https://llm.example.test/v1/chat/completions");
    expect(result.ok).toBe(true);
    expect(result.data?.ok).toBe(true);
    expect(result.model).toBe("custom-model");
    expect(result.baseUrl).toBe("https://llm.example.test/v1");
  });

  it("redacts AI_API_KEY from upstream errors", async () => {
    const service = createAiService({
      env: {
        AI_ENABLED: "true",
        AI_API_KEY: "unit-test-secret",
        AI_BASE_URL: "https://llm.example.test/v1"
      },
      fetcher: async () =>
        Response.json(
          {
            error: {
              message: "Bearer unit-test-secret failed"
            }
          },
          { status: 500 }
        )
    });

    const result = await service.generate({ system: "system", user: "user" });

    expect(result.ok).toBe(false);
    expect(result.error?.message).not.toContain("unit-test-secret");
    expect(result.error?.message).toContain("[redacted]");
  });
});

describe("AI planner and report writer", () => {
  it("falls back to the rule planner when AI is disabled", async () => {
    const service = createAiService({
      env: {
        AI_ENABLED: "false"
      }
    });

    const result = await planAgentTools({ context, aiService: service });

    expect(result.mode).toBe("disabled");
    expect(result.plan.selectedTools.length).toBeGreaterThanOrEqual(3);
    expect(result.plan.reason).toContain("Rule planner");
  });

  it("accepts a legal AI tool plan and filters to available tools", async () => {
    const service = createAiService({
      env: {
        AI_ENABLED: "true",
        AI_API_KEY: "unit-test-secret"
      },
      fetcher: async () =>
        Response.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  objective: "ETH risk review",
                  selectedTools: ["twitter.search", "web.search.realtime"],
                  reason: "Cross-check social and web evidence.",
                  evidenceStrategy: "Collect live evidence and compare narratives.",
                  riskQuestions: ["Are signals consistent?"]
                })
              }
            }
          ]
        })
    });

    const result = await planAgentTools({
      context,
      aiService: service,
      availableTools: ["twitter.search", "web.search.realtime"]
    });

    expect(result.mode).toBe("live");
    expect(result.plan.selectedTools).toEqual(["twitter.search", "web.search.realtime"]);
  });

  it("falls back when the AI report writer returns invalid JSON", async () => {
    const service = createAiService({
      env: {
        AI_ENABLED: "true",
        AI_API_KEY: "unit-test-secret"
      },
      fetcher: async () =>
        Response.json({
          choices: [
            {
              message: {
                content: "{not valid json"
              }
            }
          ]
        })
    });
    const traces: XApiTrace[] = [
      {
        id: "trace-1",
        taskId: "task-1",
        source: "xapi",
        action: "twitter.search_timeline",
        capability: "Twitter / X",
        schemaFetched: true,
        inputHash: "0xinput",
        outputHash: "0xoutput",
        outputPreview: "fallback: social signal",
        startedAt: "12:00:00",
        endedAt: "12:00:01",
        status: "fallback",
        latencyMs: 1,
        method: "POST",
        headers: {},
        input: {},
        output: {},
        sourceMode: "fallback"
      }
    ];

    const result = await writeAgentReportDraft({
      context,
      evidence: [
        {
          id: "ev-1",
          source: "xapi:twitter.search_timeline",
          title: "Twitter signal",
          summary: "fallback social signal",
          weight: 1,
          confidence: 0.66,
          sourceMode: "fallback"
        }
      ],
      traces,
      sourceMode: "fallback",
      aiService: service
    });

    expect(result.mode).toBe("fallback");
    expect(result.draft.title).toContain("ETH");
    expect(result.draft.riskScore).toBeGreaterThanOrEqual(0);
  });
});
