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

if (process.env.mysql_user) {
  config.mysql.user = process.env.mysql_user;
}

if (process.env.mysql_password) {
  config.mysql.password = process.env.mysql_password;
}

if (process.env.mysql_database) {
  config.mysql.database = process.env.mysql_database;
}

if (process.env.mysql_host) {
  config.mysql.host = process.env.mysql_host;
}

module.exports = config;