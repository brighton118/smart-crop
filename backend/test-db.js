const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'test-db-utf8.log');
const logStream = fs.createWriteStream(logFile, { flags: 'w', encoding: 'utf8' });

function log(msg) {
    console.log(msg);
    logStream.write(msg + '\n');
}

process.on('uncaughtException', (err) => {
    log("UNCAUGHT EXCEPTION:");
    log(err.message);
    log(err.stack);
});

try {
    log("Requiring dotenv...");
    require('dotenv').config();

    log("Requiring PrismaClient...");
    const { PrismaClient } = require('@prisma/client');

    log("Initializing PrismaClient...");
    const prisma = new PrismaClient();

    log("Querying db table list...");
    prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`
        .then(tables => {
            log("Tables in public schema:");
            tables.forEach(t => log(" - " + t.table_name));
            logStream.end();
            process.exit(0);
        })
        .catch(err => {
            log("Query error: " + err.message);
            log(err.stack);
            logStream.end();
            process.exit(1);
        });
} catch (e) {
    log("Top-level catch: " + e.message);
    log(e.stack);
    logStream.end();
}
