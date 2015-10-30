var fs = require("fs");

// ensure we have an "APP_ENV" environment variable
if (!process.env.APP_ENV) {
  console.error("Please specify an APP_ENV environment variable");
  process.exit();
}

var appEnv = process.env.APP_ENV;
var configPath = __dirname + "/" + appEnv + ".json";

// load the config file for this environment
if (!fs.existsSync(configPath)) {
  console.error("File " + configPath + " does not exist");
  process.exit();
}

// load the default config
module.exports = JSON.parse(fs.readFileSync(configPath));