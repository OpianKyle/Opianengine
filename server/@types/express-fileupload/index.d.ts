declare module 'express-fileupload' {
  import { NextFunction, Request, Response } from 'express';
  
  namespace fileUpload {
    interface FileUploadOptions {
      createParentPath?: boolean;
      limits?: {
        fileSize?: number;
      };
    }
    
    interface UploadedFile {
      name: string;
      mv(path: string, callback: (err?: any) => void): void;
      mv(path: string): Promise<void>;
      encoding: string;
      mimetype: string;
      data: Buffer;
      tempFilePath: string;
      truncated: boolean;
      size: number;
      md5: string;
    }
  }
  
  function fileUpload(options?: fileUpload.FileUploadOptions): (req: Request, res: Response, next: NextFunction) => void;
  
  export = fileUpload;
}