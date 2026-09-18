export const STORAGE_KEY = "gearControlEstoque";
export const MINIMOS_KEY = "gearControlMinimos";
export const TAREFAS_KEY = "gearControlTarefas";

export const CATEGORY_COLORS = {
  PC: "#4cc9f0",
  Monitor: "#ff6b6b",
  Wacom: "#e0aaff",
  Webcam: "#f72585",
  Mouse: "#3ddc97",
  Teclado: "#ffb238",
  Outro: "#9aa1b4",
};

export const CATEGORIAS_PECAS = [
  "Placa de Vídeo",
  "M2 2TB",
  "M2 4TB",
  "Placa Mãe",
  "Fonte",
  "Water Cooler",
  "Memória RAM DDR4",
  "Memória RAM DDR5",
  "Gabinete",
];

export const CATEGORIAS = Object.keys(CATEGORY_COLORS);
export const CATEGORIAS_PERMITIDAS_ATRIBUICAO = ["PC", "Monitor", "Wacom"];
export const CATEGORIAS_SEM_DUPLICADOS = ["PC", "Monitor", "Wacom"];
