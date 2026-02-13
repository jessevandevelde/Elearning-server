import type { Request, Response } from 'express';
import express from 'express';
import cors from 'cors';
import dotenvExpand from 'dotenv-expand';
import dotenv from 'dotenv';

const env = dotenv.config();

dotenvExpand.expand(env);

// eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
const serverPort = process.env.SERVER_PORT as number | undefined;
const clientUrl = process.env.CLIENT_URL;
const serverUrl = process.env.SERVER_URL;

const app = express();

app.use(cors({
  origin: clientUrl,
  credentials: true,
}));

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Server is running' });
});

if (serverPort && clientUrl && serverUrl) {
  app.listen(serverPort, serverUrl, () => {
  // eslint-disable-next-line no-console
    console.log(`Server running at http://127.0.0.1:${serverPort}`);
  });
}
else {
  console.warn(`missing parameters
    serverPort: ${serverPort},
    serverUrl: ${serverUrl},
    clientUrl: ${clientUrl},
 `);
}
