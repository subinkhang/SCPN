function processRevenueData() {
    // Open the spreadsheet and select the 'Doanh thu chi tiết' sheet
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = spreadsheet.getSheetByName('doanh_thu_chi_tiet');
  
    // Get all data from the sheet
    var data = sheet.getDataRange().getValues();
  
    // Convert data to DataFrame format (skip the header row)
    var df = data.slice(1);
    var headers = data[0];
  
    // Replace product names
    var replaceDict = {
      'Combo Gia Đình': 'Gia Đình',
      'Combo Tình Yêu': 'Tình Yêu',
      'Combo Cô Đơn': 'Cô Đơn',
      'Mua 01 Tặng 01': 'M1T1',
      'Phí ship': 'Phí Ship',
      'Phụ thu gửi bến xe': 'Phí Ship',
      'Ship đồng giá 10k': 'Phí Ship',
      'Cơm trắng': 'Khác',
      'Gừng hồng': 'Khác',
      'Set rong biển khô ăn kèm': 'Khác',
      'Kim chi Hàn Quốc': 'Khác',
      'Salad rong biển': 'Khác',
      'Trứng cua': 'Khác',
      'NOW CÁ TO + TÔM TO': 'Khác',
      'NOW CÁ TO + TRỨNG TO': 'Khác',
      'Phụ thu': 'Khác',
      'Tôm ngâm tương hũ lớn 250gr': 'Tôm',
      'Tôm ngâm tương hũ nhỏ 150gr': 'Tôm',
      'Trứng ngâm tương hũ lớn': 'Trứng',
      'Trứng ngâm tương hũ nhỏ': 'Trứng',
      'Cá hồi ngâm tương hũ lớn 250gr': 'Cá Hồi',
      'Cá hồi ngâm tương hũ nhỏ 150gr': 'Cá Hồi'
    };
  
    var productIndex = headers.indexOf('Tên sản phẩm');
    var sourceIndex = headers.indexOf('Tên nguồn đơn hàng');
    df = df.map(function(row) {
      var productName = row[productIndex];
      row[productIndex] = replaceDict[productName] || productName;
      return row;
    });
  
    // Collect unique product names for GPT
    var productNamesSet = new Set();
    df.forEach(function(row) {
      var productName = row[productIndex];
      productNamesSet.add(productName);
    });
    var productNamesArray = Array.from(productNamesSet);
  
    // Generate categoryConditions using GPT
    var categoryConditions = GPT_categorize(productNamesArray);
  
    // Log the generated categoryConditions
    Logger.log('Generated categoryConditions:');
    Logger.log(JSON.stringify(categoryConditions, null, 2));
  
    // Process the 'Tiền hàng' column
    var moneyIndex = headers.indexOf('Tiền hàng');
    df = df.map(function(row) {
      var moneyValue = row[moneyIndex];
      if (typeof moneyValue === 'string') {
        row[moneyIndex] = parseInt(moneyValue.replace(/\./g, '')) || 0;
      } else if (typeof moneyValue === 'number') {
        row[moneyIndex] = moneyValue;
      } else {
        row[moneyIndex] = 0;
      }
      return row;
    });
  
    // Add 'Doanh thu' column
    var deliveryFeeIndex = headers.indexOf('Phí giao hàng');
    if (deliveryFeeIndex === -1) {
      deliveryFeeIndex = headers.length;
      headers.push('Phí giao hàng');
      df.forEach(function(row) {
        row.push(0);
      });
    }
  
    var revenueIndex = headers.indexOf('Doanh thu');
    if (revenueIndex === -1) {
      revenueIndex = headers.length;
      headers.push('Doanh thu');
      df.forEach(function(row) {
        row.push(0);
      });
    }
  
    df = df.map(function(row) {
      var moneyValue = row[moneyIndex];
      var deliveryFee = row[deliveryFeeIndex];
      row[revenueIndex] = moneyValue + deliveryFee;
      return row;
    });
  
    // Group data
    var dateIndex = headers.indexOf('Ngày');
    var groupedData = {};
  
    df.forEach(function(row) {
      var key = row[dateIndex] + '_' + row[productIndex];
      var source = row[sourceIndex];
      var isWebsite = (source === 'Web');
      var isSocialMedia = (source === 'Facebook' || source === 'Instagram');
  
      if (isWebsite) {
        key = row[dateIndex] + '_Website';
      }
  
      if (!groupedData[key]) {
        groupedData[key] = row.slice();
      } else {
        groupedData[key][moneyIndex] += row[moneyIndex];
        groupedData[key][deliveryFeeIndex] += row[deliveryFeeIndex];
        groupedData[key][revenueIndex] = groupedData[key][moneyIndex] + groupedData[key][deliveryFeeIndex];
      }
  
      if (isWebsite) {
        var webKey = row[dateIndex] + '_Website';
        if (!groupedData[webKey]) {
          groupedData[webKey] = row.slice();
          groupedData[webKey][productIndex] = 'Website';
        } else {
          groupedData[webKey][moneyIndex] += row[moneyIndex];
          groupedData[webKey][deliveryFeeIndex] += row[deliveryFeeIndex];
          groupedData[webKey][revenueIndex] = groupedData[webKey][moneyIndex] + groupedData[webKey][deliveryFeeIndex];
        }
      }
    });
  
    df = Object.values(groupedData);
  
    // Update 'Category' column based on dynamic categoryConditions
    df.forEach(function(row) {
      var productName = row[productIndex];
      var category = 'Unknown';
      for (var categoryKey in categoryConditions) {
        if (categoryConditions[categoryKey].includes(productName)) {
          category = categoryKey;
          break;
        }
      }
      row.push(category);
    });
  
    // Add 'Category' to headers
    headers.push('Category');
  
    // Keep only required columns
    var requiredHeaders = ['Ngày', 'Tên sản phẩm', 'Tiền hàng', 'Category'];
    var indicesToKeep = requiredHeaders.map(function(header) {
      return headers.indexOf(header);
    });
  
    df = df.map(function(row) {
      return indicesToKeep.map(function(index) {
        return row[index];
      });
    });
  
    headers = requiredHeaders;
  
    // Update or create the 'Doanh thu_xử lý' sheet
    var newSheet = spreadsheet.getSheetByName('doanh_thu_xu_ly');
    if (!newSheet) {
      newSheet = spreadsheet.insertSheet('doanh_thu_xu_ly');
    } else {
      newSheet.clear();
    }
  
    // Write headers and data to the new sheet
    newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    newSheet.getRange(2, 1, df.length, headers.length).setValues(df);
  
    // Auto-resize columns
    newSheet.autoResizeColumns(1, headers.length);
  }
  