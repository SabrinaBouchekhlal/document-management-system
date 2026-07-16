#!/bin/bash
set -e
echo "Initializing LocalStack S3..."

until curl -s http://localhost:4566/_localstack/health | grep -q '"s3"'; do
  echo "Waiting for S3..."; sleep 2
done

awslocal s3 mb s3://docvault-files --region us-east-1 || true

awslocal s3api put-bucket-versioning \
  --bucket docvault-files \
  --versioning-configuration Status=Enabled

awslocal s3api put-bucket-cors \
  --bucket docvault-files \
  --cors-configuration '{
    "CORSRules": [{
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET","PUT","POST","DELETE","HEAD"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3600
    }]
  }'

echo "S3 bucket docvault-files ready."
