function runAll() {
  // Xử lý dữ liệu doanh thu và nhận kết quả xử lý
  var processedRevenueData = processRevenueData()
  
  // Tạo báo cáo dựa trên dữ liệu doanh thu đã xử lý và dữ liệu chi tiêu
  generateReportData(processedRevenueData)
}

/**
 * Xử lý sheet 'Doanh thu chi tiết' và trả về dữ liệu đã xử lý.
 * @returns {Array<Array>} Dữ liệu đã được xử lý.
 */
function processRevenueData() {
  // Mở file Google Sheets và chọn sheet 'Doanh thu chi tiết'
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = spreadsheet.getSheetByName(sheetDTCT)

  if (!sheet) {
    Logger.log("Sheet 'Doanh thu chi tiết' không tồn tại.")
    return []
  }

  // Lấy tất cả dữ liệu từ sheet 'Doanh thu chi tiết'
  var data = sheet.getDataRange().getValues()

  if (data.length < 2) {
    Logger.log("Không có dữ liệu để xử lý trong 'Doanh thu chi tiết'.")
    return []
  }

  // Tách dữ liệu thành header và dữ liệu chính
  var df = data.slice(1) // Bỏ qua hàng tiêu đề
  var headers = data[0]

  // Đang thay thế phụ thuộc vào các Product trong sheet 'Raw Data'
  var productsDTCT = getAllProductsFromInputSheet(sheetDTCT, 'C')
  var productsRaw = getAllProductsFromInputSheet(sheetRawData, 'V')
  var replaceDict = generateReplaceDict(productsDTCT, productsRaw);

  // Tìm chỉ số của các cột cần thiết
  var productIndex = headers.indexOf('Tên sản phẩm')
  var sourceIndex = headers.indexOf('Tên nguồn đơn hàng')

  if (productIndex === -1 || sourceIndex === -1) {
    Logger.log("Cột 'Tên sản phẩm' hoặc 'Tên nguồn đơn hàng' không tồn tại.")
    return []
  }

  // Thay thế tên sản phẩm dựa trên replaceDict
  df = df.map(function(row) {
    var productName = row[productIndex]
    row[productIndex] = replaceDict[productName] || productName
    return row
  })

  // Xử lý cột 'Tiền hàng'
  var moneyIndex = headers.indexOf('Tiền hàng')
  if (moneyIndex === -1) {
    Logger.log("Cột 'Tiền hàng' không tồn tại.")
    return []
  }

  df = df.map(function(row) {
    var moneyValue = row[moneyIndex]
    // Chuyển đổi giá trị thành số và thay thế dấu chấm
    if (typeof moneyValue === 'string') {
      row[moneyIndex] = parseInt(moneyValue.replace(/\./g, '')) || 0
    } else if (typeof moneyValue === 'number') {
      row[moneyIndex] = moneyValue
    } else {
      row[moneyIndex] = 0 // Nếu không phải số hoặc chuỗi, gán giá trị 0
    }
    return row
  })

  // Thêm cột 'Phí giao hàng' nếu chưa có
  var deliveryFeeIndex = headers.indexOf('Phí giao hàng')
  if (deliveryFeeIndex === -1) {
    deliveryFeeIndex = headers.length // Thêm cột mới
    headers.push('Phí giao hàng')
    df.forEach(function(row) {
      row.push(0) // Thêm giá trị mặc định cho cột mới
    })
  }

  // Thêm cột 'Doanh thu' nếu chưa có
  var revenueIndex = headers.indexOf('Doanh thu')
  if (revenueIndex === -1) {
    revenueIndex = headers.length // Thêm cột mới
    headers.push('Doanh thu')
    df.forEach(function(row) {
      row.push(0) // Thêm giá trị mặc định cho cột mới
    })
  }

  // Tính 'Doanh thu' từ 'Tiền hàng' và 'Phí giao hàng'
  df = df.map(function(row) {
    var moneyValue = row[moneyIndex]
    var deliveryFee = row[deliveryFeeIndex]
    row[revenueIndex] = moneyValue + deliveryFee // Tính Doanh thu
    return row
  })

  // Group theo 'Ngày', 'Tên sản phẩm', và 'Tên nguồn đơn hàng'
  var dateIndex = headers.indexOf('Ngày')
  if (dateIndex === -1) {
    Logger.log("Cột 'Ngày' không tồn tại.")
    return []
  }

  var groupedData = {}

  df.forEach(function(row) {
    var key = row[dateIndex] + '_' + row[productIndex]
    var source = row[sourceIndex]
    var isWebsite = (source === 'Web')
    var isSocialMedia = (source === 'Facebook' || source === 'Instagram')

    if (isWebsite) {
      key = row[dateIndex] + '_Website' // Đặt tất cả đơn hàng từ 'Web' vào nhóm 'Website'
    }

    if (!groupedData[key]) {
      groupedData[key] = row.slice()
      if (isWebsite) {
        groupedData[key][productIndex] = 'Website' // Đặt tên sản phẩm là 'Website'
      }
    } else {
      groupedData[key][moneyIndex] += row[moneyIndex]
      groupedData[key][deliveryFeeIndex] += row[deliveryFeeIndex]
      groupedData[key][revenueIndex] = groupedData[key][moneyIndex] + groupedData[key][deliveryFeeIndex]
    }

    // Đối với đơn hàng từ Web, tính tổng không phân theo sản phẩm
    if (isWebsite) {
      var webKey = row[dateIndex] + '_Website'
      if (!groupedData[webKey]) {
        groupedData[webKey] = row.slice()
        groupedData[webKey][productIndex] = 'Website' // Đặt tên sản phẩm là 'Website'
      } else {
        groupedData[webKey][moneyIndex] += row[moneyIndex]
        groupedData[webKey][deliveryFeeIndex] += row[deliveryFeeIndex]
        groupedData[webKey][revenueIndex] = groupedData[webKey][moneyIndex] + groupedData[webKey][deliveryFeeIndex]
      }
    }
  })

  // Chuyển đổi groupedData thành mảng
  df = Object.values(groupedData)

  // Cập nhật cột 'Category' dựa trên điều kiện
  var categoryConditions = {
    'Combo': ['Gia Đình', 'Tình Yêu', 'Cô Đơn'],
    'M1T1': ['M1T1'],
    'Đồ ngâm tương': ['Tôm', 'Trứng', 'Cá Hồi'],
    'Khác': ['Khác'],
    'Shipping': ['Phí Ship'],
    'Website': ['Website'] // Thêm điều kiện cho 'Website'
  }

  df.forEach(function(row) {
    var productName = row[productIndex]
    var category = 'Unknown'
    for (var categoryKey in categoryConditions) {
      if (categoryConditions[categoryKey].includes(productName)) {
        category = categoryKey
        break
      }
    }
    row.push(category)
  })

  // Thêm tiêu đề cột 'Category'
  headers.push('Category')

  // Giữ lại chỉ các cột cần thiết: 'Ngày', 'Tên sản phẩm', 'Tiền hàng', và 'Category'
  var requiredHeaders = ['Ngày', 'Tên sản phẩm', 'Tiền hàng', 'Category']
  var indicesToKeep = requiredHeaders.map(function(header) {
    return headers.indexOf(header)
  })

  df = df.map(function(row) {
    return indicesToKeep.map(function(index) {
      return row[index]
    })
  })

  headers = requiredHeaders

  // Trả về dữ liệu đã xử lý và các headers
  return {
    headers: headers,
    data: df
  }
}

/**
 * Tạo sheet 'Report Data Hehe' dựa trên dữ liệu doanh thu đã xử lý và 'Raw Data'.
 * @param {Object} processedRevenueData - Dữ liệu doanh thu đã được xử lý.
 */
function generateReportData(processedRevenueData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const rawDataSheet = ss.getSheetByName('Raw Data')

  if (!rawDataSheet) {
    Logger.log("Sheet 'Raw Data' không tồn tại.")
    return
  }

  if (!processedRevenueData || processedRevenueData.data.length === 0) {
    Logger.log("Không có dữ liệu doanh thu để xử lý.")
    return
  }

  // Mở hoặc tạo sheet 'Report Data Hehe'
  const reportDataSheet = ss.getSheetByName('Report Data Hehe') || ss.insertSheet('Report Data Hehe')
  reportDataSheet.clear() // Xóa dữ liệu cũ trước khi thêm mới

  // Định nghĩa các danh mục và món tương ứng
  const categories = {
    'Combo': ['Gia Đình', 'Tình Yêu', 'Cô Đơn'],
    'M1T1': ['M1T1'],
    'Shipping': ['Phí Ship'],
    'Đồ ngâm tương': ['Tôm', 'Trứng', 'Cá Hồi'],
    'Khác': ['Khác'],
    'Website': ['Website']
  }

  // Định nghĩa ánh xạ giữa Ad Name và Món ăn
  const adNameToMonAn = {
    'HN_Conversion_Album_Combo gia đình': 'Gia Đình',
    'HN_Sales_Reels_Combo Hanji': 'Cô Đơn',
    'HN_Sales_Album_Combo 359K': 'Tình Yêu',
    'HN_Mess_Album_M1T1_Combo 188K': 'Cô Đơn',
    'FB_Mess_HN_AP_Album_APr_CB GĐình T12': 'Gia Đình',
    'HN_Mess_Album_Combo Gia Đình': 'Gia Đình',
    'HN_Sales_Reels_NDA': 'Cô Đơn',
    'FB_Mess_HN_AP_Single Video_APr_Mukkbang 1': 'Tình Yêu',
    'HN_Sales_Reels_Eat': 'Tình Yêu',
    'HN_Conversion_Reels_Hanji': 'Cô Đơn',
    'HN_Conversion_Reels_Cocovie': 'Gia Đình',
    'HN_Sales_Reels_Cocovie': 'Gia Đình',
    'HN_Sales_Reels_Hanji': 'Cô Đơn',
    'HN_RV_Reels_KOC Hanji': 'Cô Đơn',
    'HN_Mess_Album_M1T1_Cũ': 'M1T1',
    'FB_Reach_HN_AP_Album_APr_M1T1 T12': 'M1T1',
    'HN_Mess_Reels_2/8': 'Cá Hồi',
    'HN_Conversion_Reels_2/8': 'Cá Hồi',
    'HN_Conversion_Reels_6/8': 'Tình Yêu',
    'HN_Mess_Reels_Combo Gia Đình': 'Gia Đình',
    'HN_Mess_Reels_Combo Tình Yêu': 'Tình Yêu',
    'FB_Reach_HN_AP_Reels_APr_Combo cô đơn': 'Cô Đơn',
    'FB_Reach_HN_AP_Reels_APr_Combo gia đình': 'Gia Đình',
    'FB_Reach_HN_AP_Reels_APr': 'Tình Yêu',
    'FB_Mess_HN_AP_Album_APr_Combo gia đình': 'Gia Đình',
    'FB_Reach_HN_AP_Album_APr_Combo tình yêu': 'Tình Yêu',
    'HN_Mess_Album_Combo Tình Yêu': 'Tình Yêu',
    'FB_Mess_HN_AP_Album_APr_Website': 'Website',
    'FB_Mess_HN_AP_Album_APr_Feedback': 'Gia Đình'
    // Thêm các ánh xạ nếu cần
  }

  // Lấy dữ liệu từ sheet 'Raw Data'
  const rawData = rawDataSheet.getDataRange().getValues()

  if (rawData.length < 2) {
    Logger.log("Không có dữ liệu để xử lý trong 'Raw Data'.")
    return
  }

  // Tách header và dữ liệu chính từ processedRevenueData
  const revenueHeaders = processedRevenueData.headers
  const revenueData = processedRevenueData.data

  // Tạo bản đồ (map) để dễ dàng truy cập dữ liệu doanh thu
  const doanhThuMap = {}

  revenueData.forEach(function(row) {
    const [ngay, tenSanPham, tienHang, category] = row
    const dateString = formatDate(ngay)
    if (!doanhThuMap[dateString]) {
      doanhThuMap[dateString] = {}
    }
    if (!doanhThuMap[dateString][category]) {
      doanhThuMap[dateString][category] = {}
    }
    if (!doanhThuMap[dateString][category][tenSanPham]) {
      doanhThuMap[dateString][category][tenSanPham] = 0
    }
    doanhThuMap[dateString][category][tenSanPham] += parseFloat(tienHang.toString().replace(/\./g, '').replace(/,/g, '.'))
  })

  // Tạo bản đồ (map) để lưu trữ dữ liệu chi tiêu
  const amountSpentMap = {}

  rawData.forEach(function(row) {
    // Bỏ qua hàng tiêu đề
    if (row[0] === 'day' || row[0] === 'Ngày') return

    const [
      day,
      , // Bỏ qua các cột không cần thiết
      ,
      ,
      ,
      adName,
      amountSpent,
      impressions,
      messagingConversationsStarted,
      postComments,
      clicksAll,
      threeSecondVideoViews,
      thruPlays,
      onFacebookPurchases
    ] = row

    const dateString = formatDate(day)
    const adNameLower = adName.toLowerCase()
    let monAn = adNameToMonAn[adName]

    if (!monAn) {
      // Cơ chế dự phòng để khớp từ khóa nếu không tìm thấy trong adNameToMonAn
      if (adNameLower.includes('gia đình')) {
        monAn = 'Gia Đình'
      } else if (adNameLower.includes('tình yêu')) {
        monAn = 'Tình Yêu'
      } else if (adNameLower.includes('cô đơn')) {
        monAn = 'Cô Đơn'
      } else if (adNameLower.includes('m1t1')) {
        monAn = 'M1T1'
      } else if (adNameLower.includes('tôm')) {
        monAn = 'Tôm'
      } else if (adNameLower.includes('trứng')) {
        monAn = 'Trứng'
      } else if (adNameLower.includes('cá hồi')) {
        monAn = 'Cá Hồi'
      } else if (adNameLower.includes('website')) {
        monAn = 'Website'
      }
    }

    if (monAn) {
      if (!amountSpentMap[dateString]) {
        amountSpentMap[dateString] = {}
      }
      if (!amountSpentMap[dateString][monAn]) {
        amountSpentMap[dateString][monAn] = {
          amountSpent: 0,
          impressions: 0,
          messagingConversationsStarted: 0,
          postComments: 0,
          clicksAll: 0,
          threeSecondVideoViews: 0,
          thruPlays: 0,
          onFacebookPurchases: 0
        }
      }
      const stats = amountSpentMap[dateString][monAn]
      stats.amountSpent += parseValue(amountSpent)
      stats.impressions += parseValue(impressions)
      stats.messagingConversationsStarted += parseValue(messagingConversationsStarted)
      stats.postComments += parseValue(postComments)
      stats.clicksAll += parseValue(clicksAll)
      stats.threeSecondVideoViews += parseValue(threeSecondVideoViews)
      stats.thruPlays += parseValue(thruPlays)
      stats.onFacebookPurchases += parseValue(onFacebookPurchases)
    }
  })

  // Đặt tiêu đề cho sheet 'Report Data Hehe'
  reportDataSheet.appendRow([
    'Ngày',
    'Category',
    'Món',
    'Doanh Thu',
    'Amount Spent',
    'Impressions',
    'Messaging Conversations Started',
    'Post Comments',
    'Clicks (All)',
    '3-Second Video Views',
    'ThruPlays',
    'On-Facebook Purchases'
  ])

  // Lặp qua doanhThuMap để điền dữ liệu vào sheet 'Report Data Hehe'
  for (let date in doanhThuMap) {
    for (let category in categories) {
      const monList = categories[category]
      monList.forEach(function(mon) {
        const doanhThu =
          doanhThuMap[date][category] && doanhThuMap[date][category][mon]
            ? doanhThuMap[date][category][mon]
            : 0
        const stats =
          amountSpentMap[date] && amountSpentMap[date][mon]
            ? amountSpentMap[date][mon]
            : {
                amountSpent: 0,
                impressions: 0,
                messagingConversationsStarted: 0,
                postComments: 0,
                clicksAll: 0,
                threeSecondVideoViews: 0,
                thruPlays: 0,
                onFacebookPurchases: 0
              }
        reportDataSheet.appendRow([
          date,
          category,
          mon,
          doanhThu,
          stats.amountSpent,
          stats.impressions,
          stats.messagingConversationsStarted,
          stats.postComments,
          stats.clicksAll,
          stats.threeSecondVideoViews,
          stats.thruPlays,
          stats.onFacebookPurchases
        ])
      })
    }
  }

  // Tự động điều chỉnh kích thước cột
  reportDataSheet.autoResizeColumns(1, 12)
}

// Gọi hàm chính để chạy toàn bộ quy trình
// runAll()
  