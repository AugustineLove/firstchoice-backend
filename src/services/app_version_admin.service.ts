import { prisma } from '../config/prisma';

const VERSION_RE = /^\d+(\.\d+){0,2}$/; // "2", "2.0", "2.0.1"

export interface AppVersionSettingsInput {
  androidLatestVersion?: string | null;
  androidMinVersion?: string | null;
  androidStoreUrl?: string | null;
  iosLatestVersion?: string | null;
  iosMinVersion?: string | null;
  iosStoreUrl?: string | null;
  updateMessage?: string | null;
}

const FIELDS = [
  'androidLatestVersion', 'androidMinVersion', 'androidStoreUrl',
  'iosLatestVersion', 'iosMinVersion', 'iosStoreUrl', 'updateMessage',
] as const;

const select = Object.fromEntries(FIELDS.map((f) => [f, true])) as Record<(typeof FIELDS)[number], true>;

const clean = (v: unknown) => {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
};

const cmp = (a: string, b: string) => {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (x[i] || 0) - (y[i] || 0);
    if (d) return d;
  }
  return 0;
};

export async function getAppVersionSettings() {
  const s = await prisma.settings.findUnique({ where: { id: 1 }, select });
  return s ?? Object.fromEntries(FIELDS.map((f) => [f, null]));
}

export async function updateAppVersionSettings(input: AppVersionSettingsInput) {
  const data: Record<string, string | null> = {};
  for (const f of FIELDS) data[f] = clean(input[f]);

  for (const p of ['android', 'ios'] as const) {
    const latest = data[`${p}LatestVersion`];
    const min = data[`${p}MinVersion`];
    const url = data[`${p}StoreUrl`];

    for (const [label, v] of [['latest', latest], ['minimum', min]] as const) {
      if (v && !VERSION_RE.test(v)) {
        throw new Error(`${p}: ${label} version must look like 1.0.2`);
      }
    }
    if (url && !/^https?:\/\//i.test(url)) throw new Error(`${p}: store link must start with https://`);
    if (min && latest && cmp(min, latest) > 0) {
      throw new Error(`${p}: minimum version can't be higher than the latest version`);
    }
    if (min && !latest) throw new Error(`${p}: set a latest version too`);
  }

  return prisma.settings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
    select,
  });
}