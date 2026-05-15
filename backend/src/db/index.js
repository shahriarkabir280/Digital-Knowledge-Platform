const { getDb, ping, close } = require("./connection");

const db = getDb();

db.getDb = getDb;
db.ping = ping;
db.close = close;

module.exports = db;