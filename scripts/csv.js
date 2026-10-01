const CSV_COLUMNS = [
  "id",
  "nome",
  "categoria",
  "categoriaBase",
  "subcategoria",
  "observacaoCadastro",
  "quantidade",
  "estoqueAgrupado",
  "status",
  "atribuidoPara",
  "dataAtribuicao",
  "atlasOk",
  "kitConsumido",
];

function csvCell(valor) {
  let texto = valor == null ? "" : String(valor);
  if (/^[\s]*[=+\-@]/.test(texto)) texto = `'${texto}`;
  return `"${texto.replace(/"/g, '""')}"`;
}

function recordsFromCsv(texto) {
  const primeiraLinha = texto.split(/\r?\n/, 1)[0] || "";
  const delimitador =
    (primeiraLinha.match(/;/g) || []).length >
    (primeiraLinha.match(/,/g) || []).length
      ? ";"
      : ",";
  const linhas = [];
  let linha = [];
  let campo = "";
  let entreAspas = false;

  for (let indice = 0; indice < texto.length; indice += 1) {
    const caractere = texto[indice];
    if (entreAspas) {
      if (caractere === '"' && texto[indice + 1] === '"') {
        campo += '"';
        indice += 1;
      } else if (caractere === '"') {
        entreAspas = false;
      } else {
        campo += caractere;
      }
    } else if (caractere === '"' && campo.length === 0) {
      entreAspas = true;
    } else if (caractere === delimitador) {
      linha.push(campo);
      campo = "";
    } else if (caractere === "\n" || caractere === "\r") {
      if (caractere === "\r" && texto[indice + 1] === "\n") indice += 1;
      linha.push(campo);
      if (linha.some((valor) => valor !== "")) linhas.push(linha);
      linha = [];
      campo = "";
    } else {
      campo += caractere;
    }
  }

  if (entreAspas) throw new Error("O CSV contém um campo com aspas não fechadas.");
  linha.push(campo);
  if (linha.some((valor) => valor !== "")) linhas.push(linha);
  return linhas;
}

function lerBooleano(valor, linha) {
  if (["true", "1", "sim"].includes(valor.trim().toLocaleLowerCase("pt-BR"))) {
    return true;
  }
  if (
    ["false", "0", "nao", "não", ""].includes(
      valor.trim().toLocaleLowerCase("pt-BR"),
    )
  ) {
    return false;
  }
  throw new Error(`Valor atlasOk inválido na linha ${linha}.`);
}

export function exportarProdutosCsv(produtos) {
  const linhas = [
    CSV_COLUMNS,
    ...produtos.map((produto) =>
      CSV_COLUMNS.map((coluna) =>
        csvCell(produto[coluna]),
      ),
    ),
  ];
  const conteudo = `\uFEFF${linhas.map((linha) => linha.join(";")).join("\r\n")}`;
  const url = URL.createObjectURL(
    new Blob([conteudo], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `backup-estoque-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseProdutosCsv(conteudo) {
  const linhas = recordsFromCsv(conteudo.replace(/^\uFEFF/, ""));
  if (linhas.length < 2) {
    throw new Error("O arquivo CSV não contém itens para importar.");
  }

  const cabecalhos = linhas[0].map((cabecalho) =>
    cabecalho.trim().toLocaleLowerCase("pt-BR"),
  );
  const coluna = (nome) => cabecalhos.indexOf(nome.toLocaleLowerCase("pt-BR"));
  if (coluna("nome") < 0 || coluna("categoria") < 0) {
    throw new Error("O CSV precisa ter as colunas nome e categoria.");
  }

  return linhas.slice(1).map((campos, indice) => {
    const linha = indice + 2;
    const valor = (nome) => {
      const posicao = coluna(nome);
      const campo = posicao < 0 ? "" : (campos[posicao] || "").trim();
      return /^'[\s]*[=+\-@]/.test(campo) ? campo.slice(1) : campo;
    };
    let categoria = valor("categoria");
    let categoriaBase = valor("categoriaBase") || categoria;
    let subcategoria = valor("subcategoria") || null;
    const outro = categoria.match(/^Outro\s*\((.+)\)$/i);
    if (outro && !subcategoria) {
      subcategoria = outro[1].trim();
      categoriaBase = "Outro";
    }
    if (categoriaBase === "Outro" && subcategoria) {
      categoria = `Outro (${subcategoria})`;
    }
    if (!valor("nome") || !categoria) {
      throw new Error(`Nome e categoria são obrigatórios na linha ${linha}.`);
    }

    const status = valor("status") || "estoque";
    if (!["estoque", "atribuido"].includes(status)) {
      throw new Error(`Status inválido na linha ${linha}.`);
    }
    if (status === "atribuido" && !valor("atribuidoPara")) {
      throw new Error(`A pessoa atribuída é obrigatória na linha ${linha}.`);
    }
    if (
      status === "atribuido" &&
      !["PC", "Monitor", "Wacom"].includes(categoriaBase)
    ) {
      throw new Error(
        `Somente PC, Monitor e Wacom podem ser importados como atribuídos (linha ${linha}).`,
      );
    }
    const quantidade = Number(valor("quantidade") || 1);
    if (!Number.isInteger(quantidade)) {
      throw new Error(`Quantidade inválida na linha ${linha}.`);
    }

    return {
      id: valor("id") || crypto.randomUUID(),
      nome: valor("nome"),
      categoria,
      categoriaBase,
      subcategoria,
      observacaoCadastro: valor("observacaoCadastro"),
      quantidade,
      estoqueAgrupado:
        valor("estoqueAgrupado").toLocaleLowerCase("pt-BR") === "true",
      status,
      atribuidoPara: valor("atribuidoPara") || null,
      dataAtribuicao: valor("dataAtribuicao") || null,
      atlasOk: lerBooleano(valor("atlasOk"), linha),
      kitConsumido: lerBooleano(valor("kitConsumido"), linha),
    };
  });
}
