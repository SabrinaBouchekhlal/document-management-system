package com.docvault.documents.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.*;
import software.amazon.awssdk.services.s3.S3Configuration;

import jakarta.annotation.PostConstruct;

import java.net.URI;
import java.time.Duration;
import java.util.UUID;

@Service
@Slf4j
public class S3Service {

    @Value("${aws.s3.bucket}")
    private String bucket;

    @Value("${aws.s3.region}")
    private String region;

    @Value("${aws.s3.endpoint}")
    private String endpoint;

    @Value("${aws.s3.access-key}")
    private String accessKey;

    @Value("${aws.s3.secret-key}")
    private String secretKey;

    @Value("${aws.s3.presigned-url-expiry-minutes:60}")
    private int expiryMinutes;

    private S3Client s3Client;
    private S3Presigner presigner;

    @PostConstruct
    public void init() {

        var creds = StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)
        );

        var ep  = URI.create(endpoint);
        var reg = Region.of(region);

        // =========================
        // S3 CLIENT
        // =========================
        s3Client = S3Client.builder()
                .endpointOverride(ep)
                .credentialsProvider(creds)
                .region(reg)
                .forcePathStyle(true)
                .build();

        // =========================
        // PRESIGNER (FIXED)
        // =========================
        presigner = S3Presigner.builder()
                .endpointOverride(ep)
                .credentialsProvider(creds)
                .region(reg)
                .serviceConfiguration(
                        S3Configuration.builder()
                                .pathStyleAccessEnabled(true)
                                .build()
                )
                .build();

        ensureBucketExists();
    }

    private void ensureBucketExists() {
        try {
            s3Client.headBucket(HeadBucketRequest.builder()
                    .bucket(bucket)
                    .build());

            log.info("S3 bucket '{}' ready", bucket);

        } catch (NoSuchBucketException e) {

            s3Client.createBucket(CreateBucketRequest.builder()
                    .bucket(bucket)
                    .build());

            log.info("Created S3 bucket '{}'", bucket);

        } catch (Exception e) {
            log.warn("Cannot verify S3 bucket: {}", e.getMessage());
        }
    }

    // =========================================================
    // UPLOAD URL (FIXED: browser-safe host rewrite)
    // =========================================================
    public PresignedUpload generateUploadUrl(
            String documentId,
            String fileName,
            String contentType
    ) {

        String key = "documents/" + documentId + "/"
                + UUID.randomUUID() + "-" + fileName;

        String url = presigner.presignPutObject(
                PutObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofMinutes(expiryMinutes))
                        .putObjectRequest(r -> r
                                .bucket(bucket)
                                .key(key)
                                .contentType(contentType)
                        )
                        .build()
        ).url().toString();

        // IMPORTANT: fix Docker hostname → browser localhost
        url = url.replace("localstack:4566", "localhost:4566")
                 .replace("docvault-files.localstack:4566", "localhost:4566");

        return new PresignedUpload(key, url);
    }

    // =========================================================
    // DOWNLOAD URL (FIXED)
    // =========================================================
    public String generateDownloadUrl(String s3Key) {

        String url = presigner.presignGetObject(
                GetObjectPresignRequest.builder()
                        .signatureDuration(Duration.ofMinutes(expiryMinutes))
                        .getObjectRequest(r -> r
                                .bucket(bucket)
                                .key(s3Key)
                        )
                        .build()
        ).url().toString();

        // IMPORTANT: fix Docker hostname → browser localhost
        url = url.replace("localstack:4566", "localhost:4566")
                 .replace("docvault-files.localstack:4566", "localhost:4566");

        return url;
    }

    public void deleteFile(String s3Key) {
        try {
            s3Client.deleteObject(DeleteObjectRequest.builder()
                    .bucket(bucket)
                    .key(s3Key)
                    .build());

        } catch (Exception e) {
            log.error("Failed to delete S3 object {}: {}", s3Key, e.getMessage());
        }
    }

    public record PresignedUpload(String s3Key, String uploadUrl) {}
}