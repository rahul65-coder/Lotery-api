export default {
  async fetch(request, env, ctx) {
    const apiUrl = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=" + Date.now();
    const firebaseUrl = "https://web-admin-e297c-default-rtdb.asia-southeast1.firebasedatabase.app/results.json";

    try {
      // Fetch data from API
      const response = await fetch(apiUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        return new Response(`API Fetch Error: ${response.status}`, { status: 500 });
      }

      const data = await response.json();
      const results = data?.data?.list || [];

      if (results.length === 0) {
        return new Response("No data from API", { status: 200 });
      }

      // Get existing Firebase data
      const existingRes = await fetch(firebaseUrl);
      const existingData = await existingRes.json() || {};

      const updates = {};
      const now = new Date();
      const utc = now.toISOString();
      const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000)).toISOString();

      for (const item of results) {
        const period = item.issueNumber;
        if (!existingData[period]) { // Avoid duplicate
          const size = parseInt(item.number) <= 4 ? "Small" : "Big";

          updates[period] = {
            period: period,
            result: size,
            number: item.number,
            color: item.color,
            savedAtUTC: utc,
            savedAtIST: ist
          };
        }
      }

      if (Object.keys(updates).length > 0) {
        await fetch(firebaseUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates)
        });
      }

      return new Response(`✅ Synced ${Object.keys(updates).length} new entries`, { status: 200 });

    } catch (err) {
      return new Response("Error: " + err.message, { status: 500 });
    }
  }
};
