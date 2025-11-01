const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export interface KBDoc {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt: number;
  updatedAt?: number;
}

export async function listDocs(): Promise<KBDoc[]> {
  const res = await fetch(`${API_BASE_URL}/api/kb/docs`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

export async function addDoc(title: string, content: string, tags?: string[]): Promise<KBDoc> {
  const res = await fetch(`${API_BASE_URL}/api/kb/docs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, tags }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function updateDoc(id: string, updates: { title?: string; content?: string; tags?: string[] }): Promise<KBDoc> {
  const res = await fetch(`${API_BASE_URL}/api/kb/docs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getDoc(id: string): Promise<KBDoc> {
  const res = await fetch(`${API_BASE_URL}/api/kb/docs/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function deleteDoc(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/kb/docs/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function searchDocs(q: string): Promise<Array<{ id: string; title: string; snippet: string }>> {
  const url = new URL(`${API_BASE_URL}/api/kb/search`);
  url.searchParams.set("q", q);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data || [];
}


