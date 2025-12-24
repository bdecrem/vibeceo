declare module 'youtube-transcript-plus' {
  export interface TranscriptItem {
    text: string;
    duration: number;
    offset: number;
    lang?: string;
  }

  export interface FetchTranscriptOptions {
    lang?: string;
    userAgent?: string;
  }

  export function fetchTranscript(
    videoIdOrUrl: string,
    options?: FetchTranscriptOptions
  ): Promise<TranscriptItem[]>;
}
