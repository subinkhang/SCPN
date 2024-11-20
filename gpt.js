// const { GPT_API, BASE_URL } = process.env;
const GPT_API = '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'
const BASE_URL = 'https://api.openai.com/v1/chat/completions'

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${GPT_API}`,
};

function GPT_chatSheet(Input) {
  const options = {
    method: "POST",
    muteHttpExceptions: true,
    headers: headers,
    payload: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a very sassy internet troll and hate helping people!",
        },
        {
          role: "user",
          content: Input,
        },
      ],
      temperature: 0.5,
    }),
  };

  try {
    const response = UrlFetchApp.fetch(BASE_URL, options);
    const json = JSON.parse(response.getContentText());
    console.log(json);
    console.log(json.choices[0].message.content);
    return json.choices[0].message.content;
  } catch (error) {
    console.error(`Error: ${error}`);
    return "ERROR";
  }
}

function GPT_categorize(itemsArray) {
  const prompt = `
Given the following list of items:

${JSON.stringify(itemsArray)}

Group these items into categories. Predict appropriate category names based on the items, and return a JavaScript object where each key is a category name and each value is an array of items belonging to that category.

The output should be a valid JavaScript object, like:

{
  'Category1': ['Item1', 'Item2'],
  'Category2': ['Item3', 'Item4'],
  // ...
}
`;

  const options = {
    method: "POST",
    muteHttpExceptions: true,
    headers: headers,
    payload: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an assistant that organizes items into categories.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0,
      max_tokens: 500,
    }),
  };

  try {
    const response = UrlFetchApp.fetch(BASE_URL, options);
    const json = JSON.parse(response.getContentText());
    const assistantResponse = json.choices[0].message.content;
    const categoryConditions = eval("(" + assistantResponse + ")");
    return categoryConditions;
  } catch (error) {
    console.error(`Error: ${error}`);
    return "ERROR";
  }
}

function testGPT() {
  const itemsArray = [
    "Gia Đình",
    "Tình Yêu",
    "Cô Đơn",
    "M1T1",
    "Tôm",
    "Trứng",
    "Cá Hồi",
    "Khác",
    "Phí Ship",
    "Website",
  ];

  const result = GPT_categorize(itemsArray);
  Logger.log(result);

  /*
    Kỳ vọng đầu ra (ví dụ):
    {
      'Combo': ['Gia Đình', 'Tình Yêu', 'Cô Đơn'],
      'M1T1': ['M1T1'],
      'Đồ ngâm tương': ['Tôm', 'Trứng', 'Cá Hồi'],
      'Khác': ['Khác'],
      'Shipping': ['Phí Ship'],
      'Website': ['Website']
    }
  */
}