let orders = [];

// helper לקריאת body
function getBody(req) {
  return new Promise((resolve) => {
    let data = "";

    req.on("data", chunk => (data += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

// אזורים
function getZone(city) {
  const north = ["קריית שמונה", "צפת", "טבריה", "קצרין"];
  const center = ["חדרה", "נתניה", "תל אביב", "פתח תקווה", "ראשון לציון", "חולון"];
  const south = ["אשדוד", "אשקלון", "באר שבע", "ערד", "דימונה"];

  if (north.includes(city)) return "north";
  if (center.includes(city)) return "center";
  if (south.includes(city)) return "south";

  return "unknown";
}

module.exports = async (req, res) => {
  const method = req.method;
  const url = req.url.split("?")[0];

  res.setHeader("Content-Type", "application/json");

  // בדיקה
  if (method === "GET" && url === "/") {
    return res.end(JSON.stringify({
      system: "GADA Smart Distribution",
      status: "running"
    }));
  }

  // יצירת הזמנה
  if (method === "POST" && url === "/orders") {
    const body = await getBody(req);

    const order = {
      id: Date.now(),
      chain: body.chain,
      branch: body.branch,
      city: body.city,
      address: body.address,
      notes: body.notes || "",
      status: "new",
      pallets: 0,
      zone: getZone(body.city),
      createdAt: new Date().toISOString()
    };

    orders.push(order);

    return res.end(JSON.stringify(order));
  }

  // קבלת הזמנות
  if (method === "GET" && url === "/orders") {
    return res.end(JSON.stringify(orders));
  }

  // עדכון הזמנה
  if (method === "PATCH" && url.startsWith("/orders/")) {
    const id = url.split("/")[2];
    const body = await getBody(req);

    const order = orders.find(o => String(o.id) === String(id));

    if (!order) {
      return res.end(JSON.stringify({ error: "not found" }));
    }

    if (body.status) order.status = body.status;
    if (body.pallets !== undefined) order.pallets = body.pallets;

    return res.end(JSON.stringify(order));
  }

  // דשבורד מנהל
  if (method === "GET" && url === "/dashboard") {
    return res.end(JSON.stringify({
      total: orders.length,
      new: orders.filter(o => o.status === "new").length,
      picking: orders.filter(o => o.status === "picking").length,
      ready: orders.filter(o => o.status === "ready").length,
      shipped: orders.filter(o => o.status === "shipped").length,
      palletsTotal: orders.reduce((a, b) => a + (b.pallets || 0), 0),
      truckCapacity: 10
    }));
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: "not found" }));
};
