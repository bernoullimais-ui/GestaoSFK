
# Guia Frequência B+: Configuração do Google Apps Script

Siga este guia para garantir que o aplicativo consiga ler e gravar dados corretamente na sua planilha, permitindo a edição de chamadas e o controle de lembretes na aba Experimental.

## 1. Código Completo do Script (Copie e Cole)

Substitua todo o conteúdo no seu Editor de Script do Google pelo código abaixo:

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

  var sheetBase = findSheetSmart(["base", "aluno", "estudante"]) || sheets[0];
  var sheetTurmas = findSheetSmart(["turma", "curso", "horario"]);
  var sheetUsuarios = findSheetSmart(["usu", "oper", "profe", "login", "nivel"]);
  var sheetExperimental = findSheetSmart(["experimental", "leads", "aula exp"]);
  var sheetFreq = findSheetSmart(["frequencia", "chamada", "presenca"]);

  var result = {
    base: getSheetDataWithRecovery(sheetBase),
    turmas: getSheetDataWithRecovery(sheetTurmas),
    usuarios: getSheetDataWithRecovery(sheetUsuarios),
    experimental: getSheetDataWithRecovery(sheetExperimental),
    frequencia: getSheetDataWithRecovery(sheetFreq),
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
    
    // 1. SALVAR AULA EXPERIMENTAL
    if (action === "save_experimental") {
      var sheet = ss.getSheetByName("EXPERIMENTAL") || findSheetSmart(["experimental", "leads", "aula exp"]);
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0].map(function(h) { return normalizeText(h).replace(/[^a-z0-9]/g, ""); });
      
      var colEstudante = headers.indexOf("estudante");
      var colCurso = headers.indexOf("modalidade");
      var colEnviado = headers.indexOf("enviado");
      var colFeedback = headers.indexOf("feedback");
      var colStatus = headers.indexOf("status");
      var colConversao = headers.indexOf("conversao");
      var colLembrete = headers.indexOf("lembrete"); // COLUNA M
      
      for (var i = 1; i < rows.length; i++) {
        // Busca por Estudante e Modalidade (Curso) para identificar a linha
        if (normalizeText(rows[i][colEstudante]) === normalizeText(data.estudante) && 
            normalizeText(rows[i][colCurso]) === normalizeText(data.curso)) {
          
          if (colEnviado !== -1 && data.enviado) sheet.getRange(i + 1, colEnviado + 1).setValue(data.enviado);
          if (colFeedback !== -1 && data.feedback !== undefined) sheet.getRange(i + 1, colFeedback + 1).setValue(data.feedback);
          if (colStatus !== -1 && data.status) sheet.getRange(i + 1, colStatus + 1).setValue(data.status);
          if (colConversao !== -1 && data.conversao) sheet.getRange(i + 1, colConversao + 1).setValue(data.conversao);
          if (colLembrete !== -1 && data.lembrete) sheet.getRange(i + 1, colLembrete + 1).setValue(data.lembrete);
          break;
        }
      }
    }
    
    // 2. SALVAR FREQUÊNCIA
    else if (action === "save_frequencia") {
      var sheet = ss.getSheetByName("FREQUENCIA") || findSheetSmart(["frequencia", "chamada", "presenca"]);
      if (!sheet) {
        sheet = ss.insertSheet("FREQUENCIA");
        sheet.appendRow(["Aluno", "Turma", "Data", "Status", "Observacao"]);
      }
      
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0].map(function(h) { return normalizeText(h); });
      
      var colAluno = 0; // Coluna A
      var colTurma = 1; // Coluna B
      var colData = 2;  // Coluna C
      var colStatus = 3; // Coluna D
      var colObs = 4;    // Coluna E

      if (Array.isArray(data)) {
        data.forEach(function(p) {
          var foundIndex = -1;
          for (var i = 1; i < rows.length; i++) {
            var rowAluno = normalizeText(rows[i][colAluno]);
            var rowTurma = normalizeText(rows[i][colTurma]);
            var rowData = rows[i][colData];
            
            var formattedRowData = "";
            if (rowData instanceof Date) {
              formattedRowData = Utilities.formatDate(rowData, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
            } else {
              formattedRowData = rowData.toString();
            }

            if (rowAluno === normalizeText(p.aluno) && 
                rowTurma === normalizeText(p.turma) && 
                formattedRowData === p.data) {
              foundIndex = i + 1;
              break;
            }
          }

          if (foundIndex !== -1) {
            sheet.getRange(foundIndex, colStatus + 1).setValue(p.status);
            sheet.getRange(foundIndex, colObs + 1).setValue(p.observacao || "");
          } else {
            sheet.appendRow([p.aluno, p.turma, p.data, p.status, p.observacao || ""]);
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

// Funções Auxiliares
function getSheetDataWithRecovery(sheet) {
  if (!sheet) return [];
  try {
    var range = sheet.getDataRange();
    var displayValues = range.getDisplayValues(); 
    var formulas = range.getFormulas();           
    
    if (displayValues.length < 2) return [];
    var headers = displayValues[0];
    var data = [];
    
    for (var i = 1; i < displayValues.length; i++) {
      var item = {};
      for (var j = 0; j < headers.length; j++) {
        var key = normalizeText(headers[j]).replace(/[^a-z0-9]/g, "");
        if (!key) continue;
        
        var val = displayValues[i][j];
        if (val === "#ERROR!" && formulas[i][j]) {
           val = formulas[i][j]; 
        }
        item[key] = val;
      }
      data.push(item);
    }
    return data;
  } catch(e) { return []; }
}

function normalizeText(text) {
  if (!text) return "";
  return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function findSheetSmart(keywords) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().toLowerCase();
    for (var k = 0; k < keywords.length; k++) {
      if (name.indexOf(keywords[k].toLowerCase()) !== -1) return sheets[i];
    }
  }
  return null;
}
```

## 2. Como aplicar a correção (Importante)

1. Vá em **Extensões** > **Apps Script** na sua planilha.
2. Apague o código antigo e cole este novo código.
3. Certifique-se de que a Coluna **M** na aba **EXPERIMENTAL** tenha o cabeçalho **LEMBRETE**.
4. Clique em **Salvar**.
5. Clique em **Implantar** > **Gerenciar Implantações**.
6. Clique no ícone de **Lápis (Editar)** na implantação ativa.
7. Selecione **"Nova Versão"** na lista suspensa.
8. Clique em **Implantar**.

Desta forma, o app enviará o comando `lembrete: "Sim"` e o script saberá exatamente onde gravar, utilizando a URL:
`https://script.google.com/macros/s/AKfycbyURtY35iqjVxrmnlhxhBUGeF8Sz9WD6nP7gMr0YGqjD3OZKzUxc_53Q5SfdfdHEo4w/exec`
