/// <reference types="vite/client" />

/*
  Sem esta referência, `import logo from "…/viu_hub_logo.jpg"` não compila: o `tsconfig`
  declara `"types": ["node"]`, e essa lista **substitui** o padrão em vez de somar a ele —
  os tipos de asset do Vite (`.jpg`, `.svg`, `.png`…) ficam de fora. A referência tripla é
  por arquivo e não depende daquela lista, então volta a valer.
*/
