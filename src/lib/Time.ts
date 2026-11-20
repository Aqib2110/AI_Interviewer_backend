
export const interviewRemainingTime = (candidateInterview: any) => {
  const INTERVIEW_DURATION_MS =
    candidateInterview.durationMinutes * 60 * 1000;

  const now = Temporal.Now.instant();

  let remainingMs = INTERVIEW_DURATION_MS;

  if (candidateInterview?.startedAt) {
    const startedAt = Temporal.Instant.from(
      candidateInterview.startedAt
    );

    const elapsedMs =
      now.epochMilliseconds - startedAt.epochMilliseconds;

    remainingMs = Math.max(
      0,
      INTERVIEW_DURATION_MS - elapsedMs
    );
  }

  if (remainingMs === 0) {
    throw new Error("Interview time has expired.");
  }

  return remainingMs;
};
