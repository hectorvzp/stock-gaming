import {
  STORAGE_KEY,
  MINIMOS_KEY,
  TAREFAS_KEY,
  CATEGORIAS,
  CATEGORIAS_PECAS,
} from "./constants.js";

export function carregarEstoque() {
  try {
    const bruto = window.localStorage.getItem(STORAGE_KEY);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    if (!Array.isArray(dados)) return [];
    return dados.map((p) => ({
      status: "estoque",
      atribuidoPara: null,
      dataAtribuicao: null,
      observacao: "",
      atlasOk: false,
      subcategoria: null,
      ...p,
    }));
  } catch (erro) {
    console.error("Não foi possível ler o estoque salvo:", erro);
    return [];
  }
}

export function salvarEstoque(produtos) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
  } catch (erro) {
    console.error("Não foi possível salvar o estoque:", erro);
  }
}

export function carregarMinimos() {
  try {
    const bruto = window.localStorage.getItem(MINIMOS_KEY);
    const salvos = bruto ? JSON.parse(bruto) : {};
    const completo = {};
    CATEGORIAS.concat(CATEGORIAS_PECAS).forEach((cat) => {
      completo[cat] = Number.isFinite(salvos[cat]) ? salvos[cat] : 0;
    });
    return completo;
  } catch (erro) {
    console.error("Não foi possível ler os mínimos salvos:", erro);
    const padrao = {};
    CATEGORIAS.concat(CATEGORIAS_PECAS).forEach((cat) => {
      padrao[cat] = 0;
    });
    return padrao;
  }
}

export function salvarMinimos(minimos) {
  try {
    window.localStorage.setItem(MINIMOS_KEY, JSON.stringify(minimos));
  } catch (erro) {
    console.error("Não foi possível salvar os mínimos:", erro);
  }
}

export function carregarTarefas() {
  try {
    const bruto = window.localStorage.getItem(TAREFAS_KEY);
    if (!bruto) return [];
    const dados = JSON.parse(bruto);
    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    console.error("Não foi possível ler as tarefas salvas:", erro);
    return [];
  }
}

export function salvarTarefas(tarefas) {
  try {
    window.localStorage.setItem(TAREFAS_KEY, JSON.stringify(tarefas));
  } catch (erro) {
    console.error("Não foi possível salvar as tarefas:", erro);
  }
}
