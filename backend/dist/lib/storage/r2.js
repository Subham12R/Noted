"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
exports.deleteFile = deleteFile;
exports.getPresignedUrl = getPresignedUrl;
exports.isR2Configured = isR2Configured;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
function getR2Client() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey)
        throw new Error("R2 credentials not configured");
    return new client_s3_1.S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
    });
}
function getBucketName() {
    const bucket = process.env.R2_BUCKET_NAME;
    if (!bucket)
        throw new Error("R2_BUCKET_NAME is not set");
    return bucket;
}
function getPublicUrl(key) {
    const base = process.env.R2_PUBLIC_URL;
    if (!base)
        throw new Error("R2_PUBLIC_URL is not set");
    return `${base.replace(/\/$/, "")}/${key}`;
}
async function uploadFile(key, buffer, mimeType) {
    const client = getR2Client();
    await client.send(new client_s3_1.PutObjectCommand({ Bucket: getBucketName(), Key: key, Body: buffer, ContentType: mimeType }));
    return getPublicUrl(key);
}
async function deleteFile(key) {
    const client = getR2Client();
    await client.send(new client_s3_1.DeleteObjectCommand({ Bucket: getBucketName(), Key: key }));
}
async function getPresignedUrl(key, expiresIn = 3600) {
    const client = getR2Client();
    return (0, s3_request_presigner_1.getSignedUrl)(client, new client_s3_1.GetObjectCommand({ Bucket: getBucketName(), Key: key }), { expiresIn });
}
function isR2Configured() {
    return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME && process.env.R2_PUBLIC_URL);
}
//# sourceMappingURL=r2.js.map