function logDataToSheet(header, data) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var logSheet = spreadsheet.getSheetByName('Debug Logs') || spreadsheet.insertSheet('Debug Logs');

  // Xác định cột trống tiếp theo
  var nextColumn = logSheet.getLastColumn() + 1;

  // Ghi tiêu đề (header)
  logSheet.getRange(1, nextColumn).setValue(header);

  // Xử lý dữ liệu trước khi ghi
  if (Array.isArray(data)) {
    // Nếu dữ liệu là mảng 2D hoặc 1D
    if (Array.isArray(data[0])) {
      // Nếu mảng 2D, ghi trực tiếp từng dòng
      logSheet.getRange(2, nextColumn, data.length, 1).setValues(data.map(row => [row.join(", ")]));
    } else {
      // Nếu mảng 1D, ghi từng giá trị trên mỗi dòng
      logSheet.getRange(2, nextColumn, data.length, 1).setValues(data.map(d => [d]));
    }
  } else if (typeof data === 'object') {
    // Nếu dữ liệu là Object, chuyển thành mảng các cặp key-value
    var formattedData = Object.entries(data).map(([key, value]) => `${key}: ${value}`);
    logSheet.getRange(2, nextColumn, formattedData.length, 1).setValues(formattedData.map(d => [d]));
  } else {
    // Nếu là kiểu dữ liệu khác, ghi trực tiếp
    logSheet.getRange(2, nextColumn).setValue(data);
  }

  Logger.log("Dữ liệu đã ghi vào sheet 'Debug Logs'.");
  logSheet.autoResizeColumns(1, logSheet.getLastColumn());
}

/**
 * Hàm này để format ngày thành dd/mm/yyyy
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d)) return 'Invalid Date';
  return `${d.getDate().toString().padStart(2, '0')}/${
    (d.getMonth() + 1).toString().padStart(2, '0')
  }/${d.getFullYear()}`;
}

/**
 * Hàm này để parse giá trị số
 * @param {any} value 
 * @returns {number}
 */
function parseValue(value) {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/\./g, '').replace(/,/g, '.')) || 0;
  } else if (typeof value === 'number') {
    return value;
  } else {
    return 0;
  }
}

/**
 * Hàm này để lấy tất cả các sản phẩm trong cột Sản phẩm của sheet Đầu vào.
 * @returns {Array<string>} Danh sách các sản phẩm duy nhất.
 */
function getAllProductsFromInputSheet(sheetName, columnName) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  var sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    console.log(`Sheet '${sheetName}' không tồn tại.`);
    return [];
  }
  
  var range = sheet.getRange(columnName + "2:" + columnName + sheet.getLastRow());

  var columnCValues = range.getValues();

  var uniqueProducts = Array.from(
    new Set(columnCValues.flat().filter(product => product))
  );
  
  return uniqueProducts;
}

function generateReplaceDict(productsDTCT, productsRaw) {
  var replaceDict = {};
  var matched = new Set(); // Theo dõi các sản phẩm đã được match

  productsDTCT.forEach(productDTCT => {
    // Tìm sản phẩm Raw có phần tên giống
    var matchedProduct = productsRaw.find(productRaw =>
      productRaw.toLowerCase().includes(productDTCT.toLowerCase()) ||
      productDTCT.toLowerCase().includes(productRaw.toLowerCase())
    );

    if (matchedProduct) {
      replaceDict[productDTCT] = matchedProduct; // Map sản phẩm DTCT sang Raw Data
      matched.add(matchedProduct); // Đánh dấu sản phẩm Raw đã được sử dụng
    } else {
      replaceDict[productDTCT] = "Khác"; // Nếu không match, đưa vào 'Khác'
    }
  });

  // Log các sản phẩm Raw chưa được sử dụng
  var unmatchedRawProducts = productsRaw.filter(productRaw => !matched.has(productRaw));

  logDataToSheet("replaceDict", replaceDict);
  logDataToSheet("Các sản phẩm trong Raw Data không được match", unmatchedRawProducts);

  return replaceDict;
}

function mappingProductInRawData(columnNeedToMapping, columnProduct) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetRawData);

  if (!sheet) {
    Logger.log(`Sheet '${sheetRawData}' không tồn tại.`);
    return {};
  }

  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    Logger.log('Dữ liệu không đủ để tạo ánh xạ.');
    return {};
  }

  // Xác định các cột cần thiết
  const headers = data[0];
  const adNameIndex = headers.indexOf(columnNeedToMapping); // Cột Ad Name
  const monIndex = headers.indexOf(columnProduct); // Cột Product

  if (adNameIndex === -1 || monIndex === -1) {
    Logger.log(`Không tìm thấy cột '${columnNeedToMapping}' hoặc '${columnProduct}'`);
    return {};
  }

  // Tạo ánh xạ từ các giá trị trong cùng hàng
  const adNameToMonAn = {};
  for (let i = 1; i < data.length; i++) {
    const adName = data[i][adNameIndex];
    const mon = data[i][monIndex];

    if (adName && mon) {
      adNameToMonAn[adName] = mon;
    }
  }

  return adNameToMonAn;
}

