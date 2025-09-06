export default {
  async scheduled(event, env, ctx) {
    const apiUrl = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=" + Date.now();
    const firebaseUrl = "https://web-admin-e297c-default-rtdb.asia-southeast1.firebasedatabase.app/results.json";

    try {
      // 1. Fetch API Data
      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        console.error("❌ API Fetch Failed:", response.status);
        return new Response("API Fetch Error", { status: response.status });
      }

      const data = await response.json();
      console.log("✅ API Response:", JSON.stringify(data));

      const results = data?.data?.list || [];
      console.log("✅ Total Results Fetched:", results.length);

      if (results.length === 0) {
        console.log("⚠ No data found in API response");
        return new Response("No data", { status: 200 });
      }

      // 2. Get existing results from Firebase
      const existingRes = await fetch(firebaseUrl);
      const existingData = await existingRes.json() || {};
      console.log("✅ Existing Firebase Entries:", Object.keys(existingData).length);

      // 3. Prepare new entries
      const updates = {};
      for (const item of results) {
        const period = item.issueNumber;
        if (!existingData[period]) { // Avoid duplicates
          const size = parseInt(item.number) <= 4 ? "Small" : "Big";

          updates[period] = {
            period,
            result: size,
            number: item.number,
            color: item.color
          };
        }
      }

      console.log("✅ New Entries to Add:", Object.keys(updates).length);

      // 4. Push new data to Firebase if available
      if (Object.keys(updates).length > 0) {
        const fbRes = await fetch(firebaseUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });

        const fbText = await fbRes.text();
        console.log("✅ Firebase Response:", fbText);
      } else {
        console.log("ℹ No new data to update.");
      }

      return new Response("Data synced successfully", { status: 200 });

    } catch (err) {
      console.error("❌ Error Occurred:", err);
      return new Response("Error: " + err.message, { status: 500 });
    }
  }
};
