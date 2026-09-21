'use strict';

const config = require('../config');

// DATABASE_URL bo'lsa PostgreSQL, aks holda lokal JSON fayl ishlatiladi.
const db = config.databaseUrl ? require('./postgres') : require('./jsonStore');

module.exports = db;
