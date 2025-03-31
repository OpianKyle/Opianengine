declare module 'html-pdf' {
  interface PDFOptions {
    format?: string;
    orientation?: 'portrait' | 'landscape';
    border?: {
      top?: string;
      right?: string;
      bottom?: string;
      left?: string;
    };
    header?: {
      height?: string;
      contents?: string;
    };
    footer?: {
      height?: string;
      contents?: string;
    };
    type?: string;
    quality?: string;
    timeout?: number;
    phantomPath?: string;
    phantomArgs?: string[];
    script?: string;
    zoomFactor?: string;
    base?: string;
    renderDelay?: number;
  }

  interface PDF {
    toFile(
      filename: string,
      callback: (error: Error | null, result?: any) => void
    ): void;
    toBuffer(callback: (error: Error | null, buffer?: Buffer) => void): void;
    toStream(callback: (error: Error | null, stream?: NodeJS.ReadableStream) => void): void;
  }

  function create(html: string, options?: PDFOptions): PDF;
}