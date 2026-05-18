const { appName } = require("../config/app.config");

function health() {
  return {
    status: "ok",
    app: appName,
    timestamp: new Date().toISOString(),
  };
}

module.exports = { health };
