import { logger } from "../utils/logger.js";

export function errorHandler(err, req, res, next) {
    logger.error(err);

    res.status(err.status || 500).json({
        error: true,
        message: err.message || "Internal server error"
    });
}
