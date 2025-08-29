export default {
  async scheduled(event, env, ctx) {
    const apiUrl = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=" + Date.now();

    try {
      // 1. Fetch API Data
      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      });
      const data = await response.json();
      const results = data.data.list; // Get full list

      // Firebase base URL
      const firebaseUrl = "https://web-admin-e297c-default-rtdb.asia-southeast1.firebasedatabase.app/results.json";

      // 2. Get existing results from Firebase
      const existingRes = await fetch(firebaseUrl);
      const existingData = await existingRes.json() || {};

      // 3. Prepare new entries
      const updates = {};
      for (const item of results) {
        const period = item.issueNumber;
        if (!existingData[period]) { // check duplicate
          const size = parseInt(item.number) <= 4 ? "Small" : "Big";

          updates[period] = {
            period: period,
            result: size,
            number: item.number,
            color: item.color
          };
        }
      }

      // 4. If there are new results, push them
      if (Object.keys(updates).length > 0) {
        await fetch(firebaseUrl, {
          method: "PATCH", // Merge with existing node
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
      }

      return new Response("Data synced successfully", { status: 200 });

    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
  }
};