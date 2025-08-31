export default {
  async scheduled(event, env, ctx) {
    const apiUrlBase = "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=";
    const firebaseUrl = "https://web-admin-e297c-default-rtdb.asia-southeast1.firebasedatabase.app/results.json";

    function getTimestamps() {
      const now = new Date();
      const utcTime = now.toISOString();
      const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000).toISOString();
      return { utc: utcTime, ist: istTime };
    }

    async function fetchAndUpdate() {
      const apiUrl = apiUrlBase + Date.now();
      try {
        const response = await fetch(apiUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0",
            "Accept": "application/json"
          }
        });

        if (!response.ok) {
          console.error("❌ API Fetch Failed:", response.status);
          return false;
        }

        const data = await response.json();
        const results = data?.data?.list || [];

        if (results.length === 0) {
          console.log("⚠ No data found in API response");
          return false;
        }

        // Get existing data from Firebase
        const existingRes = await fetch(firebaseUrl);
        const existingData = await existingRes.json() || {};

        const updates = {};
        let newDataFound = false;

        for (const item of results) {
          const period = item.issueNumber;
          if (!existingData[period]) {
            newDataFound = true;
            const size = parseInt(item.number) <= 4 ? "Small" : "Big";
            const { utc, ist } = getTimestamps();
            updates[period] = {
              period,
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
          console.log("✅ Saved new data:", Object.keys(updates));
        }

        return newDataFound;
      } catch (err) {
        console.error("❌ Error in fetchAndUpdate:", err);
        return false;
      }
    }

    // Main logic: Retry every 4 sec for 40 sec (max 10 attempts)
    ctx.waitUntil((async () => {
      for (let attempt = 1; attempt <= 10; attempt++) {
        console.log(`⏳ Attempt ${attempt}`);
        const found = await fetchAndUpdate();
        if (found) {
          console.log("✅ New data found, stopping retries.");
          break;
        }
        if (attempt < 10) {
          await new Promise(res => setTimeout(res, 4000)); // wait 4 sec
        }
      }
    })());

    return new Response("Retry job started", { status: 200 });
  }
};
