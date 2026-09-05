import { app } from './app';
import { env } from './config/env';
import { checkLlmProviderConfigAtStartup } from './modules/students/nlSearch.providers';

checkLlmProviderConfigAtStartup();

app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${env.PORT}`);
});
