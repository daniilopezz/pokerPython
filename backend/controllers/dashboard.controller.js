const DashboardService = require("../services/dashboard.service");

async function summary() {
  return DashboardService.getSummary();
}

module.exports = { summary };
