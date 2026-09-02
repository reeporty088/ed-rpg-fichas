import { getTheme } from './core/config/theme.js';
import { getFirebaseServices } from './core/firebase/firebase.js';
import { createRouter } from './core/router/router.js';
import { createNavigation } from './ui/components/navigation.js';
import { createToastRegion, showToast } from './ui/components/toast.js';
import { renderHomeModule } from './modules/home/index.js';
import { renderCampaignsModule } from './modules/campaigns/index.js';
import { renderCompendiumModule } from './modules/compendium/index.js';
import { renderProfileModule } from './modules/profile/index.js';
import { renderScheduleModule } from './modules/schedule/index.js';
import { renderSettingsModule } from './modules/settings/index.js';

const root = document.querySelector('#v5-app');
const navigation = createNavigation();
const main = document.createElement('main');
main.id = 'app-content';
main.tabIndex = -1;
const toastRegion = createToastRegion();
root.append(navigation, main, toastRegion);

document.documentElement.dataset.theme = getTheme();
const routes = {
  '/': { title: 'Início', render: renderHomeModule },
  '/campaigns': { title: 'Campanhas', render: renderCampaignsModule, requiresAuth: true },
  '/compendium': { title: 'Compêndio', render: renderCompendiumModule },
  '/profile': { title: 'Perfil', render: renderProfileModule, requiresAuth: true },
  '/schedule': { title: 'Cronograma', render: renderScheduleModule, requiresAuth: true },
  '/settings': { title: 'Configurações', render: renderSettingsModule, requiresAuth: true },
};

const router = createRouter({ routes, outlet: main });
router.start();
getFirebaseServices().catch((error) => {
  console.info('[V5] Firebase indisponível; a fundação visual continua disponível.', error.message);
  showToast(toastRegion, 'Firebase indisponível. Nenhum dado foi carregado.');
});
