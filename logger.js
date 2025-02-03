export default {
  error: function (message) {
    console.log(`\x1b[31m[ERROR]\x1b[0m ${message}`);
  },
  warn: function (message) {
    console.log(`\x1b[33m[WARN]\x1b[0m ${message}`);
  },
  success: function (message) {
    console.log(`\x1b[32m[INFO]\x1b[0m ${message}`);
  },
  info: function (message) {
    console.log(`\x1b[34m[INFO]\x1b[0m ${message}`);
  }
}