"use strict";
/**
 * セッションミドルウェア
 * @module middlewares.session
 */
Object.defineProperty(exports, "__esModule", { value: true });
const connectRedis = require("connect-redis");
const session = require("express-session");
const redis = require("redis");
const redisStore = connectRedis(session);
const COOKIE_MAX_AGE = 3600000; // 60 * 60 * 1000(session active 1 hour)
exports.default = session({
    secret: 'sskts-line-ticket-session',
    resave: false,
    // Force a session identifier cookie to be set on every response.
    // The expiration is reset to the original maxAge, resetting the expiration countdown.
    rolling: true,
    saveUninitialized: false,
    store: new redisStore({
        client: redis.createClient({
            host: process.env.REDIS_HOST,
            // tslint:disable-next-line:no-magic-numbers
            port: parseInt(process.env.REDIS_PORT, 10),
            password: process.env.REDIS_KEY,
            tls: { servername: process.env.REDIS_HOST }
        })
    }),
    cookie: {
        maxAge: COOKIE_MAX_AGE
    },
    genid: (__) => {
        return 'U28fba84b4008d60291fc861e2562b34f';
        // return genuuid() // use UUIDs for session IDs
    }
});
