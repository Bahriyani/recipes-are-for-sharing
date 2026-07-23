type StorageRemovalResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

export type StorageCleanupAssessment =
  | { confirmed: true }
  | { confirmed: false; reason: "storage_error" | "unconfirmed_empty_result" };

export function assessStorageCleanup(result: StorageRemovalResult): StorageCleanupAssessment {
  if (result.error) return { confirmed: false, reason: "storage_error" };
  if (!Array.isArray(result.data) || result.data.length === 0) {
    return { confirmed: false, reason: "unconfirmed_empty_result" };
  }
  return { confirmed: true };
}

export function warnIfStorageCleanupUnconfirmed(
  memoryId: string,
  stage: string,
  result: StorageRemovalResult,
) {
  const assessment = assessStorageCleanup(result);
  if (!assessment.confirmed) {
    console.warn("[recipe-memory/storage-cleanup] cleanup warning", {
      memoryId,
      stage,
      reason: assessment.reason,
    });
  }
  return assessment;
}
