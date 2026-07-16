package com.docvault.documents;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.docvault.documents", "com.docvault.shared"})
public class DocumentsApplication {
    public static void main(String[] args) {
        SpringApplication.run(DocumentsApplication.class, args);
    }
}
