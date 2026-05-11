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
