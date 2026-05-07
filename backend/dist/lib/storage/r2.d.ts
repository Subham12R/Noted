export declare function uploadFile(key: string, buffer: Buffer, mimeType: string): Promise<string>;
export declare function deleteFile(key: string): Promise<void>;
export declare function getPresignedUrl(key: string, expiresIn?: number): Promise<string>;
export declare function isR2Configured(): boolean;
//# sourceMappingURL=r2.d.ts.map