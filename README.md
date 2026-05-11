# Analisador Temporal ISP RJ

Aplicacao estatica para analisar a base `BaseDPEvolucaoMensalCisp.csv`, do Instituto de Seguranca Publica do Rio de Janeiro.

## Estrutura esperada

A base deve estar em `data/BaseDPEvolucaoMensalCisp.csv` e usa separador `;`.

Campos territoriais reconhecidos:

- `cisp`
- `aisp`
- `risp`
- `munic`
- `regiao`

Campos temporais reconhecidos:

- `ano`
- `mes`
- `mes_ano`

As demais colunas numericas sao tratadas como indicadores criminais selecionaveis no programa, por exemplo `letalidade_violenta`, `hom_doloso`, `roubo_rua`, `roubo_veiculo`, `estupro`, `total_roubos`, `total_furtos` e `registro_ocorrencias`.

## Como usar

1. Abra `index.html` no navegador.
2. Se o navegador permitir, a base em `data/BaseDPEvolucaoMensalCisp.csv` sera carregada automaticamente.
3. Se estiver usando o arquivo local e o navegador bloquear o carregamento automatico, clique em **Abrir CSV** e selecione a base manualmente.
4. Escolha o indicador, periodo, nivel territorial e filtros.
5. Clique em **Analisar**.

## Modulos incluidos

- Serie temporal agregada do indicador selecionado.
- Media movel configuravel.
- Variacao contra o periodo anterior.
- Variacao contra o mesmo periodo do ano anterior.
- Identificacao de pontos atipicos por desvio-padrao.
- Sazonalidade mensal.
- Quebras abruptas.
- Projecao linear simples para os proximos 3 periodos.
- Ranking territorial por municipio, CISP, AISP, RISP ou regiao.
- Texto automatico em paragrafos para uso em relatorio.
- Exportacao do relatorio pelo navegador em PDF.

## Publicacao no GitHub Pages

Crie um repositorio, envie estes arquivos mantendo a pasta `data/` e ative GitHub Pages em **Settings > Pages > Deploy from a branch > main / root**.

Arquivos principais:

- `index.html`
- `styles.css`
- `app.js`
- `README.md`
- `data/BaseDPEvolucaoMensalCisp.csv`
- `data/populacao_municipios_rj_ano.csv`

## Taxas por 100 mil habitantes

O app inclui a opcao **Escala > Taxa por 100 mil hab.**. Ela usa `mcirc` como codigo municipal IBGE e cruza os registros criminais com `data/populacao_municipios_rj_ano.csv`.

A base populacional foi montada com fontes oficiais do IBGE/SIDRA:

- tabela 6579: estimativas municipais de populacao;
- tabela 793: Contagem da Populacao 2007;
- tabela 200: Censo Demografico 2010;
- tabela 4714: Censo Demografico 2022.

O ano de 2023 foi preenchido por interpolacao linear entre o Censo 2022 e a estimativa 2024, com o campo `metodo` marcado como `interpolacao_linear_2022_2024`. Para municipio, a taxa e direta. Para AISP, RISP e CISP, a taxa usa a soma das populacoes dos municipios presentes no recorte, portanto e uma aproximacao quando a area de seguranca nao corresponde a municipios inteiros.
