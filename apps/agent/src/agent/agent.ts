// import { openrouter } from "@openrouter/ai-sdk-provider";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, LanguageModel, ModelMessage, ToolSet } from "ai";
import { InMemoryMessageStore, MessageStore } from "./store";
import { AgentStorageManager } from "./services/storageManager";
import { unregisterAgentIdentity } from "./services/chaoschain";
import type { NetworkComponents } from "@onchain-pal/contract-client";

const getAimoBaseURL = () => {
  if (process.env.AIMO_BASE_URL) {
    return process.env.AIMO_BASE_URL;
  }
  return process.env.AIMO_USE_PRODUCTION === "true"
    ? "https://api.aimo.network/v1"
    : "https://devnet.aimo.network/api/v1";
};

let aimoNetworkInstance: ReturnType<typeof createOpenAI> | null = null;

const getAimoNetwork = () => {
  if (!aimoNetworkInstance) {
    const apiKey = process.env.AIMO_API_KEY;
    if (!apiKey) {
      throw new Error(
        "AIMO_API_KEY environment variable is required. Get your API key from https://aimo.network",
      );
    }

    const baseURL = getAimoBaseURL().replace(/\/$/, "");
    aimoNetworkInstance = createOpenAI({
      baseURL: baseURL,
      apiKey: apiKey,
    });
  }
  return aimoNetworkInstance;
};

const aimo = (model: string) => {
  return getAimoNetwork().chat(model);
};

export type AgentStatus = "stopped" | "running" | "stopping";

export class Agent {
  readonly id: number;
  readonly model: LanguageModel;
  readonly system: string;
  readonly store: MessageStore;
  readonly tools?: ToolSet;
  readonly observe?: (id: number) => Promise<ModelMessage[]>;
  readonly storageManager?: AgentStorageManager;
  readonly components?: NetworkComponents;

  status: AgentStatus = "stopped";
  private stepCount = 0;

  constructor({
    id,
    model,
    system,
    store,
    tools,
    observe,
    storageManager,
    components,
  }: {
    id: number;
    model: LanguageModel | string;
    system: string;
    store?: MessageStore;
    tools?: ToolSet;
    observe?: (id: number) => Promise<ModelMessage[]>;
    storageManager?: AgentStorageManager;
    components?: NetworkComponents;
  }) {
    this.id = id;
    // this.model = typeof model === "string" ? openrouter(model) : model;
    this.model = typeof model === "string" ? aimo(model) : model;
    this.system = system;
    this.store = store ?? new InMemoryMessageStore();
    this.tools = tools;
    this.observe = observe;
    this.storageManager = storageManager;
    this.components = components;
  }

  async start() {
    if (this.status === "running") return;
    this.status = "running";

    while (this.status === "running") {
      try {
        await this.step();
      } catch (error) {
        console.error(`[agent ${this.id}] step error:`, error);
      }
      // brief pacing to avoid hammering provider in tight loops
      await new Promise((r) => setTimeout(r, 250));
    }

    if (this.status === "stopping") {
      this.status = "stopped";
    }
  }

  async stop(reason: "death" | "exit" | "manual" = "manual") {
    if (this.status === "running") {
      this.status = "stopping";
    }

    // Flush storage before cleanup
    if (this.storageManager) {
      await this.storageManager.onStop(reason);

      // Clean up ChaosChain registry
      unregisterAgentIdentity(this.id);
    }
  }

  async step() {
    this.stepCount++;

    const messages = await this.store.getMessages({ agentId: this.id });
    const observedMessages = (await this.observe?.(this.id)) || [];
    console.log("observedMessages", observedMessages);
    // observedMessages.forEach((m) => {
    //   console.log(`[agent ${this.id}]\n${m.content}`);
    // });
    messages.push(...observedMessages);
    // const generatedMessages = await this.generate(messages);
    const generatedMessages = await this.generate(observedMessages);
    generatedMessages.forEach((m) => {
      console.log(`[agent ${this.id}]`, m.content);
    });
    await this.store.insertMessages({
      agentId: this.id,
      messages: [...observedMessages, ...generatedMessages],
    });

    // Log decision to storage manager
    if (this.storageManager) {
      // Extract observation from observed messages
      const observation =
        observedMessages.length > 0
          ? typeof observedMessages[0].content === "string"
            ? observedMessages[0].content
            : JSON.stringify(observedMessages[0].content)
          : "";

      // Extract tool call info from generated messages
      let toolCalled: string | null = null;
      let toolParams: Record<string, unknown> | null = null;
      let result: string | null = null;
      let reasoning = "";

      for (const msg of generatedMessages) {
        if (msg.role === "assistant") {
          if (typeof msg.content === "string") {
            reasoning = msg.content;
          }
        }
        // Check for tool calls in the message
        if ("toolCalls" in msg && Array.isArray(msg.toolCalls)) {
          const firstToolCall = msg.toolCalls[0];
          if (firstToolCall) {
            toolCalled = firstToolCall.toolName || null;
            toolParams =
              (firstToolCall.args as Record<string, unknown>) || null;
          }
        }
        // Check for tool results
        if (msg.role === "tool" && "content" in msg) {
          result =
            typeof msg.content === "string"
              ? msg.content
              : JSON.stringify(msg.content);
        }
      }

      this.storageManager.log({
        step: this.stepCount,
        observation,
        reasoning,
        toolCalled,
        toolParams,
        result,
      });
    }
  }

  async generate(messages: ModelMessage[]) {
    // console.log("system", this.system);
    // console.log("messages", messages);
    const startTime = Date.now();

    const maxRetries = 3;
    let attempt = 0;
    let lastError: unknown = null;
    while (attempt < maxRetries) {
      try {
        const result = await Promise.race([
          generateText({
            model: this.model,
            system: this.system,
            tools: this.tools,
            messages,
            // providerOptions: {
            //   // openrouter: {
            //   //   parallelToolCalls: true,
            //   //   // reasoning: { effort: "low" },
            //   // openai: {
            //   //   // AiMo Network supports OpenAI-compatible options
            //   //   // Note: parallelToolCalls is not a standard OpenAI option,
            //   //   // but AiMo Network may support it. If not, remove this.
            //   // },
            // },
            // providerOptions: {
            //   openai: {
            //     // Enable parallel tool calls to allow multiple tools to be called simultaneously
            //     parallelToolCalls: true,
            //   },
            // },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error("AI call timeout after 30s")),
              30_000,
            ),
          ),
        ]);

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Calculate metrics to understand duration variance
        const toolCalls = result.toolResults || [];
        const hasToolCalls = toolCalls.length > 0;
        const reasoningLength = result.reasoningText?.length || 0;
        const inputMessagesSize = JSON.stringify(messages).length;
        const lastUserMessage = messages
          .slice()
          .reverse()
          .find((m: ModelMessage) => m.role === "user");
        const observationSize =
          typeof lastUserMessage?.content === "string"
            ? lastUserMessage.content.length
            : JSON.stringify(lastUserMessage?.content || "").length;

        console.log(
          `[agent ${this.id}] AI call duration: ${duration}ms | ` +
            `Tool calls: ${toolCalls.length} | ` +
            `Reasoning length: ${reasoningLength} chars | ` +
            `Observation size: ${observationSize} chars | ` +
            `Total input: ${inputMessagesSize} chars`,
        );

        const logEntry = {
          heroId: this.id,
          reasoningText: result.reasoningText,
          toolResults: result.toolResults || [],
          messages: result.response.messages,
          timestamp: new Date().toISOString(),
          duration: duration,
          metrics: {
            toolCallsCount: toolCalls.length,
            reasoningLength,
            observationSize,
            inputSize: inputMessagesSize,
          },
        };
        writeLogToFile(logEntry, this.id);

        return result.response.messages;
      } catch (error: any) {
        lastError = error;
        attempt += 1;
        // backoff with jitter: 500ms * 2^attempt ± 100ms
        const base = 500 * Math.pow(2, attempt - 1);
        const jitter = Math.floor(Math.random() * 200) - 100;
        const waitMs = Math.max(250, base + jitter);
        const status = error?.status || error?.response?.status;
        const errorName = error?.name;
        const errorMessage = error?.message || String(error);
        const retriable =
          error?.name === "AbortError" ||
          status === 429 ||
          (status >= 500 && status < 600) ||
          !status; // network errors

        const errorLog =
          `[agent ${this.id}] AI call failed (attempt ${attempt}/${maxRetries})` +
          (status ? ` | status=${status}` : "") +
          (errorName ? ` | error=${errorName}` : "") +
          ` | retriable=${retriable}` +
          ` | waiting ${waitMs}ms` +
          (errorMessage ? ` | message: ${errorMessage.substring(0, 200)}` : "");
        console.error(errorLog);
        writeLogToFile(errorLog, this.id);

        // Log detailed error on first attempt
        if (attempt === 1 && error?.responseBody) {
          const responseBody =
            typeof error.responseBody === "string"
              ? error.responseBody.substring(0, 200)
              : JSON.stringify(error.responseBody).substring(0, 200);
          console.error(`[agent ${this.id}] Error response: ${responseBody}`);
        }

        if (!retriable || attempt >= maxRetries) {
          break;
        }
        await new Promise((r) => setTimeout(r, waitMs));
      }
    }

    console.error(`[agent ${this.id}] AI call ultimately failed`, lastError);
    // Return a minimal assistant message to keep loop alive without crashing
    return [
      {
        role: "assistant" as const,
        content:
          "Skipping this turn due to AI call failure. Will retry next cycle.",
      },
    ];
  }
}

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";

export const writeLogToFile = (log: any, heroId: number) => {
  const uuid = randomUUID();
  // Read existing log file or create new one
  let existingLog: Record<string, any> = {};
  const logFilePath = `agent_${heroId}.json`;
  if (existsSync(logFilePath)) {
    try {
      const existingData = readFileSync(logFilePath, "utf8");
      existingLog = JSON.parse(existingData);
    } catch (error) {
      console.warn(
        `Failed to parse existing log file for agent ${heroId}:`,
        error,
      );
      existingLog = {};
    }
  }
  existingLog[uuid] = log;
  writeFileSync(logFilePath, JSON.stringify(existingLog, null, 2));
};
