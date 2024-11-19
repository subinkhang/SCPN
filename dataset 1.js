function generateReportData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rawDataSheet = ss.getSheetByName('Raw Data');
  const doanhThuSheet = ss.getSheetByName('Doanh thu_xử lý');

  const reportDataSheet = ss.getSheetByName('Report Data') || ss.insertSheet('Report Data');
  reportDataSheet.clear(); // Clear the sheet before populating new data

  // Define categories and corresponding món
  const categories = {
    'Combo': ['Gia Đình', 'Tình Yêu', 'Cô Đơn'],
    'M1T1': ['M1T1'],
    'Shipping': ['Phí Ship'],
    'Đồ ngâm tương': ['Tôm', 'Trứng', 'Cá Hồi'],
    'Khác': ['Khác'],
    'Website': ['Website']
  };

  // Define the mapping between Ad Name and Món ăn
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
    'FB_Mess_HN_AP_Album_APr_Feedback': 'Gia Đình',
    // Add more mappings if needed
  };

  // Get data from Doanh thu_xử lý
  const doanhThuData = doanhThuSheet.getDataRange().getValues();
  // Get data from Raw Data
  const rawData = rawDataSheet.getDataRange().getValues();

  // Create a map for easier data access
  const doanhThuMap = {};

  doanhThuData.forEach((row, index) => {
    if (index === 0) return; // Skip header row
    const [ngay, tenSanPham, tienHang, category] = row;
    const dateString = formatDate(ngay);
    if (!doanhThuMap[dateString]) {
      doanhThuMap[dateString] = {};
    }
    if (!doanhThuMap[dateString][category]) {
      doanhThuMap[dateString][category] = {};
    }
    if (!doanhThuMap[dateString][category][tenSanPham]) {
      doanhThuMap[dateString][category][tenSanPham] = 0;
    }
    doanhThuMap[dateString][category][tenSanPham] += parseFloat(tienHang.toString().replace(/\./g, '').replace(/,/g, '.'));
  });

  // Create a map for Amount Spent data
  const amountSpentMap = {};

  rawData.forEach((row, index) => {
    if (index === 0) return; // Skip header row
    const [day, , , , , adName, amountSpent, impressions, messagingConversationsStarted, postComments, clicksAll, threeSecondVideoViews, thruPlays, onFacebookPurchases] = row;
    const dateString = formatDate(day);
    const adNameLower = adName.toLowerCase();
    let monAn = adNameToMonAn[adName];

    if (!monAn) {
      // Fallback mechanism to match keywords
      if (adNameLower.includes('gia đình')) {
        monAn = 'Gia Đình';
      } else if (adNameLower.includes('tình yêu')) {
        monAn = 'Tình Yêu';
      } else if (adNameLower.includes('cô đơn')) {
        monAn = 'Cô Đơn';
      } else if (adNameLower.includes('m1t1')) {
        monAn = 'M1T1';
      } else if (adNameLower.includes('tôm')) {
        monAn = 'Tôm';
      } else if (adNameLower.includes('trứng')) {
        monAn = 'Trứng';
      } else if (adNameLower.includes('cá hồi')) {
        monAn = 'Cá Hồi';
      } else if (adNameLower.includes('website')) {
        monAn = 'Website';
      }
    }

    if (monAn) {
      if (!amountSpentMap[dateString]) {
        amountSpentMap[dateString] = {};
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
          onFacebookPurchases: 0,
        };
      }
      const stats = amountSpentMap[dateString][monAn];
      stats.amountSpent += parseValue(amountSpent);
      stats.impressions += parseValue(impressions);
      stats.messagingConversationsStarted += parseValue(messagingConversationsStarted);
      stats.postComments += parseValue(postComments);
      stats.clicksAll += parseValue(clicksAll);
      stats.threeSecondVideoViews += parseValue(threeSecondVideoViews);
      stats.thruPlays += parseValue(thruPlays);
      stats.onFacebookPurchases += parseValue(onFacebookPurchases);
    }
  });

  // Set header for Report Data
  reportDataSheet.appendRow(['Ngày', 'Category', 'Món', 'Doanh Thu', 'Amount Spent', 'Impressions', 'Messaging Conversations Started', 'Post Comments', 'Clicks (All)', '3-Second Video Views', 'ThruPlays', 'On-Facebook Purchases']);

  // Iterate over the doanhThuMap to fill the Report Data
  for (let date in doanhThuMap) {
    for (let category in categories) {
      const monList = categories[category];
      monList.forEach(mon => {
        const doanhThu = doanhThuMap[date][category] && doanhThuMap[date][category][mon] ? doanhThuMap[date][category][mon] : 0;
        const stats = amountSpentMap[date] && amountSpentMap[date][mon] ? amountSpentMap[date][mon] : {
          amountSpent: 0,
          impressions: 0,
          messagingConversationsStarted: 0,
          postComments: 0,
          clicksAll: 0,
          threeSecondVideoViews: 0,
          thruPlays: 0,
          onFacebookPurchases: 0,
        };
        reportDataSheet.appendRow([date, category, mon, doanhThu, stats.amountSpent, stats.impressions, stats.messagingConversationsStarted, stats.postComments, stats.clicksAll, stats.threeSecondVideoViews, stats.thruPlays, stats.onFacebookPurchases]);
      });
    }
  }
}

// Helper function to format date as dd/mm/yyyy
function formatDate(date) {
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

// Helper function to parse numeric values
function parseValue(value) {
  return parseFloat(value.toString().replace(/\./g, '').replace(/,/g, '.')) || 0;
}
