import * as cron from "node-cron";
import { r2Storage } from "../storage/r2StorageService.js";

class ImportCleanupService {
  private cleanupTask: cron.ScheduledTask | null = null;

  constructor() {}

  /**
   * Initialize the cleanup cron job.
   * Runs daily at 2 AM UTC to clean up orphaned import files.
   */
  initializeCleanupCron() {
    console.info("[ImportCleanup] Initializing cleanup cron");

    // Schedule cleanup to run daily at 2 AM UTC
    this.cleanupTask = cron.schedule(
      "0 2 * * *",
      async () => {
        try {
          await this.cleanupOrphanedFiles();
        } catch (error) {
          console.error("[ImportCleanup] Error during cleanup:", error);
        }
      },
      { timezone: "UTC" }
    );

    console.info("[ImportCleanup] Cleanup initialized (runs daily at 2 AM UTC)");
  }

  /**
   * Clean up orphaned R2 import files that are more than 1 day old.
   */
  private async cleanupOrphanedFiles() {
    if (r2Storage.isEnabled()) {
      console.info("[ImportCleanup] Starting cleanup of old R2 import files");
      try {
        const r2DeletedCount = await r2Storage.deleteOldImportFiles(1);
        console.info(`[ImportCleanup] Deleted ${r2DeletedCount} old files from R2`);
      } catch (error) {
        console.error("[ImportCleanup] Error cleaning up R2 files:", error);
      }
    }
  }

  async triggerManualCleanup() {
    console.info("[ImportCleanup] Manual cleanup triggered");
    await this.cleanupOrphanedFiles();
  }

  stopCleanupCron() {
    if (this.cleanupTask) {
      this.cleanupTask.stop();
      console.info("[ImportCleanup] Cleanup cron stopped");
    }
  }
}

// Export singleton instance
export const importCleanupService = new ImportCleanupService();
