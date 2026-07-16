package com.docvault.esb;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = {"com.docvault.esb", "com.docvault.shared"})
public class EsbApplication {
    public static void main(String[] args) {
        SpringApplication.run(EsbApplication.class, args);
    }
}
