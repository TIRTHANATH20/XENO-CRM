const CRM_URL = process.env.NEXT_PUBLIC_CRM_API_URL || "http://localhost:8001";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "";
const CRM_READ_TIMEOUT_MS = 2000;
const CRM_ACTION_TIMEOUT_MS = 12000;

async function timeoutFetch(input: RequestInfo, init: RequestInit = {}, timeoutMs = CRM_READ_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

async function crmFetch<T>(path: string): Promise<T> {
  const res = await timeoutFetch(`${CRM_URL}${path}`);
  if (!res.ok) throw new Error(`CRM API error: ${res.status}`);
  return res.json();
}

async function crmActionFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await timeoutFetch(`${CRM_URL}${path}`, init, CRM_ACTION_TIMEOUT_MS);
  if (!res.ok) {
    const text = await res.text();
    try {
      const payload = JSON.parse(text);
      throw new Error(payload.detail || payload.message || `CRM API error: ${res.status}`);
    } catch {
      throw new Error(text || `CRM API error: ${res.status}`);
    }
  }
  return res.json();
}

export interface DashboardStats {
  total_customers: number;
  total_orders: number;
  total_revenue: number;
  active_campaigns: number;
  total_communications: number;
  delivery_rate: number;
  open_rate: number;
  click_rate: number;
  conversion_rate: number;
}

export interface Segment {
  id: number;
  name: string;
  description: string;
  customer_count: number;
  filter_criteria?: Record<string, any>;
  is_ai_generated: boolean;
  created_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  segment_id: number | null;
  message_template: string;
  channel: string;
  status: string;
  sent_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  converted_count: number;
  failed_count: number;
  created_at: string;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  city: string;
  country: string;
  preferred_channel: string;
  total_spent?: number;
  order_count?: number;
  last_order_date?: string;
  tags?: string[];
}

export interface ChatResponse {
  response: string;
  agent: string;
  thread_id: string;
  agents_available: string[];
  new_segment?: { name: string; description?: string; customer_count?: number; filter_criteria?: Record<string, any> };
}

export type ChatContext = {
  stats?: DashboardStats | null;
  segments?: Segment[];
  campaigns?: Campaign[];
  messages?: { role: "user" | "assistant"; content: string }[];
};

export type CampaignCreateRequest = {
  name: string;
  segment_id: number;
  message_template: string;
  channel: string;
  status?: string;
};

export const api = {
  getDashboard: () => crmFetch<DashboardStats>("/api/analytics/dashboard"),
  getSegments: () => crmFetch<Segment[]>("/api/segments"),
  getCampaigns: () => crmFetch<Campaign[]>('/api/campaigns'),
  getSegmentCustomers: (segmentId: number) =>
    crmFetch<Customer[]>(`/api/segments/${segmentId}/customers`),
  getCustomers: () => crmFetch<Customer[]>("/api/customers"),
  createCampaign: (payload: CampaignCreateRequest) =>
    crmActionFetch<Campaign>(`/api/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteCampaign: (id: number) =>
    crmActionFetch<Record<string, unknown>>(`/api/campaigns/${id}`, { method: "DELETE" }),
  createSegment: (payload: { name: string; description?: string; customer_count?: number; filter_criteria?: Record<string, any> }) =>
    crmActionFetch<Segment>(`/api/segments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  deleteSegment: (id: number) =>
    crmActionFetch<Record<string, unknown>>(`/api/segments/${id}`, { method: "DELETE" }),
  addCustomerToSegment: (segmentId: number, customerId: number) =>
    crmActionFetch<Segment>(`/api/segments/${segmentId}/add_customer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customerId }),
    }),
  updateSegment: (id: number, payload: { name?: string; description?: string }) =>
    crmActionFetch<Segment>(`/api/segments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getCampaignPerformance: (id: number) =>
    crmFetch<Record<string, unknown>>(`/api/campaigns/${id}/performance`),
  sendCampaign: async (id: number) => {
    const res = await fetch(`${CRM_URL}/api/campaigns/${id}/send`, { method: "POST" });
    if (!res.ok) throw new Error(`Send failed: ${res.status}`);
    return res.json();
  },
  chat: async (message: string, threadId: string, context?: ChatContext): Promise<ChatResponse> => {
    const url = APP_URL ? `${APP_URL}/api/chat` : "/api/chat";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, thread_id: threadId, context }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `Agent error: ${res.status}`);
    }
    return res.json();
  },
  getAgents: async () => {
    return {
      supervisor: { label: "Supervisor", focus: "Routes requests to the right specialist." },
      content: { label: "Content", focus: "Writes and polishes campaign copy." },
      segmentation: { label: "Segmentation", focus: "Shapes audience targeting." },
      campaign: { label: "Campaign", focus: "Launches and reviews outbound work." },
      insights: { label: "Insights", focus: "Summarizes performance signals." },
    };
  },
  autoCategorizeSegments: () =>
    crmActionFetch<{ auto_categorized: number; total_segments: number; message: string }>(`/api/segments/auto-categorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }),
  runCopilot: (payload: { goal: string }) =>
    crmActionFetch(`/ai/copilot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  getDigitalTwin: (customerId: number) =>
    crmFetch(`/ai/digital-twin/${customerId}`),
  simulateCampaign: (payload: { segment_id?: number; channel?: string }) =>
    crmActionFetch(`/ai/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  analyzeCampaign: (campaignId: number) =>
    crmActionFetch(`/ai/analyze_campaign/${campaignId}`, { method: "POST" }),
  autonomousAgent: (payload: { goal: string }) =>
    crmActionFetch(`/ai/autonomous`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
};
