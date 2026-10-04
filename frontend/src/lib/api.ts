import {
  AuthTokens,
  User,
  Driver,
  DrivingSession,
  DetectionEvent,
  AlertItem,
  OverviewAnalytics,
  SafetyReport,
  Organization,
  Fleet,
  Vehicle,
  ModelRegistryItem,
  MLOpsHealth,
  PrivacySettings,
  CopilotResponse,
  ExtendedDetectionEvent
} from "@/types";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || (typeof window !== "undefined" ? "" : "http://127.0.0.1:8000");

class ApiClient {
  private getTokens(): { access_token: string | null; refresh_token: string | null } {
    if (typeof window === "undefined") return { access_token: null, refresh_token: null };
    return {
      access_token: localStorage.getItem("safedrive_access_token"),
      refresh_token: localStorage.getItem("safedrive_refresh_token"),
    };
  }

  public setTokens(tokens: AuthTokens) {
    if (typeof window === "undefined") return;
    localStorage.setItem("safedrive_access_token", tokens.access_token);
    localStorage.setItem("safedrive_refresh_token", tokens.refresh_token);
    localStorage.setItem("safedrive_user", JSON.stringify(tokens.user));
  }

  public clearTokens() {
    if (typeof window === "undefined") return;
    localStorage.removeItem("safedrive_access_token");
    localStorage.removeItem("safedrive_refresh_token");
    localStorage.removeItem("safedrive_user");
  }

  public getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    try {
      const str = localStorage.getItem("safedrive_user");
      if (!str || str === "undefined" || str === "null") return null;
      return JSON.parse(str);
    } catch {
      return null;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { access_token, refresh_token } = this.getTokens();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (access_token) {
      headers["Authorization"] = `Bearer ${access_token}`;
    }

    const url = endpoint.startsWith("http") ? endpoint : `${BASE_URL}${endpoint}`;

    try {
      let response = await fetch(url, { ...options, headers });

      // Handle token expiration: attempt automatic refresh
      if (response.status === 401 && refresh_token && !endpoint.includes("/auth/")) {
        try {
          const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token }),
          });
          if (refreshRes.ok) {
            const newTokens: AuthTokens = await refreshRes.json();
            this.setTokens(newTokens);
            headers["Authorization"] = `Bearer ${newTokens.access_token}`;
            response = await fetch(url, { ...options, headers });
          } else {
            this.clearTokens();
          }
        } catch {
          this.clearTokens();
        }
      }

      if (!response.ok) {
        let errMessage = `HTTP Error ${response.status}`;
        try {
          const errData = await response.json();
          errMessage = errData.detail || errMessage;
        } catch {}
        throw new Error(errMessage);
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || "Network communication failure.");
    }
  }

  // --- Auth ---
  async login(email: string, password: string): Promise<AuthTokens> {
    const res = await this.request<AuthTokens>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    this.setTokens(res);
    return res;
  }

  async register(data: { email: string; password: string; full_name: string; role?: string }): Promise<User> {
    return await this.request<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<void> {
    const { refresh_token } = this.getTokens();
    if (refresh_token) {
      try {
        await this.request("/api/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token }),
        });
      } catch {}
    }
    this.clearTokens();
  }

  async getMe(): Promise<User> {
    return await this.request<User>("/api/auth/me");
  }

  // --- Drivers ---
  async getDrivers(params?: { status?: string; search?: string }): Promise<Driver[]> {
    const query = new URLSearchParams(params as any).toString();
    return await this.request<Driver[]>(`/api/drivers${query ? `?${query}` : ""}`);
  }

  async getDriver(id: number): Promise<Driver> {
    return await this.request<Driver>(`/api/drivers/${id}`);
  }

  async createDriver(data: Partial<Driver>): Promise<Driver> {
    return await this.request<Driver>("/api/drivers", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateDriver(id: number, data: Partial<Driver>): Promise<Driver> {
    return await this.request<Driver>(`/api/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteDriver(id: number): Promise<void> {
    await this.request(`/api/drivers/${id}`, { method: "DELETE" });
  }

  async enrollFace(driverId: number, imageBase64: string, sampleIndex: number = 1): Promise<any> {
    return await this.request(`/api/drivers/${driverId}/enroll-face`, {
      method: "POST",
      body: JSON.stringify({ image_base64: imageBase64, sample_index: sampleIndex }),
    });
  }

  // --- Sessions ---
  async getSessions(params?: { driver_id?: number; status_filter?: string }): Promise<DrivingSession[]> {
    const query = new URLSearchParams(params as any).toString();
    return await this.request<DrivingSession[]>(`/api/sessions${query ? `?${query}` : ""}`);
  }

  async getSession(id: number): Promise<DrivingSession> {
    return await this.request<DrivingSession>(`/api/sessions/${id}`);
  }

  async createSession(data: { driver_id?: number; notes?: string }): Promise<DrivingSession> {
    return await this.request<DrivingSession>("/api/sessions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async stopSession(id: number, notes?: string): Promise<DrivingSession> {
    return await this.request<DrivingSession>(`/api/sessions/${id}/stop`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  }

  // --- Events ---
  async getEvents(params?: Record<string, any>): Promise<DetectionEvent[]> {
    const query = new URLSearchParams(params).toString();
    return await this.request<DetectionEvent[]>(`/api/events${query ? `?${query}` : ""}`);
  }

  // --- Alerts ---
  async getAlerts(params?: { unacknowledged_only?: boolean; session_id?: number; limit?: number; severity?: string }): Promise<AlertItem[]> {
    const query = new URLSearchParams(params as any).toString();
    return await this.request<AlertItem[]>(`/api/alerts${query ? `?${query}` : ""}`);
  }

  async acknowledgeAlert(alertId: number, notes?: string): Promise<AlertItem> {
    return await this.request<AlertItem>(`/api/alerts/${alertId}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ notes }),
    });
  }

  // --- Analytics ---
  async getAnalyticsOverview(): Promise<OverviewAnalytics> {
    return await this.request<OverviewAnalytics>("/api/analytics/overview");
  }

  // --- Reports ---
  async generateReport(sessionId: number): Promise<SafetyReport> {
    return await this.request<SafetyReport>("/api/reports/generate", {
      method: "POST",
      body: JSON.stringify({ session_id: sessionId }),
    });
  }

  async getReport(sessionId: number): Promise<SafetyReport> {
    return await this.request<SafetyReport>(`/api/reports/${sessionId}`);
  }

  getPdfUrl(sessionId: number): string {
    return `${BASE_URL}/api/reports/${sessionId}/pdf`;
  }

  // --- Settings & Admin ---
  async getSettings(): Promise<any[]> {
    return await this.request<any[]>("/api/admin/settings");
  }

  async updateSetting(key: string, value: any): Promise<any> {
    return await this.request(`/api/admin/settings/${key}`, {
      method: "PUT",
      body: JSON.stringify({ value }),
    });
  }

  async getAdminUsers(): Promise<User[]> {
    return await this.request<User[]>("/api/admin/users");
  }

  async updateUserRole(userId: number, role: string, isActive?: boolean): Promise<User> {
    return await this.request<User>(`/api/admin/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ role, is_active: isActive }),
    });
  }

  async getAuditLogs(params?: Record<string, any>): Promise<any[]> {
    const query = new URLSearchParams(params).toString();
    return await this.request<any[]>(`/api/audit-logs${query ? `?${query}` : ""}`);
  }

  // --- AI Safety Copilot ---
  async queryCopilot(query: string): Promise<CopilotResponse> {
    return await this.request<CopilotResponse>("/api/copilot/query", {
      method: "POST",
      body: JSON.stringify({ query }),
    });
  }

  // --- Fleet Intelligence ---
  async getFleetOverview(): Promise<any> {
    return await this.request<any>("/api/fleet/overview");
  }

  async getFleetVehicles(fleetId?: number): Promise<Vehicle[]> {
    const q = fleetId ? `?fleet_id=${fleetId}` : "";
    return await this.request<Vehicle[]>(`/api/fleet/vehicles${q}`);
  }

  async createVehicle(payload: Partial<Vehicle>): Promise<Vehicle> {
    return await this.request<Vehicle>("/api/fleet/vehicles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async getOrganizations(): Promise<Organization[]> {
    return await this.request<Organization[]>("/api/fleet/organizations");
  }

  // --- Privacy Center ---
  async getPrivacySettings(): Promise<PrivacySettings> {
    return await this.request<PrivacySettings>("/api/privacy/settings");
  }

  async updatePrivacySettings(settings: Partial<PrivacySettings>): Promise<PrivacySettings> {
    return await this.request<PrivacySettings>("/api/privacy/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    });
  }

  async updateDriverBiometricConsent(driverId: number, consent: boolean): Promise<any> {
    return await this.request(`/api/privacy/drivers/${driverId}/consent`, {
      method: "POST",
      body: JSON.stringify({ biometric_consent_given: consent }),
    });
  }

  async purgeDriverBiometrics(driverId: number, reason: string = "GDPR Article 17"): Promise<any> {
    return await this.request(`/api/privacy/drivers/${driverId}/purge`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  // --- MLOps & Model Registry ---
  async getMLOpsModels(): Promise<ModelRegistryItem[]> {
    return await this.request<ModelRegistryItem[]>("/api/mlops/models");
  }

  async getMLOpsHealth(): Promise<MLOpsHealth> {
    return await this.request<MLOpsHealth>("/api/mlops/health");
  }

  // --- Event Review & Evidence ---
  async reviewEvent(eventId: number, status: string, notes?: string): Promise<any> {
    return await this.request(`/api/events/${eventId}/review`, {
      method: "POST",
      body: JSON.stringify({ status, notes }),
    });
  }
}

export const api = new ApiClient();
