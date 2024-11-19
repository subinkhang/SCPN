function processRevenueData() {
  // Mở file Google Sheets và chọn sheet 'Doanh thu chi tiết'
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Doanh thu chi tiết');

  // Lấy tất cả dữ liệu từ sheet 'Doanh thu chi tiết'
  var data = sheet.getDataRange().getValues();

  // Chuyển đổi dữ liệu thành dạng DataFrame (dùng thư viện riêng nếu cần)
  var df = data.slice(1); // Bỏ qua hàng tiêu đề
  var headers = data[0];

  // Giữ lại tất cả các cột bao gồm 'Tên nguồn đơn hàng'
  // Không loại bỏ cột nào ở đây
  // var unwantedColumns = ['Loại sản phẩm', 'Quận/Huyện (giao hàng)', 'Tên nguồn đơn hàng'];
  // var indicesToRemove = unwantedColumns.map(function(column) {
  //   return headers.indexOf(column);
  // });

  // var keepIndices = headers.map((_, index) => index); // Giữ lại tất cả các cột
  // df = df.map(function(row) {
  //   return keepIndices.map(function(index) {
  //     return row[index];
  //   });
  // });

  // headers = headers; // Giữ lại tất cả các tiêu đề
  // Thay thế tên sản phẩm
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

  // Xử lý cột Tiền hàng
  var moneyIndex = headers.indexOf('Tiền hàng');
  df = df.map(function(row) {
    var moneyValue = row[moneyIndex];
    // Chuyển đổi giá trị thành số và thay thế dấu chấm
    if (typeof moneyValue === 'string') {
      row[moneyIndex] = parseInt(moneyValue.replace(/\./g, '')) || 0;
    } else if (typeof moneyValue === 'number') {
      row[moneyIndex] = moneyValue;
    } else {
      row[moneyIndex] = 0; // Nếu không phải số hoặc chuỗi, gán giá trị 0
    }
    return row;
  });

  // Thêm cột Doanh thu tính từ Tiền hàng và Phí giao hàng
  var deliveryFeeIndex = headers.indexOf('Phí giao hàng');
  if (deliveryFeeIndex === -1) {
    deliveryFeeIndex = headers.length; // Nếu không có cột 'Phí giao hàng', thêm cột mới
    headers.push('Phí giao hàng');
    df.forEach(function(row) {
      row.push(0); // Thêm giá trị mặc định cho cột mới
    });
  }

  var revenueIndex = headers.indexOf('Doanh thu');
  if (revenueIndex === -1) {
    revenueIndex = headers.length; // Nếu không có cột 'Doanh thu', thêm cột mới
    headers.push('Doanh thu');
    df.forEach(function(row) {
      row.push(0); // Thêm giá trị mặc định cho cột mới
    });
  }

  df = df.map(function(row) {
    var moneyValue = row[moneyIndex];
    var deliveryFee = row[deliveryFeeIndex];
    row[revenueIndex] = moneyValue + deliveryFee; // Tính Doanh thu
    return row;
  });

  // Groupby theo Ngày, Tên sản phẩm, và Tên nguồn đơn hàng
  var dateIndex = headers.indexOf('Ngày');
  var groupedData = {};

  df.forEach(function(row) {
    var key = row[dateIndex] + '_' + row[productIndex];
    var source = row[sourceIndex];
    var isWebsite = (source === 'Web');
    var isSocialMedia = (source === 'Facebook' || source === 'Instagram');

    if (isWebsite) {
      key = row[dateIndex] + '_Website'; // Đặt tất cả các đơn hàng từ 'Web' vào nhóm Website
    } else if (isSocialMedia) {
      // Nhóm cho các nguồn là Facebook hoặc Instagram
      if (!groupedData[key]) {
        groupedData[key] = row.slice();
      } else {
        groupedData[key][moneyIndex] += row[moneyIndex];
        groupedData[key][deliveryFeeIndex] += row[deliveryFeeIndex];
        groupedData[key][revenueIndex] = groupedData[key][moneyIndex] + groupedData[key][deliveryFeeIndex];
      }
    } else {
      // Xử lý cho các nguồn khác nếu cần
      if (!groupedData[key]) {
        groupedData[key] = row.slice();
      } else {
        groupedData[key][moneyIndex] += row[moneyIndex];
        groupedData[key][deliveryFeeIndex] += row[deliveryFeeIndex];
        groupedData[key][revenueIndex] = groupedData[key][moneyIndex] + groupedData[key][deliveryFeeIndex];
      }
    }

    // Đối với đơn hàng từ Web, tính tổng không phân theo sản phẩm
    if (isWebsite) {
      var webKey = row[dateIndex] + '_Website';
      if (!groupedData[webKey]) {
        groupedData[webKey] = row.slice();
        groupedData[webKey][productIndex] = 'Website'; // Đặt tên sản phẩm là Website
      } else {
        groupedData[webKey][moneyIndex] += row[moneyIndex];
        groupedData[webKey][deliveryFeeIndex] += row[deliveryFeeIndex];
        groupedData[webKey][revenueIndex] = groupedData[webKey][moneyIndex] + groupedData[webKey][deliveryFeeIndex];
      }
    }
  });

  df = Object.values(groupedData);

  // Cập nhật cột Category
  var categoryConditions = {
    'Combo': ['Gia Đình', 'Tình Yêu', 'Cô Đơn'],
    'M1T1': ['M1T1'],
    'Đồ ngâm tương': ['Tôm', 'Trứng', 'Cá Hồi'],
    'Khác': ['Khác'],
    'Shipping': ['Phí Ship'],
    'Website': ['Website'] // Thêm điều kiện cho Website
  };

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

  // Thêm tiêu đề cột Category
  headers.push('Category');

  // Giữ lại chỉ các cột cần thiết: Ngày, Tên sản phẩm, Tiền hàng, và Category
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

  // Mở hoặc tạo sheet 'Doanh thu_xử lý'
  var newSheet = spreadsheet.getSheetByName('Doanh thu_xử lý');
  if (!newSheet) {
    newSheet = spreadsheet.insertSheet('Doanh thu_xử lý');
  } else {
    newSheet.clear(); // Xóa dữ liệu cũ
  }

  // Cập nhật tiêu đề cột và dữ liệu vào sheet mới
  newSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  newSheet.getRange(2, 1, df.length, headers.length).setValues(df);

  // Tự động điều chỉnh kích thước cột
  newSheet.autoResizeColumns(1, headers.length);
}
