import {
  CATEGORIAS_SEM_DUPLICADOS,
  CATEGORIAS_PERMITIDAS_ATRIBUICAO,
  CATEGORIAS_QUANTIDADE_POR_PC,
  categoriaBaseProduto,
  idEstoqueQuantidade,
  nomeEstoqueQuantidade,
  produtoIndividual,
} from "./constants.js";
import {
  salvarProdutoFirestore,
  salvarProdutosFirestore,
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

function quantidadeProduto(produto) {
  return Number.isFinite(Number(produto.quantidade))
    ? Number(produto.quantidade)
    : 1;
}

function criarProdutoQuantidade(dados, quantidade, existente = null) {
  const base = dados.categoriaBase || dados.categoria;
  const produto = {
    ...(existente || {}),
    id: idEstoqueQuantidade(dados),
    nome: nomeEstoqueQuantidade(dados),
    categoria: nomeEstoqueQuantidade(dados),
    categoriaBase: base,
    subcategoria: base === "Outro" ? dados.subcategoria : null,
    quantidade,
    estoqueAgrupado: true,
    status: "estoque",
    atribuidoPara: null,
    dataAtribuicao: null,
    atlasOk: false,
    observacaoCadastro:
      dados.observacaoCadastro?.trim() || existente?.observacaoCadastro || "",
  };
  return produto;
}

function exigirQuantidadeValida(quantidade) {
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new Error("Informe uma quantidade inteira maior que zero.");
  }
}

function validarProduto(dados, idAtual) {
  const individual = produtoIndividual(dados);
  if (individual && (!dados.nome || dados.nome.trim().length === 0)) {
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

  const categoriaAtual = categoriaBaseProduto(dados);

  if (individual) {
    const nomeLimpo = dados.nome.trim().toLocaleLowerCase("pt-BR");
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
  if (!produtoIndividual(dados)) {
    const quantidade = Number(dados.quantidade);
    exigirQuantidadeValida(quantidade);
    const id = idEstoqueQuantidade(dados);
    const existente = state.produtos.find(
      (produto) => String(produto.id) === id,
    );
    const produto = criarProdutoQuantidade(
      dados,
      quantidadeProduto(existente || { quantidade: 0 }) + quantidade,
      existente,
    );
    await salvarProdutoFirestore(produto);
    const index = state.produtos.findIndex(
      (item) => String(item.id) === String(produto.id),
    );
    if (index >= 0) state.produtos[index] = produto;
    else state.produtos.push(produto);
    return;
  }

  const produto = {
    id: Date.now().toString(),
    nome: dados.nome.trim(),
    categoria: dados.categoria,
    categoriaBase: dados.categoriaBase,
    subcategoria: dados.subcategoria,
    observacaoCadastro: dados.observacaoCadastro?.trim() || "",
    status: "estoque",
    atribuidoPara: null,
    dataAtribuicao: null,
    atlasOk: false,
  };
  await salvarProdutoFirestore(produto);
  state.produtos.push(produto);
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
    observacaoCadastro: dados.observacaoCadastro?.trim() || "",
  };
  await salvarProdutoFirestore(produtoAtualizado);
  Object.assign(produto, produtoAtualizado);
}

export async function removerProduto(id) {
  await removerProdutoFirestore(id);
  state.produtos = state.produtos.filter(
    (produto) => String(produto.id) !== String(id),
  );
}

export async function atribuirProduto(id, nomePessoa) {
  const produto = state.produtos.find((p) => String(p.id) === String(id));
  if (!produto) throw new Error("Item não encontrado.");

  const catVerificacao = categoriaBaseProduto(produto);

  if (CATEGORIAS_PERMITIDAS_ATRIBUICAO.includes(catVerificacao)) {
    if (produto.status !== "estoque") {
      throw new Error("Este item já está atribuído.");
    }
    const itensParaSalvar = [];
    let categoriasEmFalta = [];
    let kitConsumido = false;

    if (catVerificacao === "PC") {
      kitConsumido = true;
      for (const categoria of CATEGORIAS_QUANTIDADE_POR_PC) {
        const grupo = {
          categoria,
          categoriaBase: categoria,
          subcategoria: null,
        };
        const idGrupo = idEstoqueQuantidade(grupo);
        const estoque = state.produtos.find(
          (item) => String(item.id) === idGrupo,
        );
        const saldoAnterior = estoque ? quantidadeProduto(estoque) : 0;
        if (saldoAnterior <= 0) categoriasEmFalta.push(categoria);

        const grupoAtualizado = criarProdutoQuantidade(
          grupo,
          saldoAnterior - 1,
          estoque,
        );
        itensParaSalvar.push(grupoAtualizado);
      }
    }

    const produtoAtualizado = {
      ...produto,
      status: "atribuido",
      atribuidoPara: nomePessoa.trim(),
      dataAtribuicao: new Date().toLocaleDateString("pt-BR"),
      kitConsumido,
    };
    itensParaSalvar.push(produtoAtualizado);
    await salvarProdutosFirestore(itensParaSalvar);
    itensParaSalvar.forEach((item) => {
      const existente = state.produtos.find(
        (produtoExistente) =>
          String(produtoExistente.id) === String(item.id),
      );
      if (existente) Object.assign(existente, item);
      else state.produtos.push(item);
    });
    return { categoriasEmFalta };
  } else {
    await removerProdutoFirestore(id);
    return { categoriasEmFalta: [] };
  }
}

export async function devolverAoEstoque(id) {
  const produto = state.produtos.find((p) => String(p.id) === String(id));
  if (!produto) throw new Error("Item não encontrado.");
  const produtoAtualizado = {
    ...produto,
    status: "estoque",
    atribuidoPara: null,
    dataAtribuicao: null,
    atlasOk: false,
  };
  const itensParaSalvar = [produtoAtualizado];
  if (produto.categoriaBase === "PC" && produto.kitConsumido) {
    for (const categoria of CATEGORIAS_QUANTIDADE_POR_PC) {
      const grupo = {
        categoria,
        categoriaBase: categoria,
        subcategoria: null,
      };
      const idGrupo = idEstoqueQuantidade(grupo);
      const estoque = state.produtos.find(
        (item) => String(item.id) === idGrupo,
      );
      const saldoAnterior = estoque ? quantidadeProduto(estoque) : 0;
      const grupoAtualizado = criarProdutoQuantidade(
        grupo,
        saldoAnterior + 1,
        estoque,
      );
      itensParaSalvar.push(grupoAtualizado);
    }
    produtoAtualizado.kitConsumido = false;
  }
  await salvarProdutosFirestore(itensParaSalvar);
  itensParaSalvar.forEach((item) => {
    const existente = state.produtos.find(
      (produtoExistente) => String(produtoExistente.id) === String(item.id),
    );
    if (existente) Object.assign(existente, item);
    else state.produtos.push(item);
  });
}

export async function ajustarQuantidadeEstoque(id, quantidade) {
  if (!Number.isInteger(quantidade)) {
    throw new Error("A quantidade precisa ser um número inteiro.");
  }
  const produto = state.produtos.find((item) => String(item.id) === String(id));
  if (!produto?.estoqueAgrupado) {
    throw new Error("Grupo de estoque não encontrado.");
  }
  const atualizado = {
    ...produto,
    quantidade,
  };
  await salvarProdutoFirestore(atualizado);
  Object.assign(produto, atualizado);
}

export async function atualizarObservacaoCadastro(id, texto) {
  const produto = state.produtos.find((p) => String(p.id) === String(id));
  if (!produto) throw new Error("Item não encontrado.");
  const observacaoAnterior = produto.observacaoCadastro || "";
  const produtoAtualizado = {
    ...produto,
    observacaoCadastro: texto.trim(),
  };
  Object.assign(produto, produtoAtualizado);
  try {
    await salvarProdutoFirestore(produtoAtualizado);
  } catch (erro) {
    if (produto.observacaoCadastro === produtoAtualizado.observacaoCadastro) {
      produto.observacaoCadastro = observacaoAnterior;
    }
    throw erro;
  }
}

export async function importarProdutos(produtosNovos) {
  const ids = new Set(state.produtos.map((produto) => String(produto.id)));
  const nomesUnicos = new Set(
    state.produtos
      .filter((produto) =>
        CATEGORIAS_SEM_DUPLICADOS.includes(
          produto.categoriaBase || produto.categoria,
        ),
      )
      .map(
        (produto) =>
          `${produto.categoriaBase || produto.categoria}:${produto.nome.trim().toLocaleLowerCase("pt-BR")}`,
      ),
  );
  const importaveis = new Map();
  let ignorados = 0;

  for (const produto of produtosNovos) {
    const id = String(produto.id || crypto.randomUUID());
    const dados = { ...produto, id };

    if (ids.has(id)) {
      ignorados += 1;
      continue;
    }

    validarProduto(dados, null);
    ids.add(id);

    if (!produtoIndividual(dados)) {
      const quantidadeImportada =
        dados.quantidade === "" || dados.quantidade == null
          ? 1
          : Number(dados.quantidade);
      if (!Number.isInteger(quantidadeImportada)) {
        throw new Error(`Quantidade inválida para "${dados.nome}".`);
      }
      const idGrupo = idEstoqueQuantidade(dados);
      const importado = importaveis.get(idGrupo);
      const existente = state.produtos.find(
        (item) => String(item.id) === idGrupo,
      );
      const quantidadeInicial = importado
        ? importado.quantidade
        : existente
          ? quantidadeProduto(existente)
          : 0;
      const agrupado = criarProdutoQuantidade(
        dados,
        quantidadeInicial + quantidadeImportada,
        importado || existente,
      );
      const notaImportada = dados.observacaoCadastro?.trim();
      if (
        notaImportada &&
        notaImportada !== agrupado.observacaoCadastro
      ) {
        agrupado.observacaoCadastro = [
          agrupado.observacaoCadastro,
          notaImportada,
        ]
          .filter(Boolean)
          .join("\n");
      }
      importaveis.set(idGrupo, agrupado);
      continue;
    }

    const nomeKey = `${dados.categoriaBase || dados.categoria}:${dados.nome.trim().toLocaleLowerCase("pt-BR")}`;
    if (nomesUnicos.has(nomeKey)) {
      ignorados += 1;
      continue;
    }
    if (CATEGORIAS_SEM_DUPLICADOS.includes(dados.categoriaBase || dados.categoria)) {
      nomesUnicos.add(nomeKey);
    }
    importaveis.set(id, {
      status: "estoque",
      atribuidoPara: null,
      dataAtribuicao: null,
      atlasOk: false,
      ...dados,
    });
  }

  let importados = 0;
  for (const produto of importaveis.values()) {
    try {
      await salvarProdutoFirestore(produto);
    } catch (erro) {
      throw new Error(
        `Falha ao importar "${produto.nome}". ${importados} item(ns) foram importados antes do erro.`,
        { cause: erro },
      );
    }
    state.produtos = [
      ...state.produtos.filter(
        (existente) => String(existente.id) !== String(produto.id),
      ),
      produto,
    ];
    importados += 1;
  }

  return { importados, ignorados };
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
