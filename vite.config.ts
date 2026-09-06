import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import electron from "vite-plugin-electron/simple";
import obfuscator from "vite-plugin-javascript-obfuscator";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [
    react(),
    electron({
      main: {
        entry: "src/main/main.ts",
      },
      preload: {
        input: "src/main/preload.ts",
      },
    }),
    // Production anti-reverse engineering code obfuscation
    mode === "production" &&
      obfuscator({
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.5,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: "hexadecimal",
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: false,
        simplify: true,
        splitStrings: true,
        stringArray: true,
        stringArrayCallsTransform: false,
        stringArrayEncoding: ["base64"],
        stringArrayThreshold: 0.75,
        unicodeEscapeSequence: false,
      } as any),
  ].filter(Boolean),
  server: {
    port: 5173,
    strictPort: false, // Auto switch port if 5173 is busy
  },
}));
