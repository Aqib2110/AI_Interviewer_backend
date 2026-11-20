import { S3Client } from "@aws-sdk/client-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CreateMultipartUploadCommand, CompleteMultipartUploadCommand,ListPartsCommand,HeadObjectCommand } from "@aws-sdk/client-s3";
import { UploadPartCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
import { AppError } from "../Errors/App.error.js";

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
    Key: key,
    ContentType: "video/webm"
  })
);

if (!UploadId) {
    throw new Error("Failed to initialize multipart upload");
  }

  console.log("Multipart upload initialized:", {
    bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    uploadId: UploadId,
  });


return UploadId;
}

export const uploadPart = async (key: string, uploadId: string, startPart=1,count=1) => {
const urls = [];

for (let i = 0; i < count; i++) {
  const partNumber = startPart + i;

  const command = new UploadPartCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
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

export const getNextRecordingPartUrls = async (
  key: string,
  uploadId: string,
  count = 20
) => {
  const uploadedParts: number[] = [];
  let partNumberMarker: string | undefined;

  let isTruncated = true;

  while (isTruncated) {
    const result = await s3Client.send(
      new ListPartsCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        UploadId: uploadId,
        PartNumberMarker: partNumberMarker,
      })
    );

    uploadedParts.push(
      ...(result.Parts ?? []).map((part) => part.PartNumber!)
    );

    isTruncated = result.IsTruncated ?? false;
    partNumberMarker = result.NextPartNumberMarker?.toString();
  }

  const uploadedNumbers = new Set(uploadedParts);

  let startPart = 1;

  while (uploadedNumbers.has(startPart)) {
    startPart++;
  }

  if (startPart + count - 1 > 10000) {
    throw new AppError("Maximum multipart upload parts reached", 400);
  }

  const urls = await Promise.all(
    Array.from({ length: count }, async (_, index) => {
      const partNumber = startPart + index;

      const url = await getSignedUrl(
        s3Client,
        new UploadPartCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: key,
          UploadId: uploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: 900 }
      );

      return {
        partNumber,
        url,
      };
    })
  );

  return {
    startPart,
    count: urls.length,
    urls,
  };
};


export const multiPartCompleted = async (
  key: string,
  uploadId: string
) => {
  const Bucket = process.env.R2_BUCKET_NAME!;

  try {
    await s3Client.send(
      new HeadObjectCommand({
        Bucket,
        Key: key,
      })
    );

    return {
      key: key,
      alreadyCompleted: true,
    };
  } catch (error: any) {
    if (error.$metadata?.httpStatusCode !== 404) {
      throw error;
    }
  }

  const response = await s3Client.send(
    new ListPartsCommand({
      Bucket,
      Key: key,
      UploadId: uploadId,
    })
  );

  const parts = (response.Parts ?? [])
    .filter((part) => part.PartNumber && part.ETag)
    .map((part) => ({
      PartNumber: part.PartNumber!,
      ETag: part.ETag!,
    }))
    .sort((a, b) => a.PartNumber - b.PartNumber);

  if (!parts.length) {
    throw new Error("No recording parts found");
  }

  await s3Client.send(
    new CompleteMultipartUploadCommand({
      Bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts,
      },
    })
  );

  return {
    key: key,
    alreadyCompleted: false,
  };
};