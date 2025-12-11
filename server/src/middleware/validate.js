export function validate(schema) {
    return (req, res, next) => {
        try {
            req.validated = schema.parse(req.body);
            next();
        } catch (err) {
            return res.status(400).json({
                error: true,
                message: err.errors ?? "Invalid input"
            });
        }
    };
}
