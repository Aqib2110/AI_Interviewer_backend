import {
  ListMultipartUploadsCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { s3Client } from "./s3.js";
const bucket = process.env.R2_BUCKET_NAME!;

async function cleanupIncompleteUploads(dryRun = true) {
  let KeyMarker: string | undefined;
  let UploadIdMarker: string | undefined;
  let aborted = 0;

  do {
    const result = await s3Client.send(
      new ListMultipartUploadsCommand({
        Bucket: bucket,
        Prefix: "interviews/",
        KeyMarker,
        UploadIdMarker,
      })
    );

    for (const upload of result.Uploads ?? []) {
      if (!upload.Key || !upload.UploadId) continue;

      console.log({
        key: upload.Key,
        uploadId: upload.UploadId,
        initiated: upload.Initiated,
      });

      if (dryRun) continue;

      // Safety check: only target the recording key pattern.
      if (!/^interviews\/[^/]+\/recording\.webm$/.test(upload.Key)) {
        continue;
      }

      await s3Client.send(
        new AbortMultipartUploadCommand({
           Bucket: bucket,
          Key: upload.Key,
          UploadId: upload.UploadId,
        })
      );

      aborted++;
      console.log("Aborted:", upload.Key);
    }

    KeyMarker = result.IsTruncated
      ? result.NextKeyMarker
      : undefined;

    UploadIdMarker = result.IsTruncated
      ? result.NextUploadIdMarker
      : undefined;
  } while (KeyMarker);

  console.log(
    dryRun
      ? "Dry run complete. No uploads were deleted."
      : `Cleanup complete. Aborted ${aborted} uploads.`
  );
}

cleanupIncompleteUploads(false).catch(console.error);
