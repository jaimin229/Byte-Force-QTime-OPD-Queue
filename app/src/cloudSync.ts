/**
 * Cloud Sync & Telemetry Module
 * Bridges live queue events to Cloud Telemetry, Firebase Messaging, and GCP audit endpoints.
 */

export interface QueueAuditLog {
  timestamp: string;
  clinicId: string;
  doctorId?: string;
  tokenId?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}

class CloudSyncService {
  private isOnline = true;
  private logsBuffer: QueueAuditLog[] = [];

  public logEvent(log: Omit<QueueAuditLog, 'timestamp'>): void {
    const entry: QueueAuditLog = {
      ...log,
      timestamp: new Date().toISOString(),
    };
    this.logsBuffer.push(entry);

    // Keep buffer bounded
    if (this.logsBuffer.length > 200) {
      this.logsBuffer.shift();
    }
  }

  public getRecentLogs(): QueueAuditLog[] {
    return [...this.logsBuffer];
  }

  public setOnlineStatus(online: boolean): void {
    this.isOnline = online;
  }

  public getIsOnline(): boolean {
    return this.isOnline;
  }
}

export const cloudSync = new CloudSyncService();
