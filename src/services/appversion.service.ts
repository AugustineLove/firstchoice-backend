import { prisma } from '../config/prisma';

export type UpdateStatus = 'none' | 'optional' | 'force';
export type AppPlatform = 'android' | 'ios';

export interface VersionCheckResult {
  status: UpdateStatus;
  latestVersion: string | null;
  storeUrl: string | null;
  message: string | null;
}

// "1.0.1+11" -> [1, 0, 1]  (build number is ignored)
function parseVersion(v: string): number[] {
  return v
    .split('+')[0]
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
}

// <0 if a < b, 0 if equal, >0 if a > b
function compareVersions(a: string, b: string): number {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (let i = 0; i < 3; i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export async function checkAppVersion(
  platform: AppPlatform,
  currentVersion: string
): Promise<VersionCheckResult> {
  const s = await prisma.settings.findUnique({ where: { id: 1 } });

  const latest = (platform === 'ios' ? s?.iosLatestVersion : s?.androidLatestVersion) ?? null;
  const min = (platform === 'ios' ? s?.iosMinVersion : s?.androidMinVersion) ?? null;
  const storeUrl = (platform === 'ios' ? s?.iosStoreUrl : s?.androidStoreUrl) ?? null;

  let status: UpdateStatus = 'none';

  // No store URL (e.g. iOS not live yet) = never prompt
  if (latest && storeUrl) {
    if (min && compareVersions(currentVersion, min) < 0) status = 'force';
    else if (compareVersions(currentVersion, latest) < 0) status = 'optional';
  }

  return {
    status,
    latestVersion: latest,
    storeUrl,
    message: s?.updateMessage ?? null,
  };
}