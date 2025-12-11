export function healthCheck(req, res) {
    res.json({ status: 'ok', message: 'MQC2 backend is running' });
}
