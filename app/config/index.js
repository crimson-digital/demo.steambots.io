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
var config = JSON.parse(fs.readFileSync(configPath));


/****************************************************
* Allow overriding of database configs from app envs
*****************************************************/

if (process.env.MYSQL_USER) {
  config.mysql.user = process.env.MYSQL_USER;
}

if (process.env.MYSQL_PASSWORD) {
  config.mysql.password = process.env.MYSQL_PASSWORD;
}

if (process.env.MYSQL_DATABASE) {
  config.mysql.database = process.env.MYSQL_DATABASE;
}

if (process.env.MYSQL_HOST) {
  config.mysql.host = process.env.MYSQL_HOST;
}

module.exports = config;