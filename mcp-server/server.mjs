/**
 * Servidor MCP de demostración para TaskBoard.
 *
 * Cursor lanza este proceso y habla con él por stdin/stdout (JSON-RPC).
 * No escribas logs en console.log: stdout está reservado al protocolo.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const rootDir = dirname(fileURLToPath(import.meta.url));
const knowledge = JSON.parse(
  readFileSync(join(rootDir, "knowledge.json"), "utf8"),
);

const server = new McpServer({
  name: "taskboard-knowledge",
  version: "1.0.0",
});

// Recurso = contexto que el cliente puede leer (un documento externo).
server.registerResource(
  "guidelines",
  "taskboard://guidelines",
  {
    title: "Guías de tareas",
    description: "Convenciones externas para redactar tareas del TaskBoard",
    mimeType: "application/json",
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(knowledge.guidelines, null, 2),
      },
    ],
  }),
);

// Herramienta = función que el modelo puede llamar cuando necesita contexto.
server.registerTool(
  "get_task_guidelines",
  {
    title: "Obtener guías de tareas",
    description:
      "Devuelve las convenciones externas para redactar títulos y descripciones de TaskBoard.",
  },
  async () => ({
    content: [
      {
        type: "text",
        text: JSON.stringify(knowledge.guidelines, null, 2),
      },
    ],
  }),
);

server.registerTool(
  "get_task_template",
  {
    title: "Obtener plantilla de tarea",
    description:
      "Devuelve una plantilla externa de tarea según el tipo: bug, feature o chore.",
    inputSchema: {
      type: z
        .enum(["bug", "feature", "chore"])
        .describe("Tipo de tarea a consultar"),
    },
  },
  async ({ type }) => {
    const template = knowledge.templates[type];

    if (!template) {
      return {
        content: [{ type: "text", text: `No hay plantilla para: ${type}` }],
        isError: true,
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(template, null, 2) }],
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
