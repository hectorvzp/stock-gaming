export const STORAGE_KEY = "gearControlEstoque";
export const MINIMOS_KEY = "gearControlMinimos";
export const TAREFAS_KEY = "gearControlTarefas";

export const CATEGORY_COLORS = {
  PC: "#00f5d4", // Menta / Ciano Elétrico (Destaque principal)
  Monitor: "#ff007f", // Rosa Neon / Magenta Gamer
  Wacom: "#7b2cbf", // Roxo Violeta Profundo
  Webcam: "#ffb703", // Amarelo Âmbar Quente
  Mouse: "#70e000", // Verde Limão Vibrante
  Teclado: "#ff5400", // Laranja Neon
  Outro: "#8d99ae", // Cinza Metálico Sofisticado
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

export const firebaseConfig = {
  apiKey: "AIzaSyDNwMn8TqY-YDFcA7rF2IpeFWW_GREsp2s",
  authDomain: "stock-app-467c7.firebaseapp.com",
  projectId: "stock-app-467c7",
  storageBucket: "stock-app-467c7.firebasestorage.app",
  messagingSenderId: "131912857363",
  appId: "1:131912857363:web:89d8ac417c8ada5c5b4ce6",
  measurementId: "G-S89T8BXSF4",
};
