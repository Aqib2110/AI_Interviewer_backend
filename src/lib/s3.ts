import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { UploadPartCommand } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const uploadFileToS3 = async(fileName: String, fileBuffer: Buffer, mimeType: string)=>{
   return await s3Client.send(
  new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: `documents/${fileName}`,
    Body: fileBuffer,
    ContentType: mimeType,
  }),
)

}

export const getFileFromS3 = async (key: string)=>{
const result = await s3Client.send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    }),
  );

  return result;
}

export const getSignedUrlFromS3 = async (key: string)=>{
const url = await getSignedUrl(
	s3Client,
	new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME,  Key: `documents/${key}`, }),
	{ expiresIn: 3600 }, 
);

return url;
}

export const getSignedUrlToS3 = async (key: string)=>{
const url = await getSignedUrl(
	s3Client,
	new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: `documents/${key}`,
  }),
	{ expiresIn: 3600 }, 
);

return url;
}


export const createMultipartUpload = async (key: string) => {
const { UploadId } = await s3Client.send(
  new CreateMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: `interviews/${key}/recording.webm`,
    ContentType: "video/webm"
  })
);

return UploadId;
}

export const uploadPart = async (key: string, uploadId: string, partNumber: number, startPart=1,count=1) => {
const urls = [];

for (let i = 0; i < count; i++) {
  const partNumber = startPart + i;

  const command = new UploadPartCommand({
    Bucket: process.env.R2_BUCKET!,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 900,
  });

  urls.push({
    partNumber,
    url,
  });
}

return urls;
  
}