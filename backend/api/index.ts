import { getRequestListener } from '@hono/node-server';
import app from '../src/index';

export default getRequestListener(app.fetch);
