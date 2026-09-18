import {
  CATEGORIAS_SEM_DUPLICADOS,
  CATEGORIAS_PERMITIDAS_ATRIBUICAO,
} from "./constants.js";
import {
  carregarEstoque,
  salvarEstoque,
  carregarMinimos,
  salvarMinimos,
  carregarTarefas,
  salvarTarefas,
} from "./storage.js";

export const state = {
  produtos: [],
  minimos: {},
  tarefas: [],
  editandoId: null,
  filtroCategoria: "Todas",
  filtroCategoriaAtribuido: "Todas",
};

export function recarregarEstadoLocal() {
  state.produtos = carregarEstoque();
  state.minimos = carregarMinimos();
  state.tarefas = carregarTarefas();
}

function validarProduto(dados, idAtual) {
  if (!dados.nome || dados.nome.trim().length === 0) {
    throw new Error("O nome do produto não pode ficar vazio.");
  }
  if (!dados.categoria) {
    throw new Error("Selecione uma categoria.");
  }
  if (
    dados.categoriaBase === "Outro" &&
    (!dados.subcategoria || dados.subcategoria.trim().length === 0)
  ) {
    throw new Error("Por favor, selecione o tipo de componente/peça.");
  }

  const nomeLimpo = dados.nome.trim().toLowerCase();
  const categoriaAtual = dados.categoriaBase || dados.categoria;

  if (CATEGORIAS_SEM_DUPLICADOS.includes(categoriaAtual)) {
    const jaExiste = state.produtos.some((p) => {
      if (idAtual && p.id === idAtual) return false;
      return (
        p.categoria === categoriaAtual &&
        p.nome.trim().toLowerCase() === nomeLimpo
      );
    });

    if (jaExiste) {
      throw new Error(
        `Já existe um item da categoria "${categoriaAtual}" cadastrado com o nome "${dados.nome.trim()}".`,
      );
    }
  }
}

function gerarNovoId() {
  const maior = state.produtos.reduce((max, p) => (p.id > max ? p.id : max), 0);
  return maior + 1;
}

export function adicionarProduto(dados) {
  validarProduto(dados, null);
  const produto = {
    id: gerarNovoId(),
    nome: dados.nome.trim(),
    categoria: dados.categoria,
    categoriaBase: dados.categoriaBase,
    subcategoria: dados.subcategoria,
    status: "estoque",
    atribuidoPara: null,
    dataAtribuicao: null,
    observacao: "",
    atlasOk: false,
  };
  state.produtos.push(produto);
  salvarEstoque(state.produtos);
  return produto;
}

export function atualizarProduto(id, dados) {
  validarProduto(dados, id);
  const produto = state.produtos.find((p) => p.id === id);
  if (!produto) throw new Error("Item não encontrado.");
  Object.assign(produto, {
    nome: dados.nome.trim(),
    categoria: dados.categoria,
    categoriaBase: dados.categoriaBase,
    subcategoria: dados.subcategoria,
  });
  salvarEstoque(state.produtos);
  return produto;
}

export function removerProduto(id) {
  const indice = state.produtos.findIndex((p) => p.id === id);
  if (indice === -1) return false;
  state.produtos.splice(indice, 1);
  salvarEstoque(state.produtos);
  return true;
}

export function atribuirProduto(id, nomePessoa) {
  const indice = state.produtos.findIndex((p) => p.id === id);
  if (indice === -1) throw new Error("Item não encontrado.");

  const produto = state.produtos[indice];
  const catVerificacao = produto.categoriaBase || produto.categoria;

  if (CATEGORIAS_PERMITIDAS_ATRIBUICAO.includes(catVerificacao)) {
    produto.status = "atribuido";
    produto.atribuidoPara = nomePessoa.trim();
    produto.dataAtribuicao = new Date().toLocaleDateString("pt-BR");
  } else {
    state.produtos.splice(indice, 1);
  }

  salvarEstoque(state.produtos);
  return produto;
}

export function devolverAoEstoque(id) {
  const produto = state.produtos.find((p) => p.id === id);
  if (!produto) throw new Error("Item não encontrado.");
  produto.status = "estoque";
  produto.atribuidoPara = null;
  produto.dataAtribuicao = null;
  produto.observacao = "";
  produto.atlasOk = false;
  salvarEstoque(state.produtos);
  return produto;
}

export function atualizarObservacao(id, texto) {
  const produto = state.produtos.find((p) => p.id === id);
  if (!produto) return;
  produto.observacao = texto;
  salvarEstoque(state.produtos);
}

export function toggleAtlasOk(id, estado) {
  const produto = state.produtos.find((p) => p.id === id);
  if (!produto) return;
  produto.atlasOk = Boolean(estado);
  salvarEstoque(state.produtos);
}

export function adicionarTarefa(texto) {
  if (!texto || texto.trim().length === 0) return;
  const novaTarefa = {
    id: Date.now(),
    texto: texto.trim(),
    criadaEm: new Date().toLocaleDateString("pt-BR"),
  };
  state.tarefas.push(novaTarefa);
  salvarTarefas(state.tarefas);
}

export function concluirTarefa(id) {
  state.tarefas = state.tarefas.filter((t) => t.id !== id);
  salvarTarefas(state.tarefas);
}

export function atualizarMinimos(novosMinimos) {
  state.minimos = novosMinimos;
  salvarMinimos(state.minimos);
}
