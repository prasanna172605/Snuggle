export default async function handler(req, res) {
    // CORS Headers (REQUIRED - MUST BE FIRST)
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Content-Type", "application/json");

    // Handle OPTIONS (Preflight)
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    // Health check
    if (req.method === "GET") {
        return res.status(200).json({
            status: "success",
            message: "Server is healthy",
            timestamp: new Date().toISOString()
        });
    }

    return res.status(405).json({
        status: "error",
        message: "Method not allowed"
    });
}
