import {
  CATEGORIAS_SEM_DUPLICADOS,
  CATEGORIAS_PERMITIDAS_ATRIBUICAO,
} from "./constants.js";
import {
  salvarProdutoFirestore,
  removerProdutoFirestore,
  salvarTarefaFirestore,
  removerTarefaFirestore,
  salvarMinimosFirestore,
} from "./storage.js";

export const state = {
  produtos: [],
  minimos: {},
  tarefas: [],
  editandoId: null,
  filtroCategoria: "Todas",
  filtroCategoriaAtribuido: "Todas",
};

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
      if (idAtual && String(p.id) === String(idAtual)) return false;
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

export async function adicionarProduto(dados) {
  validarProduto(dados, null);
  const produto = {
    id: Date.now().toString(),
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
  await salvarProdutoFirestore(produto);
}

export async function atualizarProduto(id, dados) {
  validarProduto(dados, id);
  const produto = state.produtos.find((p) => String(p.id) === String(id));
  if (!produto) throw new Error("Item não encontrado.");

  const produtoAtualizado = {
    ...produto,
    nome: dados.nome.trim(),
    categoria: dados.categoria,
    categoriaBase: dados.categoriaBase,
    subcategoria: dados.subcategoria,
  };
  await salvarProdutoFirestore(produtoAtualizado);
}

export async function removerProduto(id) {
  await removerProdutoFirestore(id);
}

export async function atribuirProduto(id, nomePessoa) {
  const produto = state.produtos.find((p) => String(p.id) === String(id));
  if (!produto) throw new Error("Item não encontrado.");

  const catVerificacao = produto.categoriaBase || produto.categoria;

  if (CATEGORIAS_PERMITIDAS_ATRIBUICAO.includes(catVerificacao)) {
    produto.status = "atribuido";
    produto.atribuidoPara = nomePessoa.trim();
    produto.dataAtribuicao = new Date().toLocaleDateString("pt-BR");
    await salvarProdutoFirestore(produto);
  } else {
    await removerProdutoFirestore(id);
  }
}

export async function devolverAoEstoque(id) {
  const produto = state.produtos.find((p) => String(p.id) === String(id));
  if (!produto) throw new Error("Item não encontrado.");
  produto.status = "estoque";
  produto.atribuidoPara = null;
  produto.dataAtribuicao = null;
  produto.observacao = "";
  produto.atlasOk = false;
  await salvarProdutoFirestore(produto);
}

export async function atualizarObservacao(id, texto) {
  const produto = state.produtos.find((p) => String(p.id) === String(id));
  if (!produto) return;
  produto.observacao = texto;
  await salvarProdutoFirestore(produto);
}

export async function toggleAtlasOk(id, estado) {
  const produto = state.produtos.find((p) => String(p.id) === String(id));
  if (!produto) return;
  produto.atlasOk = Boolean(estado);
  await salvarProdutoFirestore(produto);
}

export async function adicionarTarefa(texto) {
  if (!texto || texto.trim().length === 0) return;
  const novaTarefa = {
    id: Date.now().toString(),
    texto: texto.trim(),
    criadaEm: new Date().toLocaleDateString("pt-BR"),
  };
  await salvarTarefaFirestore(novaTarefa);
}

export async function concluirTarefa(id) {
  await removerTarefaFirestore(id);
}

export async function atualizarMinimos(novosMinimos) {
  await salvarMinimosFirestore(novosMinimos);
}
