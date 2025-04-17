import os
import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile
from datetime import datetime
from config import settings




class S3Storage:
    def __init__(self):
        self.client = boto3.client(
            's3',
            endpoint_url=settings.S3_ENDPOINT,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION
        )
        self.bucket_name = settings.S3_BUCKET

    async def upload_file(self, file: UploadFile, user_id: int, video_id: int) -> str:
        try:
            filename = f"video_{datetime.now().timestamp()}_{file.filename}"
            s3_path = f"videos/{user_id}/{video_id}/original/{filename}"
            
            # Upload to S3
            self.client.upload_fileobj(
                file.file,
                self.bucket_name,
                s3_path,
                ExtraArgs={'ContentType': file.content_type}
            )
            
            return f"{settings.S3_ENDPOINT}/{self.bucket_name}/{s3_path}"
        except ClientError as e:
            print(f"S3 upload error: {e}")
            raise