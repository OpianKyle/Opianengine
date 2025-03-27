declare module 'express-fileupload' {
  import { Request, Response, NextFunction } from 'express';

  namespace fileUpload {
    interface FileUploadOptions {
      createParentPath?: boolean;
      uriDecodeFileNames?: boolean;
      safeFileNames?: boolean;
      preserveExtension?: boolean | number;
      abortOnLimit?: boolean;
      responseOnLimit?: string;
      limitHandler?: (req: Request, res: Response, next: NextFunction) => void;
      useTempFiles?: boolean;
      tempFileDir?: string;
      parseNested?: boolean;
      debug?: boolean;
      uploadTimeout?: number;
    }

    interface UploadedFile {
      name: string;
      encoding: string;
      mimetype: string;
      data: Buffer;
      tempFilePath: string;
      truncated: boolean;
      size: number;
      md5: string;
      mv(path: string, callback: (err: any) => void): void;
      mv(path: string): Promise<void>;
    }
  }

  function fileUpload(options?: fileUpload.FileUploadOptions): (req: Request, res: Response, next: NextFunction) => void;
  
  export = fileUpload;
}