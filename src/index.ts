import { serve } from "@hono/node-server";
import app from "./app";

const options = {
    fetch: app.fetch,
    port: parseInt(process.env.PORT || "3000")
}

const listeningCallback = (info: any) => {
    console.log(`Server is serving at ${info.address}:${info.port}`);
}

serve(options, listeningCallback);