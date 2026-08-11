import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {restaurarFatorTexto} from './utils/aparencia';
import './index.css';

/*
  Antes do primeiro render, de propósito: o tamanho de texto escolhido pela pessoa precisa estar
  na raiz quando a primeira tela pinta — aplicado num efeito, a interface abriria no tamanho
  padrão e saltaria para o escolhido um quadro depois, a cada F5.
*/
restaurarFatorTexto();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
