import type {
  Profile, Customer, Factory, ProductTypeRecord, ProductStyle,
  InspectionRecord, DebitNote, DebitNoteItem,
  FactoryPrice, Workspace,
} from './database.types';

const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.details || body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  auth: {
    login: (email: string, password: string) =>
      request<{ token: string; profile: Profile }>(`/auth/login`, { method: 'POST', body: JSON.stringify({ email, password }) }),
    register: (data: { email: string; password: string; nameVn: string; nameJp?: string; role?: string; factoryId?: string }) =>
      request<{ token: string; profile: Profile }>(`/auth/register`, { method: 'POST', body: JSON.stringify(data) }),
    me: () => request<Profile>(`/auth/me`),
  },

  // Profiles
  profiles: {
    list: () => request<Profile[]>(`/profiles`),
  },

  // Customers
  customers: {
    list: () => request<Customer[]>(`/customers`),
    getById: (id: string) => request<Customer>(`/customers/${id}`),
    create: (data: Partial<Customer>) => request<Customer>(`/customers`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Customer>) => request<Customer>(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Factories
  factories: {
    list: () => request<Factory[]>(`/factories`),
    getById: (id: string) => request<Factory>(`/factories/${id}`),
    create: (data: Partial<Factory>) => request<Factory>(`/factories`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Factory>) => request<Factory>(`/factories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Product Types
  productTypes: {
    list: () => request<ProductTypeRecord[]>(`/product-types`),
    create: (data: Partial<ProductTypeRecord>) => request<ProductTypeRecord>(`/product-types`, { method: 'POST', body: JSON.stringify(data) }),
  },

  // Product Styles
  productStyles: {
    list: () => request<ProductStyle[]>(`/product-styles`),
    create: (data: Partial<ProductStyle>) => request<ProductStyle>(`/product-styles`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<ProductStyle>) => request<ProductStyle>(`/product-styles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },

  // Dashboard
  dashboard: {
    stats: () => request<{ totalCustomers: number; totalFactories: number }>(`/dashboard/stats`),
  },

  // Inspection Records
  inspectionRecords: {
    list: () => request<InspectionRecord[]>(`/inspection-records`),
    getById: (id: string) => request<InspectionRecord>(`/inspection-records/${id}`),
    create: (data: Partial<InspectionRecord>) => request<InspectionRecord>(`/inspection-records`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<InspectionRecord>) => request<InspectionRecord>(`/inspection-records/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/inspection-records/${id}`, { method: 'DELETE' }),
    deleteAll: () => request<{ success: boolean; message: string }>(`/inspection-records/all`, { method: 'DELETE' }),
  },

  // Debit Notes
  debitNotes: {
    list: () => request<DebitNote[]>(`/debit-notes`),
    getById: (id: string) => request<DebitNote>(`/debit-notes/${id}`),
    create: (data: Partial<DebitNote>) => request<DebitNote>(`/debit-notes`, { method: 'POST', body: JSON.stringify(data) }),
  },

  // Factory Prices
  factoryPrices: {
    list: () => request<FactoryPrice[]>(`/factory-prices`),
    getByFactory: (factoryId: string, date: string) => request<FactoryPrice | null>(`/factory-prices/${factoryId}?date=${date}`),
    create: (data: { factoryId: string; unitPrice: number; currency?: string; effectiveDate: string }) =>
      request<FactoryPrice>(`/factory-prices`, { method: 'POST', body: JSON.stringify(data) }),
  },

  // Workspaces
  workspaces: {
    list: () => request<Workspace[]>('/workspaces'),
    create: (data: { name: string; managerEmail: string; managerPassword: string }) =>
      request<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Workspace>) =>
      request<Workspace>(`/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/workspaces/${id}`, { method: 'DELETE' }),
  },

  // Admin
  admin: {
    users: {
      list: () => request<Profile[]>('/admin/users'),
      create: (data: { email: string; password: string; role: string; workspaceId?: string }) =>
        request<Profile>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<Profile>) =>
        request<Profile>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
      delete: (id: string) => request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
    },
  },

  // Impersonate
  impersonate: {
    enter: (workspaceId: string) =>
      request<{ workspace: Workspace; token: string }>(`/impersonate/${workspaceId}`, { method: 'POST' }),
    exit: () =>
      request<{ token: string }>('/impersonate/exit', { method: 'POST' }),
  },

  // Chat
  chat: {
    messages: {
      list: (query?: string) => {
        const queryString = query || '';
        return request<any[]>(`/chat/messages${queryString}`);
      },
      send: (data: { message?: string; workspaceId?: string; fileUrl?: string; fileName?: string; fileType?: string }) => {
        return request<any>('/chat/messages', { method: 'POST', body: JSON.stringify(data) });
      },
    },
    upload: async (file: File) => {
      const token = getToken();
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${BASE}/chat/upload`, {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.details || body.error || `Upload failed: ${res.status}`);
      }

      return res.json();
    },
  },
};
