// src/utils/withTimeout.js

export class StepTimeoutError extends Error {
    constructor(stepName, ms) {
        super(`Step "${stepName}" timed out after ${ms}ms`);
        this.name = "StepTimeoutError";
        this.stepName = stepName;
        this.timeoutMs = ms;
    }
}

/**
 * Wrap a Promise with a timeout.
 * If it does not finish in `ms`, reject with StepTimeoutError.
 */
export function withTimeout(promise, ms, stepName) {
    return new Promise((resolve, reject) => {
        let finished = false;

        const timer = setTimeout(() => {
            if (finished) return;
            finished = true;
            reject(new StepTimeoutError(stepName, ms));
        }, ms);

        promise
            .then(res => {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                resolve(res);
            })
            .catch(err => {
                if (finished) return;
                finished = true;
                clearTimeout(timer);
                reject(err);
            });
    });
}
