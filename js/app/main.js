// Punto de entrada.
import { loadRDKit } from '../chem/rdkit.js';
import { route, startRouter } from './router.js';
import { initPWA } from './pwa.js';
import { store } from './store.js';
import {
  pantallaInicio, pantallaMapa, pantallaMundo, pantallaNivel,
  pantallaBitacora, pantallaLaboratorio, pantallaAjustes,
} from './screens.js';
import { pantallaPruebas, pantallaPrueba } from './screens-pruebas.js';

initPWA();

// paleta del lienzo de moléculas (oscura por defecto; clara como el libro si se elige en Ajustes)
const aplicarLienzo = () => { document.documentElement.dataset.lienzo = store.ajuste('lienzoClaro') ? 'claro' : 'oscuro'; };
aplicarLienzo();
store.subscribe(aplicarLienzo);

route('/', pantallaInicio);
route('/mapa', pantallaMapa);
route('/mundo/:id', pantallaMundo);
route('/nivel/:mundo/:nivel', pantallaNivel);
route('/bitacora', pantallaBitacora);
route('/laboratorio', pantallaLaboratorio);
route('/ajustes', pantallaAjustes);
route('/pruebas', pantallaPruebas);
route('/prueba/:id', pantallaPrueba);

const app = document.getElementById('app');
const splash = document.getElementById('splash');

loadRDKit()
  .then(() => {
    splash?.remove();
    startRouter(app);
  })
  .catch((err) => {
    console.error(err);
    if (splash) splash.querySelector('.splash-msg').textContent = 'No se pudo cargar el motor químico. Comprueba la conexión y recarga la página.';
  });
