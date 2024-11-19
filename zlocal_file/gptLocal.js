const axios = require("axios");
const { GPT_API, BASE_URL } = process.env;

// GPT Function
async function GPT(itemsArray) {
  // Construct Prompt
  const prompt = `
Given the following list of items:

${JSON.stringify(itemsArray)}
  
Group these items into categories. Predict appropriate category names based on the items, name of the category should be in Vietnamese, and return only the JSON-formatted string of the JavaScript object. Do not include any explanation or additional text.

The output should look like:

{
  "Category1": ["Item1", "Item2"],
  "Category2": ["Item3", "Item4"]
}
`;

  try {
    // Request payload
    const payload = {
      model: "gpt-4", // Use "gpt-3.5-turbo" if quota for GPT-4 is not available
      messages: [
        { role: "system", content: "You categorize items into groups and output JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0,
      max_tokens: 500,
    };

    // API call using axios
    const response = await axios.post(BASE_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GPT_API}`,
      },
    });

    // Log and return the AI's response
    const result = response.data.choices[0].message.content;
    console.log("Response from GPT:", result);
    return JSON.parse(result); // Convert JSON string to object
  } catch (error) {
    console.error("Error calling GPT API:", error.response?.data || error.message);
    return "ERROR";
  }
}

// Test GPT Function
(async () => {
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
  const result = await GPT(itemsArray);
  console.log("Categorized Items:", result);
})();
