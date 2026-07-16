package com.docvault.documents.config;

import com.docvault.documents.entity.CategoryEntity;
import com.docvault.documents.entity.DepartmentEntity;
import com.docvault.documents.repository.CategoryRepository;
import com.docvault.documents.repository.DepartmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class DataSeeder {

    private final DepartmentRepository deptRepo;
    private final CategoryRepository   catRepo;

    @Bean
    public CommandLineRunner seedData() {
        return args -> {
            // Seed departments
            if (deptRepo.count() == 0) {
                deptRepo.save(DepartmentEntity.builder()
                    .name("Engineering").description("Software development team").memberCount(0).build());
                deptRepo.save(DepartmentEntity.builder()
                    .name("Marketing").description("Brand and communications").memberCount(0).build());
                deptRepo.save(DepartmentEntity.builder()
                    .name("Finance").description("Accounting and financial planning").memberCount(0).build());
                deptRepo.save(DepartmentEntity.builder()
                    .name("HR").description("Human resources and recruitment").memberCount(0).build());
                log.info("Seeded 4 departments");
            }

            // Seed categories
            if (catRepo.count() == 0) {
                catRepo.save(CategoryEntity.builder()
                    .name("Policies").color("#6366f1").icon("Shield").docCount(0).build());
                catRepo.save(CategoryEntity.builder()
                    .name("Technical").color("#14b8a6").icon("Code").docCount(0).build());
                catRepo.save(CategoryEntity.builder()
                    .name("Finance").color("#f59e0b").icon("DollarSign").docCount(0).build());
                catRepo.save(CategoryEntity.builder()
                    .name("HR").color("#ec4899").icon("Users").docCount(0).build());
                log.info("Seeded 4 categories");
            }
        };
    }
}
