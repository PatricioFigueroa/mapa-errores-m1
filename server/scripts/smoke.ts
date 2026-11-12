import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

const port = Number(process.env.PORT ?? 3000);
const server = createApp(loadConfig(process.env)).listen(port, async () => {
  try {
    const structure = await fetch(`http://localhost:${port}/api/structure`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '2 + 2 = ? A) 3 B) 4 (correcta) C) 5 D) 6' }),
    });
    console.log('structure', structure.status, await structure.text());
    const reinforce = await fetch(`http://localhost:${port}/api/reinforce`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stem: '2 + 2', correct: '4', wrong: '5', error: { id: 'suma', name: 'Confunde suma' } }),
    });
    console.log('reinforce', reinforce.status, await reinforce.text());
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally { server.close(); }
});
