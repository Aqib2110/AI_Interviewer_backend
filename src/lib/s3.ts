import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CreateMultipartUploadCommand, CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';

dotenv.config();

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
    Key: `${fileName}`,
    Body: fileBuffer,
    ContentType: mimeType,
  }),
)

}

export const getFileFromS3 = async (key: string)=>{
  console.log(key,process.env.R2_BUCKET_NAME,"key_bicket")
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
	new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME,  Key: key, }),
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

export const uploadPart = async (key: string, uploadId: string, startPart=1,count=1) => {
const urls = [];

for (let i = 0; i < count; i++) {
  const partNumber = startPart + i;

  const command = new UploadPartCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: `interviews/${key}/recording.webm`,
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


export const multiPartCompleted = async (key:string, uploadId:string, parts:{partNumber:number,etag:string}[])=>{
 return await s3Client.send(
  new CompleteMultipartUploadCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: `interviews/${key}/recording.webm`,
    UploadId: uploadId,
    MultipartUpload: {
      Parts: parts.map(part => ({
        PartNumber: part.partNumber,
        ETag: part.etag,
      })),
    },
  })
);
}