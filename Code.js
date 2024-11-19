function onOpen() {
  var ui = SpreadsheetApp.getUi()
  ui.createMenu('SCPN')
    .addItem('Open Sidebar', 'showSidebar')
    .addToUi()
}

function showSidebar() {
  var htmlOutput = HtmlService.createHtmlOutputFromFile('sidebar')
      .setTitle('SCPN')
      .setWidth(300)
  SpreadsheetApp.getUi().showSidebar(htmlOutput)
}

function getTableData() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet()
  var dataRange = sheet.getDataRange()
  var dataValues = dataRange.getValues()
  return dataValues
}

function formatTableData(dataValues) {
  var headers = dataValues[0]
  var tableData = {}

  headers.forEach(function(header) {
    tableData[header] = []
  })

  for (var i = 1; i < dataValues.length; i++) {
    var row = dataValues[i]
    for (var j = 0; j < headers.length; j++) {
      var header = headers[j]
      tableData[header].push(String(row[j]))
    }
  }

  return tableData
}

function setHuggingFaceToken() {
  var userProperties = PropertiesService.getUserProperties()
  userProperties.setProperty('HF_API_TOKEN', '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')
}

function checkToken() {
  var userProperties = PropertiesService.getUserProperties()
  var token = userProperties.getProperty('HF_API_TOKEN')
  Logger.log("Token: " + token)
}

function callTapasModel(query, tableData) {
  var userProperties = PropertiesService.getUserProperties()
  var apiToken = userProperties.getProperty('HF_API_TOKEN')

  if (!apiToken) {
    throw new Error('API Token not set. Run setHuggingFaceToken first.')
  }

  var apiUrl = 'https://api-inference.huggingface.co/models/google/tapas-base-finetuned-wtq'
  var payload = {
    inputs: {
      query: query,
      table: tableData
    }
  }

  var options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      Authorization: 'Bearer ' + apiToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  }

  var response = UrlFetchApp.fetch(apiUrl, options)
  var responseCode = response.getResponseCode()
  if (responseCode === 200) {
    var responseData = JSON.parse(response.getContentText())
    return responseData
  } else {
    var error = response.getContentText()
    throw new Error('API request failed with response code ' + responseCode + ': ' + error)
  }
}

function processUserQuery(userQuery) {
  try {
    var dataValues = getTableData()
    var tableData = formatTableData(dataValues)
    var response = callTapasModel(userQuery, tableData)
    var answer = response.answer || 'No answer found.'
    return answer
  } catch (error) {
    throw new Error(error.message)
  }
}

// Hàm lấy dòng tiêu đề từ Google Sheets
function getHeaders() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Lấy bảng 'Raw Data' và dòng tiêu đề của bảng này
  const rawDataSheet = spreadsheet.getSheetByName('Raw Data');
  const rawDataHeaders = rawDataSheet
    .getRange(1, 1, 1, rawDataSheet.getLastColumn())
    .getValues()[0]
    .filter(header => header && header.trim() !== ''); // Lọc tiêu đề không rỗng

  // Lấy bảng 'Doanh thu chi tiết' và dòng tiêu đề của bảng này
  const revenueSheet = spreadsheet.getSheetByName('Doanh thu chi tiết');
  const revenueHeaders = revenueSheet
    .getRange(1, 1, 1, revenueSheet.getLastColumn())
    .getValues()[0]
    .filter(header => header && header.trim() !== ''); // Lọc tiêu đề không rỗng

  // Kết hợp hai mảng tiêu đề từ cả hai bảng và loại bỏ tiêu đề trùng lặp
  const combinedHeaders = [...new Set([...rawDataHeaders, ...revenueHeaders])];

  console.log(combinedHeaders)

  return combinedHeaders; // Trả về mảng tiêu đề kết hợp
}
// Hàm xử lý khi người dùng chọn các tiêu đề
function processSelectedHeaders(selectedHeaders) {
  // Xử lý các tiêu đề được chọn (selectedHeaders là một mảng chứa các tiêu đề được người dùng chọn)
  Logger.log("Selected Headers: " + selectedHeaders);
  
  // Thực hiện logic cần thiết với các tiêu đề đã chọn (ví dụ: lọc dữ liệu theo các tiêu đề này)
  // Code xử lý thêm nếu cần
}
