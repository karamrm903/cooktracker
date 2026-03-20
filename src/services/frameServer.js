const FRAME_SERVER_URL = "http://192.168.100.41:3001";

export async function fetchFramesFromServer(url) {
  const res = await fetch(`${FRAME_SERVER_URL}/frames`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
  });

  if (!res.ok) {
    throw new Error(`Frame server error ${res.status}`);
  }

  return res.json();
}
