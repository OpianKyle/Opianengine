declare module 'html-pdf' {
  interface CreateOptions {
    type?: string;
    quality?: string | number;
    format?: string;
    orientation?: 'portrait' | 'landscape';
    border?: string | {
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
    base?: string;
    zoomFactor?: string | number;
    phantomPath?: string;
    phantomArgs?: string[];
    script?: string;
    timeout?: number;
    renderDelay?: number;
  }

  interface CreateResult {
    toFile(
      filename: string,
      callback: (err: Error | null, res?: object) => void
    ): void;
    toBuffer(
      callback: (err: Error | null, buffer?: Buffer) => void
    ): void;
    toStream(callback: (err: Error | null, stream?: NodeJS.ReadableStream) => void): void;
  }

  function create(html: string, options?: CreateOptions): CreateResult;

  const pdf: {
    create: typeof create;
  };

  export = pdf;
}