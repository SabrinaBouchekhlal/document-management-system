FROM maven:3.9.6-eclipse-temurin-17 AS builder

WORKDIR /build

COPY . .

RUN mvn -pl shared,gateway -am clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

RUN addgroup -S docvault && adduser -S docvault -G docvault

COPY --from=builder /build/gateway/target/*.jar app.jar

RUN chown docvault:docvault app.jar

USER docvault

EXPOSE 8080

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -Djava.security.egd=file:/dev/./urandom"

ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]