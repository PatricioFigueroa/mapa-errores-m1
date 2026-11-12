import { createApp } from './app.js';
import { loadConfig } from './config.js';

const port = Number(process.env.PORT ?? 3000);
createApp(loadConfig(process.env)).listen(port);
