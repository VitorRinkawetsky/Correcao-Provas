param(
    [string]$OutputPath = "Diario Individual de Organizacao de Tarefas - Gustavo Gorges Koch.docx"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

function Escape-XmlText {
    param([string]$Text)
    return [System.Security.SecurityElement]::Escape($Text)
}

function New-Run {
    param(
        [string]$Text,
        [switch]$Bold
    )

    $escaped = Escape-XmlText $Text
    $boldXml = if ($Bold) { "<w:b/>" } else { "" }
    return "<w:r><w:rPr><w:rFonts w:ascii=`"Aptos`" w:hAnsi=`"Aptos`"/>$boldXml</w:rPr><w:t xml:space=`"preserve`">$escaped</w:t></w:r>"
}

function New-Paragraph {
    param(
        [string]$Text,
        [string]$Style = "Normal",
        [switch]$Bold
    )

    $styleXml = if ($Style -and $Style -ne "Normal") { "<w:pStyle w:val=`"$Style`"/>" } else { "" }
    return "<w:p><w:pPr>$styleXml</w:pPr>$(New-Run -Text $Text -Bold:$Bold)</w:p>"
}

function New-Cell {
    param(
        [string]$Text,
        [int]$Width = 2500,
        [switch]$Header
    )

    $fill = if ($Header) { "<w:shd w:fill=`"D9EAF7`"/>" } else { "" }
    $runs = if ($Header) { New-Run -Text $Text -Bold } else { New-Run -Text $Text }
    return @"
<w:tc>
  <w:tcPr>
    <w:tcW w:w="$Width" w:type="dxa"/>
    <w:tcBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
    </w:tcBorders>
    <w:tcMar>
      <w:top w:w="120" w:type="dxa"/>
      <w:left w:w="120" w:type="dxa"/>
      <w:bottom w:w="120" w:type="dxa"/>
      <w:right w:w="120" w:type="dxa"/>
    </w:tcMar>
    $fill
  </w:tcPr>
  <w:p><w:pPr><w:spacing w:after="80"/></w:pPr>$runs</w:p>
</w:tc>
"@
}

function New-Table {
    param(
        [string[]]$Headers,
        [object[]]$Rows,
        [int[]]$Widths
    )

    $grid = ($Widths | ForEach-Object { "<w:gridCol w:w=`"$_`"/>" }) -join ""
    $headerCells = for ($i = 0; $i -lt $Headers.Count; $i++) {
        New-Cell -Text $Headers[$i] -Width $Widths[$i] -Header
    }

    $rowXml = "<w:tr>$($headerCells -join '')</w:tr>"
    foreach ($row in $Rows) {
        $cells = for ($i = 0; $i -lt $Headers.Count; $i++) {
            New-Cell -Text ([string]$row[$i]) -Width $Widths[$i]
        }
        $rowXml += "<w:tr>$($cells -join '')</w:tr>"
    }

    return @"
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="D9D9D9"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid>$grid</w:tblGrid>
  $rowXml
</w:tbl>
"@
}

function New-ImagePlaceholder {
    param(
        [string]$Title,
        [string]$Instruction
    )

    return @"
<w:tbl>
  <w:tblPr>
    <w:tblW w:w="9500" w:type="dxa"/>
    <w:tblBorders>
      <w:top w:val="dashed" w:sz="8" w:space="0" w:color="808080"/>
      <w:left w:val="dashed" w:sz="8" w:space="0" w:color="808080"/>
      <w:bottom w:val="dashed" w:sz="8" w:space="0" w:color="808080"/>
      <w:right w:val="dashed" w:sz="8" w:space="0" w:color="808080"/>
    </w:tblBorders>
  </w:tblPr>
  <w:tblGrid><w:gridCol w:w="9500"/></w:tblGrid>
  <w:tr>
    <w:trPr><w:trHeight w:val="3600"/></w:trPr>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="9500" w:type="dxa"/>
        <w:tcMar>
          <w:top w:w="240" w:type="dxa"/>
          <w:left w:w="240" w:type="dxa"/>
          <w:bottom w:w="240" w:type="dxa"/>
          <w:right w:w="240" w:type="dxa"/>
        </w:tcMar>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr>$(New-Run -Text $Title -Bold)</w:p>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr>$(New-Run -Text $Instruction)</w:p>
    </w:tc>
  </w:tr>
</w:tbl>
"@
}

$generatedAt = "11/09/2026"
$authorName = "Gustavo Gorges Koch"
$repository = "https://github.com/VitorRinkawetsky/Correcao-Provas.git"
$branch = "feat/turmas"
$commit = "3a307a5673d1cca17f1b6fbeb5fa24e4199ff576"

$body = ""
$body += New-Paragraph -Text "Diario Individual de Organizacao de Tarefas N1" -Style "Title"
$body += New-Paragraph -Text "Aluno: $authorName"
$body += New-Paragraph -Text "Projeto: Correcao Provas"
$body += New-Paragraph -Text "Disciplina: Projeto e Arquitetura de Software"
$body += New-Paragraph -Text "Data de atualizacao: $generatedAt"
$body += New-Paragraph -Text "Repositorio: $repository"
$body += New-Paragraph -Text "Branch de trabalho: $branch"
$body += New-Paragraph -Text "Commit principal registrado: $commit"

$body += New-Paragraph -Text "Objetivo do documento" -Style "Heading1"
$body += New-Paragraph -Text "Este diario individual registra as atividades realizadas pelo aluno na fase N1, conforme o criterio C4 do documento de escopo e avaliacao. O foco e demonstrar quais tarefas foram executadas, quais arquivos foram alterados, quais evidencias tecnicas existem no repositorio e quais comprovacoes ainda precisam ser anexadas antes da entrega final."

$body += New-Paragraph -Text "Resumo das entregas individuais" -Style "Heading1"
$summaryRows = @(
    @("Tela Detalhes da Turma", "Implementada", "/pages/turma-detalhes.html?id=1", "Mostra nome da turma, disciplina, periodo, codigo de convite, botoes copiar e regenerar, lista de alunos e modal fake para adicionar aluno."),
    @("Tela Criar Editar Turma", "Implementada", "/pages/turma-form.html", "Contem campos Nome, Disciplina e Periodo, alem do botao Salvar. A tela pode ser usada como criacao ou edicao."),
    @("Tela de Listagem de Turmas", "Implementada", "/pages/turmas.html", "Lista as turmas disponiveis e permite acessar os detalhes de cada turma. Tambem contem botao Nova turma para abrir o formulario.")
)
$body += New-Table -Headers @("Feature", "Situacao", "Rota", "Descricao") -Rows $summaryRows -Widths @(2200, 1500, 2200, 3600)

$body += New-Paragraph -Text "Fluxo de navegacao implementado" -Style "Heading1"
$flowRows = @(
    @("1", "Acessar o sistema pela pagina inicial ou pelo menu superior.", "O menu principal apresenta a opcao Turmas."),
    @("2", "Clicar em Turmas.", "O usuario e direcionado para /pages/turmas.html."),
    @("3", "Selecionar uma turma da lista.", "O usuario e direcionado para /pages/turma-detalhes.html?id=1 ou para o id da turma escolhida."),
    @("4", "Clicar em Nova turma na listagem.", "O usuario e direcionado para /pages/turma-form.html."),
    @("5", "Na tela de detalhes, clicar em Adicionar aluno.", "O sistema abre um modal fake com campo E-mail do aluno e botao Adicionar.")
)
$body += New-Table -Headers @("Passo", "Acao", "Resultado esperado") -Rows $flowRows -Widths @(900, 3800, 4800)

$body += New-Paragraph -Text "Arquivos alterados ou criados" -Style "Heading1"
$fileRows = @(
    @("src/client/views/ClassListView.vue", "Criado", "Implementa a tela de listagem de turmas."),
    @("src/client/views/ClassDetailsView.vue", "Criado", "Implementa a tela de detalhes da turma e modal fake de aluno."),
    @("src/client/views/ClassFormView.vue", "Criado", "Implementa a tela de criacao e edicao de turma."),
    @("src/client/router/index.js", "Alterado", "Registra as rotas /pages/turmas.html, /pages/turma-detalhes.html e /pages/turma-form.html."),
    @("src/client/components/layout/AppShell.vue", "Alterado", "Adiciona o link Turmas na navegacao principal."),
    @("src/client/styles/main.css", "Alterado", "Adiciona estilos responsivos seguindo a identidade visual existente."),
    @("src/client/data/mockData.js", "Alterado", "Adiciona dados e helpers para detalhes e resumo das turmas."),
    @("src/client/data/mockData.test.js", "Alterado", "Adiciona testes para os dados das turmas.")
)
$body += New-Table -Headers @("Arquivo", "Tipo", "Contribuicao") -Rows $fileRows -Widths @(3400, 1300, 4800)

$body += New-Paragraph -Text "Evidencias tecnicas coletadas" -Style "Heading1"
$evidenceRows = @(
    @("Commit", "3a307a5 - feat : adiciona features relacionadas as turmas", "Registrado no historico local e na branch origin/feat/turmas."),
    @("Autor do commit", "Gustavo Gorges Koch <gustavo.gorges.koch@gmail.com>", "Compatível com o diario individual do aluno."),
    @("Branch", "feat/turmas", "Branch contem as alteracoes das telas de turma."),
    @("Teste automatizado", "npm.cmd test", "5 testes passaram, incluindo validacao dos dados da listagem e detalhes da turma."),
    @("Build de producao", "npm.cmd run build", "Build Vite concluiu sem erro."),
    @("Rotas locais verificadas", "/pages/turmas.html e /pages/turma-detalhes.html?id=1", "Ambas responderam HTTP 200 no servidor local.")
)
$body += New-Table -Headers @("Evidencia", "Registro", "Observacao") -Rows $evidenceRows -Widths @(2100, 3800, 3600)

$body += New-Paragraph -Text "Evidencia do Pull Request mergeado" -Style "Heading1"
$body += New-Paragraph -Text "Cole neste espaco um print do Pull Request da branch feat/turmas aprovado e mergeado na branch main. O print deve mostrar o nome do PR, o status merged, a branch de origem, a branch de destino e, se possivel, a aprovacao da revisao."
$body += New-ImagePlaceholder -Title "Espaco reservado para o print do PR mergeado" -Instruction "Inserir aqui a imagem capturada do GitHub apos o merge do Pull Request."

$body += New-Paragraph -Text "Relacao com os criterios N1" -Style "Heading1"
$criteriaRows = @(
    @("C1", "Codigo fonte compactado", "Contribui parcialmente", "As telas foram implementadas no repositorio. Antes da entrega, gerar o zip sem node_modules."),
    @("C2", "Sistema hospedado", "Contribui parcialmente", "As rotas funcionam localmente. Falta anexar link do sistema hospedado apos deploy."),
    @("C3", "Documentacao README", "Contribui indiretamente", "As rotas e instrucoes podem ser adicionadas ao README v1."),
    @("C4", "Diario individual", "Atendido neste documento com pendencias externas", "O documento registra tarefas, commit e verificacoes. Ainda faltam prints e comprovacao de PR aprovado e mergeado.")
)
$body += New-Table -Headers @("Codigo", "Criterio", "Situacao", "Como foi atendido") -Rows $criteriaRows -Widths @(900, 2400, 2300, 3900)

$body += New-Paragraph -Text "Pendencias para satisfazer totalmente o criterio individual" -Style "Heading1"
$pendingRows = @(
    @("Print do commit no GitHub", "Pendente", "Anexar imagem do commit 3a307a5 na branch feat/turmas."),
    @("Print do Pull Request", "Pendente", "Abrir ou localizar o PR da branch feat/turmas para main e anexar imagem."),
    @("Aprovacao do Pull Request", "Pendente", "Anexar evidencia de revisao aprovada."),
    @("Merge na branch principal", "Pendente", "No momento da verificacao, o commit 3a307a5 aparece somente em feat/turmas e origin/feat/turmas, nao em main."),
    @("Sistema hospedado com a alteracao", "Pendente", "Anexar link da hospedagem e print das telas Turmas, Detalhes da Turma e Criar Editar Turma no ambiente publicado.")
)
$body += New-Table -Headers @("Item exigido", "Situacao", "Acao necessaria") -Rows $pendingRows -Widths @(2800, 1700, 5000)

$body += New-Paragraph -Text "Conclusao individual" -Style "Heading1"
$body += New-Paragraph -Text "Na fase N1, o aluno implementou as telas navegaveis de turmas usando dados mock, conforme permitido para esta etapa. A contribuicao inclui listagem de turmas, detalhes de turma especifica e formulario de criacao ou edicao. A implementacao esta registrada no commit informado e validada por testes e build local. Para que a nota individual reconheca integralmente a contribuicao, ainda e necessario anexar as evidencias visuais de commit, Pull Request aprovado, merge na branch principal e presenca das telas no sistema hospedado entregue."

$documentXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    $body
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1080" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>
"@

$stylesXml = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:after="160" w:line="276" w:lineRule="auto"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="22"/><w:color w:val="000000"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:spacing w:before="0" w:after="280"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:sz w:val="42"/><w:color w:val="000000"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:pPr><w:keepNext/><w:spacing w:before="360" w:after="160"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Aptos Display" w:hAnsi="Aptos Display"/><w:b/><w:sz w:val="30"/><w:color w:val="000000"/></w:rPr>
  </w:style>
</w:styles>
"@

$contentTypes = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>
"@

$rels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"@

$docRels = @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>
"@

$absoluteOutput = Join-Path (Get-Location) $OutputPath
$tempRoot = Join-Path (Get-Location) ".docx-build"
if (Test-Path -LiteralPath $tempRoot) {
    Remove-Item -LiteralPath $tempRoot -Recurse -Force
}
New-Item -ItemType Directory -Path (Join-Path $tempRoot "_rels") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $tempRoot "word\_rels") | Out-Null

[System.IO.File]::WriteAllText((Join-Path $tempRoot "[Content_Types].xml"), $contentTypes, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText((Join-Path $tempRoot "_rels\.rels"), $rels, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText((Join-Path $tempRoot "word\document.xml"), $documentXml, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText((Join-Path $tempRoot "word\styles.xml"), $stylesXml, [System.Text.UTF8Encoding]::new($false))
[System.IO.File]::WriteAllText((Join-Path $tempRoot "word\_rels\document.xml.rels"), $docRels, [System.Text.UTF8Encoding]::new($false))

if (Test-Path -LiteralPath $absoluteOutput) {
    Remove-Item -LiteralPath $absoluteOutput -Force
}

$archive = [System.IO.Compression.ZipFile]::Open($absoluteOutput, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    $files = Get-ChildItem -LiteralPath $tempRoot -Recurse -File
    foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($tempRoot.Length).TrimStart('\', '/') -replace '\\', '/'
        $entry = $archive.CreateEntry($relativePath, [System.IO.Compression.CompressionLevel]::Optimal)
        $entryStream = $entry.Open()
        $fileStream = [System.IO.File]::OpenRead($file.FullName)
        try {
            $fileStream.CopyTo($entryStream)
        }
        finally {
            $fileStream.Dispose()
            $entryStream.Dispose()
        }
    }
}
finally {
    $archive.Dispose()
}
Remove-Item -LiteralPath $tempRoot -Recurse -Force

Write-Output $absoluteOutput
