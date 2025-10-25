// Frontend helper functions to call API routes
import type {
  NetworkType,
  ApiResponse,
  DatabaseIntent,
  IntentWithRelations,
  TransactionData,
  UserStats,
} from "@/types";

const API_BASE = "/api";

export class ApiClient {
  private static async request<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`);

    if (!response.ok) {
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data: ApiResponse<T> = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data.data;
  }

  // Intent endpoints
  static async getIntents(
    network: NetworkType,
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string
  ): Promise<{ intents: DatabaseIntent[]; pagination: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (status && status !== "all") {
      params.append("status", status);
    }

    if (search) {
      params.append("search", search);
    }

    const response = await fetch(`${API_BASE}/${network}/intents?${params}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch intents: ${response.status}`);
    }

    const data: ApiResponse<DatabaseIntent[]> = await response.json();

    return {
      intents: data.data,
      pagination: data.pagination,
    };
  }

  static async getIntent(
    network: NetworkType,
    intentId: number
  ): Promise<IntentWithRelations> {
    return this.request<IntentWithRelations>(`/${network}/intents/${intentId}`);
  }

  static async getTransactions(
    network: NetworkType,
    intentId: number
  ): Promise<TransactionData> {
    return this.request<TransactionData>(
      `/${network}/transactions/${intentId}`
    );
  }

  static async getUser(
    network: NetworkType,
    address: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ stats: UserStats; intents: DatabaseIntent[]; pagination: any }> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await fetch(
      `${API_BASE}/${network}/users/${address}?${params}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch user data: ${response.status}`);
    }

    const data: ApiResponse<{ stats: UserStats; intents: DatabaseIntent[] }> =
      await response.json();

    return {
      stats: data.data.stats,
      intents: data.data.intents,
      pagination: data.pagination,
    };
  }

  static async getNetworkStats(network: NetworkType): Promise<any> {
    return this.request<any>(`/${network}/stats`);
  }
}
