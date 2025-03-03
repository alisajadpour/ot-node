import express from 'express';
import https from 'https';
import fs from 'fs-extra';
import fileUpload from 'express-fileupload';
import cors from 'cors';
import requestValidationMiddleware from './middleware/request-validation-middleware.js';
import rateLimiterMiddleware from './middleware/rate-limiter-middleware.js';
import authenticationMiddleware from './middleware/authentication-middleware.js';
import authorizationMiddleware from './middleware/authorization-middleware.js';
import { MAX_FILE_SIZE } from '../../../constants/constants.js';

class ExpressHttpClient {
    async initialize(config, logger) {
        this.config = config;
        this.logger = logger;
        this.app = express();
    }

    async get(route, callback, options) {
        this.app.get(route, ...this.selectMiddlewares(options), callback);
    }

    async post(route, callback, options) {
        this.app.post(route, ...this.selectMiddlewares(options), callback);
    }

    sendResponse(res, status, returnObject) {
        res.status(status);
        res.send(returnObject);
    }

    async listen() {
        if (this.config.useSsl) {
            this.httpsServer = https.createServer(
                {
                    key: await fs.promises.readFile(this.config.sslKeyPath),
                    cert: await fs.promises.readFile(this.config.sslCertificatePath),
                },
                this.app,
            );
            this.httpsServer.listen(this.config.port);
        } else {
            this.app.listen(this.config.port);
        }
        this.logger.info(`Node listening on port: ${this.config.port}`);
    }

    selectMiddlewares(options) {
        const middlewares = [];
        if (options.rateLimit) middlewares.push(rateLimiterMiddleware(this.config.rateLimiter));
        if (options.requestSchema)
            middlewares.push(requestValidationMiddleware(options.requestSchema));

        return middlewares;
    }

    async initializeBeforeMiddlewares(authService) {
        this.app.use(authenticationMiddleware(authService));
        this.app.use(authorizationMiddleware(authService));
        this._initializeBaseMiddlewares();
    }

    async initializeAfterMiddlewares() {
        // placeholder method for after middlewares
    }

    _initializeBaseMiddlewares() {
        this.app.use(
            fileUpload({
                createParentPath: true,
            }),
        );

        this.app.use(cors());
        this.app.use(express.json({ limit: `${MAX_FILE_SIZE / (1024 * 1024)}mb` }));
        this.app.use((req, res, next) => {
            this.logger.api(`${req.method}: ${req.url} request received`);
            return next();
        });
    }
}

export default ExpressHttpClient;
