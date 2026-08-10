import React, { useEffect, useState } from "react";

function App() {
  const [msg, setMsg] = useState("loading...");

  useEffect(() => {
    fetch("/api/greet")
      .then(r => r.json())
      .then(data => setMsg(data.message))
      .catch(err => setMsg("fetch failed"));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Bragboard - Frontend</h1>
      <p>Backend message: <strong>{msg}</strong></p>
    </div>
  );
}

export default App;