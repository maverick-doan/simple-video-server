import { Hono } from "hono";
import { authRouter } from "./routes/auth";
import { videoRouter } from "./routes/video";

const app = new Hono();

app.route('/api/auth', authRouter);
app.route('/api/video', videoRouter);

app.get('/health', (c) => {
    return c.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

app.notFound((c) => {
    return c.json({
        message: "Not Found"
    }, 404)
});

app.onError((err, c) => {
    console.error(err);
    return c.json({
        error: "Internal Server Error",
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    }, 500)
})

app.get("/api/test/:type", (c) => {
    const type = c.req.param("type");
    switch (type) {
        case "error":
            throw new Error("Test Error");
        case "ping":
            return c.json({
                message: "pong"
            })
        default:
            return c.json({
                message: "Hello"
            })
    }
})

export default app;