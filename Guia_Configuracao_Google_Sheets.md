
# Guia Gestão Unificada SFK & B+: Configuração do Google Apps Script

Este script permite que o aplicativo leia dados de alunos, turmas, frequências e a nova associação de **Unidades x Identidades**.

## 1. Instruções de Instalação

1. Na sua Planilha Google, vá em **Extensões** > **Apps Script**.
2. Substitua o código existente pelo código abaixo.
3. Clique em **Implantar** > **Gerenciar implantações** > **Editar** (ícone de lápis) > **Nova Versão**.
4. Certifique-se de que o acesso continua como "Qualquer pessoa".

## 2. Código do Script (Versão 3.1 com Auditoria de Frequência)

```javascript
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  
  function findSheetSmart(keywords) {
    for (var i = 0; i < sheets.length; i++) {
      var name = sheets[i].getName().toLowerCase();
      for (var k = 0; k < keywords.length; k++) {
        if (name.indexOf(keywords[k].toLowerCase()) !== -1) return sheets[i];
      }
    }
    return null;
  }

  // Localização inteligente das abas
  var sheetBase = findSheetSmart(["base", "aluno", "estudante"]) || sheets[0];
  var sheetTurmas = findSheetSmart(["turma", "curso", "horario"]);
  var sheetUsuarios = findSheetSmart(["usu", "oper", "profe", "login", "nivel"]);
  var sheetExperimental = findSheetSmart(["experimental", "leads", "aula exp"]);
  var sheetFreq = findSheetSmart(["frequencia", "chamada", "presenca"]);
  var sheetConfig = findSheetSmart(["config", "parametros", "ajustes", "setup"]);
  var sheetUnidades = findSheetSmart(["unidade", "escolas", "unid"]); // Nova Aba

  var result = {
    base: getSheetDataWithRecovery(sheetBase),
    turmas: getSheetDataWithRecovery(sheetTurmas),
    usuarios: getSheetDataWithRecovery(sheetUsuarios),
    experimental: getSheetDataWithRecovery(sheetExperimental),
    frequencia: getSheetDataWithRecovery(sheetFreq),
    configuracoes: getSheetDataWithRecovery(sheetConfig),
    unidadesMapping: getSheetDataWithRecovery(sheetUnidades), // Adicionado ao retorno
    status: "OK",
    timestamp: new Date().getTime()
  };
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var data = contents.data;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (action === "save_experimental") {
      var sheet = ss.getSheetByName("EXPERIMENTAL") || findSheetSmart(["experimental", "leads", "aula exp"]);
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0].map(function(h) { return normalizeText(h).replace(/[^a-z0-9]/g, ""); });
      
      var colEstudante = headers.indexOf("estudante");
      var colCurso = headers.indexOf("modalidade") === -1 ? headers.indexOf("curso") : headers.indexOf("modalidade");
      if (colCurso === -1) colCurso = headers.indexOf("turma");
      
      var colEnviado = headers.indexOf("enviado");
      var colFeedback = headers.indexOf("feedback");
      var colStatus = headers.indexOf("status");
      var colConversao = headers.indexOf("conversao");
      var colLembrete = headers.indexOf("lembrete");
      var colReagendar = headers.indexOf("reagendar");
      
      for (var i = 1; i < rows.length; i++) {
        if (normalizeText(rows[i][colEstudante]) === normalizeText(data.estudante) && 
            (normalizeText(rows[i][colCurso]) === normalizeText(data.curso) || !data.curso)) {
          
          if (colEnviado !== -1 && data.enviado !== undefined) sheet.getRange(i + 1, colEnviado + 1).setValue(data.enviado);
          if (colFeedback !== -1 && data.feedback !== undefined) sheet.getRange(i + 1, colFeedback + 1).setValue(data.feedback);
          if (colStatus !== -1 && data.status !== undefined) sheet.getRange(i + 1, colStatus + 1).setValue(data.status);
          if (colConversao !== -1 && data.conversao !== undefined) sheet.getRange(i + 1, colConversao + 1).setValue(data.conversao);
          if (colLembrete !== -1 && data.lembrete !== undefined) sheet.getRange(i + 1, colLembrete + 1).setValue(data.lembrete);
          if (colReagendar !== -1 && data.reagendar !== undefined) sheet.getRange(i + 1, colReagendar + 1).setValue(data.reagendar);
          break;
        }
      }
    }
    
    else if (action === "save_frequencia") {
      var sheet = ss.getSheetByName("FREQUENCIA") || findSheetSmart(["frequencia", "chamada", "presenca"]);
      if (!sheet) {
        sheet = ss.insertSheet("FREQUENCIA");
        sheet.appendRow(["ESTUDANTE", "UNIDADE", "TURMA", "DATA", "STATUS", "OBSERVAÇÃO", "ALARME", "DATA INCLUSÃO"]);
      }
      
      var rows = sheet.getDataRange().getValues();
      // Mapeamento de colunas: A:0, B:1, C:2, D:3, E:4, F:5, G:6, H:7
      var colAluno = 0, colUnidade = 1, colTurma = 2, colData = 3, colStatus = 4, colObs = 5, colAlarme = 6, colTimestamp = 7;  

      if (Array.isArray(data)) {
        data.forEach(function(p) {
          var foundIndex = -1;
          var pAluno = p.aluno || p.alunoId;
          var pTurma = p.turma || p.turmaId;

          for (var i = 1; i < rows.length; i++) {
            var rowData = rows[i][colData];
            var formattedRowData = rowData instanceof Date ? Utilities.formatDate(rowData, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : rowData.toString();

            if (normalizeText(rows[i][colAluno]) === normalizeText(pAluno) && 
                normalizeText(rows[i][colTurma]) === normalizeText(pTurma) && 
                formattedRowData === p.data) {
              foundIndex = i + 1;
              break;
            }
          }

          if (foundIndex !== -1) {
            sheet.getRange(foundIndex, colStatus + 1).setValue(p.status);
            sheet.getRange(foundIndex, colObs + 1).setValue(p.observacao || "");
            sheet.getRange(foundIndex, colUnidade + 1).setValue(p.unidade);
            if (p.alarme) sheet.getRange(foundIndex, colAlarme + 1).setValue(p.alarme);
            sheet.getRange(foundIndex, colTimestamp + 1).setValue(p.timestampInclusao || "");
          } else {
            sheet.appendRow([pAluno, p.unidade, pTurma, p.data, p.status, p.observacao || "", p.alarme || "", p.timestampInclusao || ""]);
          }
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: "success"}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(f) {
    return ContentService.createTextOutput(JSON.stringify({status: "error", message: f.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheetDataWithRecovery(sheet) {
  if (!sheet) return [];
  try {
    var range = sheet.getDataRange();
    var displayValues = range.getDisplayValues(); 
    var formulas = range.getFormulas();           
    
    if (displayValues.length < 1) return [];
    var headers = displayValues[0];
    var data = [];
    
    for (var i = 1; i < displayValues.length; i++) {
      var item = {};
      var hasData = false;
      for (var j = 0; j < headers.length; j++) {
        var key = normalizeText(headers[j]).replace(/[^a-z0-9]/g, "");
        if (!key) continue;
        var val = displayValues[i][j];
        if (val === "#ERROR!" && formulas[i][j]) val = formulas[i][j];
        item[key] = val;
        if (val) hasData = true;
      }
      if (hasData) data.push(item);
    }
    return data;
  } catch(e) { return []; }
}

function normalizeText(text) {
  if (!text) return "";
  return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}
```
