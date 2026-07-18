// Ensures edge-js bootstrap is built without inheriting EDGE_APP_ROOT from the app .env.
delete process.env.EDGE_APP_ROOT
delete process.env.EDGE_USE_CORECLR
delete process.env.EDGE_BOOTSTRAP_DIR

require("child_process").execSync("node node_modules/edge-js/tools/install.js", {
    stdio: "inherit",
    env: process.env,
})
