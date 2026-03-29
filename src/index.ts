import { createApp } from './app';
import { store } from './store';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

const app = createApp(store);

app.listen(PORT, () => {
  console.log(`if-you-make-it listening on port ${PORT}`);
});
