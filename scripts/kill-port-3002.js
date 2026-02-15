#!/usr/bin/env node
/**
 * Kills any process using port 3002 to prevent EADDRINUSE.
 * Silently succeeds if no process is using the port.
 */
const kill = require("kill-port");

(async () => {
  try {
    await kill(3002, "tcp");
    console.log("Cleared port 3002");
  } catch (err) {
    if (!err.message?.includes("No process") && !err.message?.includes("not found")) {
      console.warn("kill-port:", err.message);
    }
  }
  process.exit(0);
})();
