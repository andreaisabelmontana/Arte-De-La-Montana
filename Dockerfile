# --- Build stage ---
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace

# Cache dependencies first
COPY java/pom.xml ./pom.xml
RUN mvn -B -q dependency:go-offline

# Build the JAR
COPY java/src ./src
RUN mvn -B -q -DskipTests package

# --- Runtime stage ---
FROM eclipse-temurin:17-jre
WORKDIR /app

# Bundle the artwork assets into the image (union of both folders)
COPY assets/ /app/assets/
COPY ["assets(2)/", "/app/assets/"]

# Bundle the built Spring Boot fat-jar
COPY --from=build /workspace/target/*.jar /app/app.jar

ENV ASSETS_DIR=/app/assets
# Cloud Run sets $PORT (8080 by default).
EXPOSE 8080

ENTRYPOINT ["java","-jar","/app/app.jar"]
