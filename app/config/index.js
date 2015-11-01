var fs = require("fs");

var configFile = __dirname + "/vagrant.json";

if (process.env.DEMO_CONFIG_FILE) {
  configFile = process.env.DEMO_CONFIG_FILE;
}

// load the config file for this environment
if (!fs.existsSync(configFile)) {
  console.error("File " + configFile + " does not exist");
  process.exit();
} else {
  console.log("Using config file: " + configFile);
}

module.exports = JSON.parse(fs.readFileSync(configFile));;