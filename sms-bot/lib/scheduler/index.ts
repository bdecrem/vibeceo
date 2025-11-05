interface DailyJob {
  name: string;
  hour: number;
  minute: number;
  timezone?: string;
  run: () => Promise<void> | void;
  onError?: (error: unknown) => void;
}

interface InternalDailyJob extends DailyJob {
  timezone: string;
  lastRunDateKey?: string;
}

const jobs: InternalDailyJob[] = [];
const DEFAULT_TIMEZONE = 'America/Los_Angeles';
const DEFAULT_INTERVAL_MS = 60 * 1000;

let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let isChecking = false;

function getZonedDate(timezone: string): Date {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: timezone }));
}

function getDateKey(date: Date, timezone: string): string {
  return date.toLocaleDateString('en-CA', { timeZone: timezone });
}

async function checkJobs(): Promise<void> {
  if (isChecking) {
    return;
  }

  isChecking = true;

  try {
    for (const job of jobs) {
      const zonedNow = getZonedDate(job.timezone);
      const dateKey = getDateKey(zonedNow, job.timezone);

      if (
        zonedNow.getHours() === job.hour &&
        zonedNow.getMinutes() === job.minute &&
        job.lastRunDateKey !== dateKey
      ) {
        job.lastRunDateKey = dateKey;

        // Run job non-blocking - don't await so other jobs can run independently
        const result = job.run();
        if (result && typeof result.catch === 'function') {
          result.catch((error) => {
            if (job.onError) {
              job.onError(error);
            } else {
              console.error(`Scheduler job ${job.name} failed:`, error);
            }
          });
        }
      }
    }
  } finally {
    isChecking = false;
  }
}

export function registerDailyJob(job: DailyJob): void {
  const internalJob: InternalDailyJob = {
    ...job,
    timezone: job.timezone || DEFAULT_TIMEZONE,
  };

  jobs.push(internalJob);
}

export function startScheduler(intervalMs: number = DEFAULT_INTERVAL_MS): void {
  if (schedulerTimer) {
    return;
  }

  schedulerTimer = setInterval(() => {
    void checkJobs();
  }, intervalMs);

  console.log(
    `Scheduler started with ${jobs.length} daily job(s) at interval ${intervalMs}ms.`
  );
}

export function stopScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

export function listJobs(): ReadonlyArray<DailyJob> {
  return jobs.map(({ lastRunDateKey, ...job }) => job);
}
